import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import { db } from './src/db';
import { messages, preMatchChats, preMatchMessages } from './src/db/schema';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';
import { isGroupMember, isPreMatchParticipant } from './src/lib/authz';
import { mlEndpoint } from './src/services/ml';
import { getToken } from 'next-auth/jwt';

dotenv.config({ path: '.env.local' });

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

let isNextReady = false;

const httpServer = createServer(async (req, res) => {
  // 1. Instant health check for Render
  if (req.url === '/healthz' || req.url === '/health') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end('OK');
    return;
  }

  // 2. Wait for Next.js to boot
  if (!isNextReady) {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Server is booting up, please wait...');
    return;
  }
  
  try {
    const parsedUrl = parse(req.url!, true);
    await handle(req, res, parsedUrl);
  } catch (err) {
    console.error('Error in request handler', err);
    res.statusCode = 500;
    res.end('Internal server error');
  }
});

const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

io.use((socket, next) => {
  try {
    const userId = socket.handshake.auth?.userId;
    if (userId) {
      socket.data.userId = userId;
      next();
    } else {
      next(new Error('Unauthorized: No userId provided in handshake'));
    }
  } catch (err) {
    console.error('Socket auth error:', err);
    next(new Error('Authentication error'));
  }
});

const activeLocationSessions = new Map<string, number>();

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id, 'User:', socket.data.userId);

  // ─── GROUP CHAT & REALTIME LOCATION ─────────────────────────────────────

  socket.on('join_group', async ({ groupId }) => {
    const userId = socket.data.userId;
    if (!groupId || !userId || !(await isGroupMember(userId, groupId))) {
      socket.emit('error', 'Not authorized for this group');
      return;
    }

    socket.join(`group_${groupId}`);
    console.log(`Socket ${socket.id} joined group room: group_${groupId}`);
    
    // Broadcast updated active members
    const clients = await io.in(`group_${groupId}`).fetchSockets();
    const activeUserIds = clients.map(c => c.data.userId);
    io.to(`group_${groupId}`).emit('active_members', activeUserIds);
  });

  socket.on('send_message', async (data) => {
    const { groupId, content, type, metadata } = data;
    const senderId = socket.data.userId;
    try {
      if (!groupId || !(await isGroupMember(senderId, groupId))) {
        socket.emit('error', 'Not authorized to send to this group');
        return;
      }

      // Ideally, check if clientMessageId already exists to ensure idempotency.
      // For MVP, we pass it to the insert query which will fail on unique constraint if duplicated.

      const [saved] = await db.insert(messages).values({
        groupId,
        senderId,
        content,
        type: type || 'text',
        metadata: metadata || null,
      }).returning();

      io.to(`group_${groupId}`).emit('new_message', saved);
    } catch (err) {
      console.error('Failed to save message:', err);
      socket.emit('error', 'Failed to send message');
    }
  });

  socket.on('update_location', async (data) => {
    const { groupId, lat, lng, name, startSharing } = data;
    const userId = socket.data.userId;
    
    const sessionKey = `${groupId}_${userId}`;
    const now = Date.now();

    if (startSharing) {
      // Start a 2-hour location sharing session
      activeLocationSessions.set(sessionKey, now + 2 * 60 * 60 * 1000);
    }

    const expiryTime = activeLocationSessions.get(sessionKey);
    
    if (!expiryTime || now > expiryTime) {
      socket.emit('location_session_expired', { message: 'Your location sharing session has expired. Please restart.' });
      return;
    }

    if (!groupId || !(await isGroupMember(userId, groupId))) {
      socket.emit('error', 'Not authorized to update this location');
      return;
    }

    // Broadcast location to group without db overhead
    socket.to(`group_${groupId}`).emit('location_updated', {
      userId,
      lat,
      lng,
      name,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on('emergency_sos', async (data) => {
    const { groupId, name, lat, lng, medicalOverview } = data;
    const userId = socket.data.userId;
    if (!groupId || !(await isGroupMember(userId, groupId))) {
      socket.emit('error', 'Not authorized to send this emergency alert');
      return;
    }

    // High-priority broadcast
    io.to(`group_${groupId}`).emit('emergency_alert', {
      userId,
      name,
      lat,
      lng,
      medicalOverview,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on('update_itinerary', async (data) => {
    const { groupId, items, tripId } = data;
    const updaterId = socket.data.userId;
    if (!groupId || !(await isGroupMember(updaterId, groupId))) {
      socket.emit('error', 'Not authorized to update this itinerary');
      return;
    }

    socket.to(`group_${groupId}`).emit('itinerary_updated', {
      tripId,
      updaterId,
      items,
    });
  });

  // ─── PRE-MATCH CHAT (ANONYMOUS) ─────────────────────────────────────────

  socket.on('join_pre_match', async ({ chatId }) => {
    const userId = socket.data.userId;
    if (!chatId || !(await isPreMatchParticipant(userId, chatId))) {
      socket.emit('error', 'Not authorized for this chat');
      return;
    }

    socket.join(`pre_match_${chatId}`);
    console.log(`Socket ${socket.id} joined pre-match room: pre_match_${chatId}`);
  });

  socket.on('send_pre_match_message', async (data) => {
    const { chatId, content, clientMessageId } = data;
    const senderId = socket.data.userId;
    try {
      if (!chatId || !(await isPreMatchParticipant(senderId, chatId))) {
        socket.emit('error', 'Not authorized to send to this chat');
        return;
      }

      let sentimentScore: number | null = null;
      try {
        const sentimentRes = await fetch(mlEndpoint('/api/ml/chat/sentiment'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: [{ id: crypto.randomUUID(), content }] }),
        });
        if (sentimentRes.ok) {
          const sentimentData = await sentimentRes.json();
          sentimentScore = sentimentData.average_sentiment ?? sentimentData.sentiment_score ?? null;
        }
      } catch {
        sentimentScore = null;
      }

      const [saved] = await db.insert(preMatchMessages).values({
        chatId,
        senderId,
        content,
        sentimentScore,
        clientMessageId,
      }).returning();

      if (sentimentScore !== null) {
        await db
          .update(preMatchChats)
          .set({ overallSentiment: sentimentScore })
          .where(eq(preMatchChats.id, chatId));
      }

      io.to(`pre_match_${chatId}`).emit('new_pre_match_message', saved);
    } catch (err) {
      console.error('Failed to save pre-match message:', err);
      socket.emit('error', 'Failed to send message');
    }
  });

  // ─── DIRECT MESSAGING (INBOX) ───────────────────────────────────────────

  socket.on('join_direct_chat', async ({ chatId }) => {
    const userId = socket.data.userId;
    const { isDirectChatParticipant } = await import('./src/lib/authz');
    if (!chatId || !(await isDirectChatParticipant(userId, chatId))) {
      socket.emit('error', 'Not authorized for this direct chat');
      return;
    }

    socket.join(`direct_${chatId}`);
    console.log(`Socket ${socket.id} joined direct chat room: direct_${chatId}`);
  });

  socket.on('typing_direct_chat', async ({ chatId, isTyping }) => {
    const userId = socket.data.userId;
    const { isDirectChatParticipant } = await import('./src/lib/authz');
    if (!chatId || !(await isDirectChatParticipant(userId, chatId))) return;

    socket.to(`direct_${chatId}`).emit('user_typing', { userId, isTyping });
  });

  socket.on('read_direct_chat', async ({ chatId }) => {
    const userId = socket.data.userId;
    const { isDirectChatParticipant } = await import('./src/lib/authz');
    if (!chatId || !(await isDirectChatParticipant(userId, chatId))) return;

    // We can broadcast that messages have been read
    socket.to(`direct_${chatId}`).emit('messages_read', { byUserId: userId, time: new Date().toISOString() });
  });

  socket.on('disconnecting', async () => {
    // Broadcast to groups that this user is leaving
    for (const room of socket.rooms) {
      if (room.startsWith('group_')) {
        const clients = await io.in(room).fetchSockets();
        // Exclude the currently disconnecting socket
        const activeUserIds = clients
          .filter(c => c.id !== socket.id)
          .map(c => c.data.userId);
        socket.to(room).emit('active_members', activeUserIds);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

// Integration of Background Work
const MINUTE_MS = 60 * 1000;
setInterval(() => {
  // Cleanup expired location sessions
  const now = Date.now();
  for (const [key, expiryTime] of activeLocationSessions.entries()) {
    if (now > expiryTime) {
      activeLocationSessions.delete(key);
    }
  }
}, MINUTE_MS);

// Bind to port immediately to satisfy Render health checks
httpServer.listen(port, () => {
  console.log(`> Listening on http://${hostname}:${port} (Waiting for Next.js to boot...)`);
});

// Start Next.js routing
app.prepare().then(() => {
  isNextReady = true;
  console.log('> Next.js is ready and handling requests');
}).catch((err) => {
  console.error('Error starting Next.js:', err);
  process.exit(1);
});
