import express from 'express';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { WebSocketServer, WebSocket } from 'ws';
import {
  INITIAL_BAG_STOCK,
  INITIAL_CUSTOMERS,
  INITIAL_EXPENSES,
  INITIAL_ORDERS,
  INITIAL_PRODUCTION,
  INITIAL_PRODUCTS,
  INITIAL_RAW_STOCK,
  INITIAL_SETTINGS,
  INITIAL_STAFF,
} from './src/data/initialData.ts';
import { applyErpMutation } from './shared/erpSyncReducer.ts';
import type {
  ConnectedDevice,
  LiveActivityEvent,
  SyncableErpState,
  SyncDeviceRole,
  WsClientMessage,
  WsServerMessage,
} from './shared/erpSyncTypes.ts';
import type { UserRole } from './src/types/erp.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.join(__dirname, '.erp-sync-data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface PersistedRoomData {
  roomId: string;
  seq: number;
  hasMasterSeed: boolean;
  state: SyncableErpState;
  recentEvents: LiveActivityEvent[];
  processedMutationIds: string[];
  processedPaymentIds: string[];
}

interface ClientConnection {
  ws: WebSocket;
  roomId: string;
  device: ConnectedDevice;
}

const rooms = new Map<string, PersistedRoomData>();
const clients = new Map<WebSocket, ClientConnection>();

function sanitizeRoomId(raw: string): string {
  const cleaned = (raw || 'tej-food-main').trim().replace(/[^a-zA-Z0-9_-]/g, '-');
  return cleaned.slice(0, 64) || 'tej-food-main';
}

function createDefaultState(): SyncableErpState {
  return {
    version: '2.4.0',
    timestamp: new Date().toISOString(),
    settings: INITIAL_SETTINGS,
    products: INITIAL_PRODUCTS,
    rawStock: INITIAL_RAW_STOCK,
    bagStock: INITIAL_BAG_STOCK,
    customers: INITIAL_CUSTOMERS,
    orders: INITIAL_ORDERS,
    production: INITIAL_PRODUCTION,
    expenses: INITIAL_EXPENSES,
    staff: INITIAL_STAFF,
  };
}

function getRoomFilePath(roomId: string): string {
  return path.join(DATA_DIR, `${sanitizeRoomId(roomId)}.json`);
}

function loadOrCreateRoom(rawRoomId: string): PersistedRoomData {
  const roomId = sanitizeRoomId(rawRoomId);
  const existing = rooms.get(roomId);
  if (existing) return existing;

  const filePath = getRoomFilePath(roomId);
  if (fs.existsSync(filePath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as PersistedRoomData;
      if (parsed && parsed.state && Array.isArray(parsed.state.orders)) {
        const room: PersistedRoomData = {
          roomId,
          seq: typeof parsed.seq === 'number' ? parsed.seq : 0,
          hasMasterSeed: Boolean(parsed.hasMasterSeed),
          state: parsed.state,
          recentEvents: Array.isArray(parsed.recentEvents) ? parsed.recentEvents : [],
          processedMutationIds: Array.isArray(parsed.processedMutationIds) ? parsed.processedMutationIds : [],
          processedPaymentIds: Array.isArray(parsed.processedPaymentIds) ? parsed.processedPaymentIds : [],
        };
        rooms.set(roomId, room);
        return room;
      }
    } catch (err) {
      console.error(`Failed to read persisted room ${roomId}:`, err);
    }
  }

  const freshRoom: PersistedRoomData = {
    roomId,
    seq: 0,
    hasMasterSeed: false,
    state: createDefaultState(),
    recentEvents: [],
    processedMutationIds: [],
    processedPaymentIds: [],
  };
  rooms.set(roomId, freshRoom);
  return freshRoom;
}

const pendingSaveTimers = new Map<string, NodeJS.Timeout>();

function scheduleRoomSave(room: PersistedRoomData): void {
  const existingTimer = pendingSaveTimers.get(room.roomId);
  if (existingTimer) clearTimeout(existingTimer);

  const timer = setTimeout(() => {
    try {
      const filePath = getRoomFilePath(room.roomId);
      const snapshot: PersistedRoomData = {
        ...room,
        processedMutationIds: room.processedMutationIds.slice(-500),
        processedPaymentIds: room.processedPaymentIds.slice(-500),
        recentEvents: room.recentEvents.slice(0, 60),
      };
      fs.writeFileSync(filePath, JSON.stringify(snapshot));
    } catch (err) {
      console.error(`Failed saving room ${room.roomId}:`, err);
    } finally {
      pendingSaveTimers.delete(room.roomId);
    }
  }, 150);

  pendingSaveTimers.set(room.roomId, timer);
}

function getRoomDevices(roomId: string): ConnectedDevice[] {
  const list: ConnectedDevice[] = [];
  for (const conn of clients.values()) {
    if (conn.roomId === roomId && conn.ws.readyState === WebSocket.OPEN) {
      list.push(conn.device);
    }
  }
  return list;
}

function sendJson(ws: WebSocket, msg: WsServerMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function broadcastToRoom(roomId: string, msg: WsServerMessage, excludeWs?: WebSocket): void {
  const payload = JSON.stringify(msg);
  for (const [clientWs, conn] of clients.entries()) {
    if (conn.roomId === roomId && clientWs !== excludeWs && clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(payload);
    }
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'TEJ FOOD PRODUCTS Real-Time Sync Server',
      activeRooms: rooms.size,
      connectedClients: clients.size,
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/sync-status/:roomId', (req, res) => {
    const room = loadOrCreateRoom(req.params.roomId);
    res.json({
      roomId: room.roomId,
      seq: room.seq,
      hasMasterSeed: room.hasMasterSeed,
      devices: getRoomDevices(room.roomId),
      recentEventsCount: room.recentEvents.length,
    });
  });

  const findBuiltApkPath = (): string | null => {
    const candidates = [
      path.join(__dirname, 'release-apk', 'TejFoodProducts-ERP-debug.apk'),
      path.join(__dirname, 'public', 'downloads', 'TejFoodProducts-ERP-debug.apk'),
      path.join(__dirname, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk'),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        const stat = fs.statSync(candidate);
        if (stat.isFile() && stat.size > 100_000) {
          return candidate;
        }
      }
    }
    return null;
  };

  app.get('/api/apk-status', (_req, res) => {
    const apkPath = findBuiltApkPath();
    const fileSizeBytes = apkPath ? fs.statSync(apkPath).size : null;
    res.json({
      available: Boolean(apkPath),
      downloadUrl: apkPath ? '/api/apk-download' : null,
      fileName: 'TejFoodProducts-ERP-debug.apk',
      fileSizeBytes,
      packageId: 'com.shritejfood.erp',
      versionName: '2.4.0',
      hasAndroidProject: fs.existsSync(path.join(__dirname, 'android', 'gradlew')),
      hasGithubWorkflow: fs.existsSync(path.join(__dirname, '.github', 'workflows', 'build-apk.yml')),
      hasDistBuild: fs.existsSync(path.join(__dirname, 'dist', 'index.html')),
      bundleUrl: '/api/download-android-bundle',
    });
  });

  app.get('/api/apk-download', (_req, res) => {
    const apkPath = findBuiltApkPath();
    if (!apkPath) {
      res.status(404).json({
        error: 'APK binary not compiled on this container (Android SDK / Java 21 not installed). Use GitHub Actions or download the Android project bundle.',
      });
      return;
    }
    res.download(apkPath, 'TejFoodProducts-ERP-debug.apk');
  });

  app.get('/api/download-android-bundle', (req, res) => {
    const bundleEntries = [
      '.github',
      'android',
      'public',
      'shared',
      'src',
      'capacitor.config.ts',
      'index.html',
      'package.json',
      'package-lock.json',
      'bun.lock',
      'server.ts',
      'tsconfig.json',
      'vite.config.ts',
    ].filter((entry) => fs.existsSync(path.join(__dirname, entry)));

    if (fs.existsSync(path.join(__dirname, 'dist'))) {
      bundleEntries.push('dist');
    }

    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="TejFoodProducts-Android-APK-Project-v2.4.0.tar.gz"'
    );

    const tarArgs = [
      '-czf',
      '-',
      '--exclude=android/.gradle',
      '--exclude=android/app/build',
      '--exclude=android/build',
      '--exclude=node_modules',
      '--exclude=.git',
      '--exclude=.erp-sync-data',
      ...bundleEntries,
    ];

    const tarProc = spawn('tar', tarArgs, { cwd: __dirname });

    tarProc.stdout.pipe(res);

    tarProc.stderr.on('data', (chunk) => {
      console.error('tar stderr:', chunk.toString());
    });

    tarProc.on('error', (err) => {
      console.error('Failed to spawn tar for android bundle:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to archive Android project bundle' });
      } else {
        res.end();
      }
    });

    req.on('close', () => {
      if (!tarProc.killed) {
        tarProc.kill('SIGTERM');
      }
    });
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    ws.on('message', (rawData) => {
      let msg: WsClientMessage;
      try {
        msg = JSON.parse(rawData.toString()) as WsClientMessage;
      } catch {
        return;
      }

      if (msg.type === 'ping') {
        const conn = clients.get(ws);
        if (conn) {
          conn.device.lastSeenAt = new Date().toISOString();
        }
        sendJson(ws, { type: 'pong' });
        return;
      }

      if (msg.type === 'join') {
        const roomId = sanitizeRoomId(msg.roomId);
        const room = loadOrCreateRoom(roomId);
        const now = new Date().toISOString();

        const device: ConnectedDevice = {
          deviceId: msg.deviceId,
          deviceName: msg.deviceName || 'मोबाइल डिवाइस',
          deviceRole: msg.deviceRole,
          userRole: msg.userRole,
          connectedAt: now,
          lastSeenAt: now,
        };

        clients.set(ws, { ws, roomId, device });

        // If server room has never been seeded by Master Mobile yet and joining device is Master
        if (!room.hasMasterSeed && msg.deviceRole === 'master' && msg.initialMasterState) {
          room.state = {
            ...msg.initialMasterState,
            timestamp: now,
          };
          room.hasMasterSeed = true;
          room.seq += 1;
          const seedEvent: LiveActivityEvent = {
            id: `evt-seed-${Date.now()}`,
            seq: room.seq,
            timestamp: now,
            actorDeviceId: msg.deviceId,
            actorName: msg.deviceName || 'मालिक (Master)',
            actorRole: msg.userRole,
            category: 'sync',
            title: 'मुख्य मोबाइल सर्वर कनेक्ट हुआ',
            detail: `${room.state.orders.length} ऑर्डर व ${room.state.customers.length} ग्राहक सिंक किए गए`,
          };
          room.recentEvents = [seedEvent, ...room.recentEvents].slice(0, 60);
          scheduleRoomSave(room);

          // Broadcast updated full state to any staff already connected in room
          broadcastToRoom(
            roomId,
            {
              type: 'mutation_broadcast',
              roomId,
              seq: room.seq,
              envelope: {
                mutationId: seedEvent.id,
                roomId,
                actorDeviceId: msg.deviceId,
                actorName: device.deviceName,
                actorRole: msg.userRole,
                timestamp: now,
                action: {
                  type: 'master:push_full_state',
                  fullState: room.state,
                },
              },
              activity: seedEvent,
              state: room.state,
            },
            ws
          );
        }

        const devices = getRoomDevices(roomId);
        sendJson(ws, {
          type: 'init',
          roomId,
          seq: room.seq,
          hasMasterSeed: room.hasMasterSeed,
          state: room.state,
          devices,
          recentEvents: room.recentEvents,
        });

        broadcastToRoom(
          roomId,
          {
            type: 'presence_update',
            roomId,
            devices,
          },
          ws
        );
        return;
      }

      if (msg.type === 'update_presence') {
        const conn = clients.get(ws);
        const roomId = sanitizeRoomId(msg.roomId);
        if (conn) {
          conn.device = {
            ...conn.device,
            deviceName: msg.deviceName || conn.device.deviceName,
            deviceRole: msg.deviceRole,
            userRole: msg.userRole,
            lastSeenAt: new Date().toISOString(),
          };
          if (conn.roomId !== roomId) {
            const oldRoomId = conn.roomId;
            conn.roomId = roomId;
            broadcastToRoom(oldRoomId, {
              type: 'presence_update',
              roomId: oldRoomId,
              devices: getRoomDevices(oldRoomId),
            });
          }
          broadcastToRoom(roomId, {
            type: 'presence_update',
            roomId,
            devices: getRoomDevices(roomId),
          });
        }
        return;
      }

      if (msg.type === 'mutation') {
        const { envelope } = msg;
        const roomId = sanitizeRoomId(envelope.roomId);
        const room = loadOrCreateRoom(roomId);

        // Idempotency guard for duplicate mutations
        if (room.processedMutationIds.includes(envelope.mutationId)) {
          sendJson(ws, {
            type: 'mutation_ack',
            mutationId: envelope.mutationId,
            seq: room.seq,
            applied: false,
          });
          return;
        }

        const paymentSet = new Set(room.processedPaymentIds);
        const result = applyErpMutation(room.state, envelope.action, paymentSet);

        room.processedMutationIds.push(envelope.mutationId);
        if (room.processedMutationIds.length > 600) {
          room.processedMutationIds = room.processedMutationIds.slice(-500);
        }
        room.processedPaymentIds = Array.from(paymentSet).slice(-500);

        if (!result.applied) {
          sendJson(ws, {
            type: 'mutation_ack',
            mutationId: envelope.mutationId,
            seq: room.seq,
            applied: false,
          });
          return;
        }

        room.state = result.nextState;
        room.seq += 1;
        if (
          envelope.action.type === 'master:push_full_state' ||
          envelope.action.type === 'master:reset_factory' ||
          envelope.actorRole === 'admin'
        ) {
          room.hasMasterSeed = true;
        }

        const activity: LiveActivityEvent = {
          id: envelope.mutationId,
          seq: room.seq,
          timestamp: envelope.timestamp || new Date().toISOString(),
          actorDeviceId: envelope.actorDeviceId,
          actorName: envelope.actorName,
          actorRole: envelope.actorRole,
          category: result.activityMeta?.category || 'sync',
          title: result.activityMeta?.title || 'डेटा अपडेट',
          detail: result.activityMeta?.detail || '',
        };

        room.recentEvents = [activity, ...room.recentEvents].slice(0, 60);
        scheduleRoomSave(room);

        sendJson(ws, {
          type: 'mutation_ack',
          mutationId: envelope.mutationId,
          seq: room.seq,
          applied: true,
        });

        broadcastToRoom(
          roomId,
          {
            type: 'mutation_broadcast',
            roomId,
            seq: room.seq,
            envelope,
            activity,
            state:
              envelope.action.type === 'master:push_full_state' ||
              envelope.action.type === 'master:reset_factory'
                ? room.state
                : undefined,
          },
          ws
        );
      }
    });

    ws.on('close', () => {
      const conn = clients.get(ws);
      if (conn) {
        const { roomId } = conn;
        clients.delete(ws);
        broadcastToRoom(roomId, {
          type: 'presence_update',
          roomId,
          devices: getRoomDevices(roomId),
        });
      }
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`TEJ FOOD PRODUCTS ERP Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start ERP server:', err);
  process.exit(1);
});
