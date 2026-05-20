import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import { db } from './src/db';
import { messages, preMatchMessages } from './src/db/schema';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
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

    socket.on('join_group', ({ groupId }) => {
      socket.join(`group_${groupId}`);
      console.log(`Socket ${socket.id} joined group room: group_${groupId}`);
    });

    socket.on('send_message', async (data) => {
      const { groupId, senderId, content, type, metadata } = data;
      try {
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

    // ─── PRE-MATCH CHAT (ANONYMOUS) ─────────────────────────────────────────

    socket.on('join_pre_match', ({ chatId }) => {
      socket.join(`pre_match_${chatId}`);
      console.log(`Socket ${socket.id} joined pre-match room: pre_match_${chatId}`);
    });

    socket.on('send_pre_match_message', async (data) => {
      const { chatId, senderId, content } = data;
      try {
        const [saved] = await db.insert(preMatchMessages).values({
          chatId,
          senderId,
          content,
        }).returning();

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
