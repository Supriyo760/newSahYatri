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

dotenv.config({ path: '.env.local' });

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      handle(req, res, parsedUrl);
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

  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    // ─── GROUP CHAT & REALTIME LOCATION ─────────────────────────────────────

    socket.on('join_group', async ({ groupId, userId }) => {
      if (!groupId || !userId || !(await isGroupMember(userId, groupId))) {
        socket.emit('error', 'Not authorized for this group');
        return;
      }

      socket.data.userId = userId;
      socket.join(`group_${groupId}`);
      console.log(`Socket ${socket.id} joined group room: group_${groupId}`);
    });

    socket.on('send_message', async (data) => {
      const { groupId, senderId, content, type, metadata } = data;
      try {
        if (!groupId || senderId !== socket.data.userId || !(await isGroupMember(senderId, groupId))) {
          socket.emit('error', 'Not authorized to send to this group');
          return;
        }

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

    socket.on('update_location', (data) => {
      const { groupId, userId, lat, lng, name } = data;
      if (!groupId || userId !== socket.data.userId) {
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

    socket.on('emergency_sos', (data) => {
      const { groupId, userId, name, lat, lng, medicalOverview } = data;
      if (!groupId || userId !== socket.data.userId) {
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
      const { groupId, updaterId, items, tripId } = data;
      if (!groupId || !updaterId || !(await isGroupMember(updaterId, groupId))) {
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

    socket.on('join_pre_match', async ({ chatId, userId }) => {
      if (!chatId || !userId || !(await isPreMatchParticipant(userId, chatId))) {
        socket.emit('error', 'Not authorized for this chat');
        return;
      }

      socket.data.userId = userId;
      socket.join(`pre_match_${chatId}`);
      console.log(`Socket ${socket.id} joined pre-match room: pre_match_${chatId}`);
    });

    socket.on('send_pre_match_message', async (data) => {
      const { chatId, senderId, content } = data;
      try {
        if (!chatId || senderId !== socket.data.userId || !(await isPreMatchParticipant(senderId, chatId))) {
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

    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id);
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Server ready on http://${hostname}:${port}`);
  });
}).catch((err) => {
  console.error('Error starting server:', err);
  process.exit(1);
});
