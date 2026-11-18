import express from 'express';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import nodemailer from 'nodemailer';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI } from '@google/genai';
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
const httpDevices = new Map<string, { roomId: string; device: ConnectedDevice; expiresAt: number }>();

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
  const byId = new Map<string, ConnectedDevice>();
  const now = Date.now();
  for (const [devId, entry] of httpDevices.entries()) {
    if (entry.expiresAt < now) {
      httpDevices.delete(devId);
    } else if (entry.roomId === roomId) {
      byId.set(devId, entry.device);
    }
  }
  for (const conn of clients.values()) {
    if (conn.roomId === roomId && conn.ws.readyState === WebSocket.OPEN) {
      byId.set(conn.device.deviceId, conn.device);
    }
  }
  return Array.from(byId.values());
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

  // Allow Capacitor native APK origins to call /api endpoints
  app.use('/api', (req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'TEJ FOOD PRODUCTS Real-Time Sync Server',
      activeRooms: rooms.size,
      connectedClients: clients.size,
      timestamp: new Date().toISOString(),
    });
  });

  // ---------------------------------------------------------
  // Google Maps Platform Proxy & Gemini Maps Grounding API
  // ---------------------------------------------------------
  const getMapsApiKey = (): string =>
    (process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();

  app.get('/api/maps/config', (_req, res) => {
    const apiKey = getMapsApiKey();
    res.json({
      ok: Boolean(apiKey),
      apiKey,
      hasGeminiGrounding: Boolean(process.env.GEMINI_API_KEY?.trim()),
    });
  });

  app.post('/api/maps/geocode', async (req, res) => {
    const apiKey = getMapsApiKey();
    if (!apiKey) {
      res.status(503).json({
        ok: false,
        message: 'Google Maps API Key सर्वर पर उपलब्ध नहीं है।',
      });
      return;
    }

    const { lat, lng, address } = req.body as {
      lat?: number;
      lng?: number;
      address?: string;
    };

    try {
      const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
      if (typeof lat === 'number' && typeof lng === 'number') {
        url.searchParams.set('latlng', `${lat},${lng}`);
      } else if (address && address.trim()) {
        url.searchParams.set('address', address.trim());
        url.searchParams.set('region', 'in');
      } else {
        res.status(400).json({ ok: false, message: 'lat/lng या address आवश्यक है।' });
        return;
      }
      url.searchParams.set('language', 'hi');
      url.searchParams.set('key', apiKey);

      const resp = await fetch(url.toString());
      if (resp.status === 429) {
        res.status(429).json({
          ok: false,
          errorCode: 'RESOURCE_EXHAUSTED',
          message: 'Google Maps API quota exceeded (429).',
        });
        return;
      }

      const data = (await resp.json()) as {
        status?: string;
        error_message?: string;
        results?: Array<{
          formatted_address?: string;
          place_id?: string;
          geometry?: { location?: { lat?: number; lng?: number } };
          address_components?: Array<{
            long_name?: string;
            types?: string[];
          }>;
        }>;
      };

      if (data.status === 'OVER_QUERY_LIMIT') {
        res.status(429).json({
          ok: false,
          errorCode: 'OVER_QUERY_LIMIT',
          message: data.error_message || 'OVER_QUERY_LIMIT',
        });
        return;
      }

      if (data.status !== 'OK' || !data.results || data.results.length === 0) {
        res.status(200).json({
          ok: false,
          status: data.status || 'ZERO_RESULTS',
          message: data.error_message || 'इस स्थान का पूरा पता Google Maps पर नहीं मिला।',
        });
        return;
      }

      const best = data.results[0];
      const comps = best.address_components || [];
      const cityComp =
        comps.find((c) => c.types?.includes('locality')) ||
        comps.find((c) => c.types?.includes('administrative_area_level_2')) ||
        comps.find((c) => c.types?.includes('administrative_area_level_3'));

      const rLat = best.geometry?.location?.lat ?? lat;
      const rLng = best.geometry?.location?.lng ?? lng;

      res.json({
        ok: true,
        formattedAddress: best.formatted_address || '',
        city: cityComp?.long_name || '',
        placeId: best.place_id || '',
        lat: rLat,
        lng: rLng,
        googleMapsUrl:
          typeof rLat === 'number' && typeof rLng === 'number'
            ? `https://www.google.com/maps/search/?api=1&query=${rLat},${rLng}`
            : '',
      });
    } catch (err) {
      console.error('Server geocode error:', err);
      res.status(500).json({
        ok: false,
        message: 'लोकेशन पता खोजने में सर्वर त्रुटि हुई।',
      });
    }
  });

  app.post('/api/maps/grounding', async (req, res) => {
    const geminiKey = process.env.GEMINI_API_KEY?.trim();
    if (!geminiKey) {
      res.status(503).json({
        ok: false,
        errorCode: 'GEMINI_NOT_CONFIGURED',
        message: 'GEMINI_API_KEY सर्वर पर उपलब्ध नहीं है।',
      });
      return;
    }

    const { lat, lng, query, firmName } = req.body as {
      lat?: number;
      lng?: number;
      query?: string;
      firmName?: string;
    };

    const hasLatLng =
      typeof lat === 'number' &&
      typeof lng === 'number' &&
      Number.isFinite(lat) &&
      Number.isFinite(lng);

    const userPrompt = query?.trim()
      ? query.trim()
      : firmName?.trim()
        ? `Verify nearby wholesale grain markets, transport hubs, or landmarks near "${firmName.trim()}" for flour mill (आटा मिल) delivery routing. Reply briefly in Hindi/English.`
        : 'List 2-3 notable nearby market areas, mandi, or major road landmarks near this location for flour delivery trucks in brief Hindi/English.';

    try {
      const ai = new GoogleGenAI({
        apiKey: geminiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: userPrompt,
        config: {
          tools: [{ googleMaps: {} }],
          ...(hasLatLng
            ? {
                toolConfig: {
                  retrievalConfig: {
                    latLng: { latitude: lat as number, longitude: lng as number },
                  },
                },
              }
            : {}),
        },
      });

      const candidate = response.candidates?.[0] as
        | {
            groundingMetadata?: {
              groundingChunks?: Array<{
                maps?: {
                  uri?: string;
                  title?: string;
                  placeId?: string;
                  placeAnswerSources?: {
                    reviewSnippets?: Array<{
                      googleMapsUri?: string;
                      reviewId?: string;
                    }>;
                  };
                };
              }>;
              googleMapsWidgetContextToken?: string;
            };
          }
        | undefined;

      const rawChunks = candidate?.groundingMetadata?.groundingChunks || [];
      const groundingChunks = rawChunks
        .filter((c) => Boolean(c.maps?.uri || c.maps?.title))
        .map((c) => ({
          title: c.maps?.title || 'Google Maps स्थान',
          uri: c.maps?.uri || '',
          placeId: c.maps?.placeId || '',
          reviewSnippets: c.maps?.placeAnswerSources?.reviewSnippets || [],
        }));

      res.json({
        ok: true,
        summary: response.text || '',
        groundingChunks,
        widgetContextToken: candidate?.groundingMetadata?.googleMapsWidgetContextToken || null,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
        res.status(429).json({
          ok: false,
          errorCode: 'RESOURCE_EXHAUSTED',
          message: 'API Quota exceeded (RESOURCE_EXHAUSTED).',
        });
        return;
      }
      console.error('Maps Grounding error:', err);
      res.status(500).json({
        ok: false,
        message: 'Google Maps Grounding जानकारी लोड करने में समस्या हुई।',
      });
    }
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

  // HTTP REST Sync Fallback Endpoints (for mobile data networks blocking WebSockets)
  app.post('/api/sync/join', (req, res) => {
    const { roomId: rawRoomId, deviceId, deviceName, deviceRole, userRole, initialMasterState } =
      req.body as {
        roomId?: string;
        deviceId?: string;
        deviceName?: string;
        deviceRole?: SyncDeviceRole;
        userRole?: UserRole;
        initialMasterState?: SyncableErpState;
      };

    const roomId = sanitizeRoomId(rawRoomId || 'tej-food-main');
    const room = loadOrCreateRoom(roomId);
    const now = new Date().toISOString();

    if (deviceId) {
      const device: ConnectedDevice = {
        deviceId,
        deviceName: deviceName || 'मोबाइल डिवाइस',
        deviceRole: deviceRole || 'staff',
        userRole: userRole || 'salesman',
        connectedAt: httpDevices.get(deviceId)?.device.connectedAt || now,
        lastSeenAt: now,
      };
      httpDevices.set(deviceId, { roomId, device, expiresAt: Date.now() + 30_000 });
    }

    if (!room.hasMasterSeed && deviceRole === 'master' && initialMasterState) {
      room.state = {
        ...initialMasterState,
        timestamp: now,
      };
      room.hasMasterSeed = true;
      room.seq += 1;
      const seedEvent: LiveActivityEvent = {
        id: `evt-seed-${Date.now()}`,
        seq: room.seq,
        timestamp: now,
        actorDeviceId: deviceId || 'http-master',
        actorName: deviceName || 'मालिक (Master)',
        actorRole: userRole || 'admin',
        category: 'sync',
        title: 'मुख्य मोबाइल सर्वर कनेक्ट हुआ',
        detail: `${room.state.orders.length} ऑर्डर व ${room.state.customers.length} ग्राहक सिंक किए गए`,
      };
      room.recentEvents = [seedEvent, ...room.recentEvents].slice(0, 60);
      scheduleRoomSave(room);
    }

    const devices = getRoomDevices(roomId);
    broadcastToRoom(roomId, {
      type: 'presence_update',
      roomId,
      devices,
    });

    res.json({
      ok: true,
      roomId,
      seq: room.seq,
      hasMasterSeed: room.hasMasterSeed,
      state: room.state,
      devices,
      recentEvents: room.recentEvents,
    });
  });

  app.get('/api/sync/poll/:roomId', (req, res) => {
    const roomId = sanitizeRoomId(req.params.roomId);
    const room = loadOrCreateRoom(roomId);
    const sinceSeq = Number(req.query.sinceSeq ?? -1);
    const deviceId = typeof req.query.deviceId === 'string' ? req.query.deviceId : '';
    const deviceName = typeof req.query.deviceName === 'string' ? req.query.deviceName : '';
    const deviceRole = req.query.deviceRole === 'master' ? 'master' : 'staff';
    const userRole = (typeof req.query.userRole === 'string' ? req.query.userRole : 'salesman') as UserRole;

    if (deviceId) {
      const now = new Date().toISOString();
      const prev = httpDevices.get(deviceId);
      httpDevices.set(deviceId, {
        roomId,
        device: {
          deviceId,
          deviceName: deviceName || prev?.device.deviceName || 'मोबाइल डिवाइस',
          deviceRole,
          userRole,
          connectedAt: prev?.device.connectedAt || now,
          lastSeenAt: now,
        },
        expiresAt: Date.now() + 30_000,
      });
    }

    const devices = getRoomDevices(roomId);
    const changed = sinceSeq !== room.seq;
    res.json({
      ok: true,
      roomId,
      seq: room.seq,
      hasMasterSeed: room.hasMasterSeed,
      changed,
      state: changed ? room.state : undefined,
      devices,
      recentEvents: room.recentEvents,
    });
  });

  app.post('/api/sync/mutation', (req, res) => {
    const { envelope } = req.body as {
      envelope?: {
        mutationId: string;
        roomId: string;
        actorDeviceId: string;
        actorName: string;
        actorRole: UserRole;
        timestamp: string;
        action: Parameters<typeof applyErpMutation>[1];
      };
    };

    if (!envelope || !envelope.mutationId || !envelope.action) {
      res.status(400).json({ ok: false, message: 'Invalid mutation payload' });
      return;
    }

    const roomId = sanitizeRoomId(envelope.roomId || 'tej-food-main');
    const room = loadOrCreateRoom(roomId);

    if (room.processedMutationIds.includes(envelope.mutationId)) {
      res.json({ ok: true, seq: room.seq, applied: false });
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
      res.json({ ok: true, seq: room.seq, applied: false });
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

    broadcastToRoom(roomId, {
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
    });

    res.json({ ok: true, seq: room.seq, applied: true, activity });
  });

  // ---------------------------------------------------------
  // Email OTP Password Reset System (Strict Email Verification)
  // ---------------------------------------------------------
  interface ResetOtpRecord {
    otpHash: string;
    staffId: string;
    email: string;
    roomId: string;
    expiresAt: number;
    requestedAt: number;
    attemptsLeft: number;
  }

  const resetOtpStore = new Map<string, ResetOtpRecord>();

  const normalizePhoneDigits = (raw: string): string => {
    const digits = (raw || '').replace(/\D/g, '');
    return digits.length > 10 ? digits.slice(-10) : digits;
  };

  const hashOtp = (otp: string): string =>
    crypto.createHash('sha256').update(otp.trim()).digest('hex');

  const maskEmail = (email: string): string => {
    const [local, domain] = email.split('@');
    if (!local || !domain) return '***';
    const visible = local.slice(0, Math.min(2, local.length));
    return `${visible}***@${domain}`;
  };

  const getEmailProviderInfo = (): { configured: boolean; provider: 'resend' | 'smtp' | null } => {
    if (process.env.RESEND_API_KEY?.trim()) {
      return { configured: true, provider: 'resend' };
    }
    if (process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim()) {
      return { configured: true, provider: 'smtp' };
    }
    return { configured: false, provider: null };
  };

  const sendOtpEmail = async (params: {
    toEmail: string;
    recipientName: string;
    companyName: string;
    otp: string;
  }): Promise<void> => {
    const { toEmail, recipientName, companyName, otp } = params;
    const subject = `${companyName} - पासवर्ड रीसेट OTP कोड (${otp})`;
    const textBody = [
      `नमस्ते ${recipientName},`,
      '',
      `${companyName} (Tejstha ERP) के पासवर्ड रीसेट के लिए आपका 6-अंकों का सत्यापन कोड (OTP):`,
      '',
      `OTP CODE: ${otp}`,
      '',
      'यह कोड 10 मिनट के लिए मान्य है। इसे किसी के साथ साझा न करें।',
      'यदि आपने यह अनुरोध नहीं किया है, तो कृपया इस ईमेल को अनदेखा करें।',
    ].join('\n');

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden;">
        <div style="background: #0f172a; color: #ffffff; padding: 20px 24px;">
          <h2 style="margin: 0; font-size: 18px; color: #fbbf24;">${companyName}</h2>
          <p style="margin: 4px 0 0; font-size: 13px; color: #cbd5e1;">पासवर्ड रीसेट सत्यापन कोड (Password Reset OTP)</p>
        </div>
        <div style="padding: 24px; color: #1e293b; font-size: 14px; line-height: 1.6;">
          <p>नमस्ते <strong>${recipientName}</strong>,</p>
          <p>आपने अपने ERP खाते का पासवर्ड रीसेट करने का अनुरोध किया है। कृपया ऐप में नीचे दिया गया 6-अंकों का कोड दर्ज करें:</p>
          <div style="margin: 20px 0; text-align: center; background: #fffbeb; border: 2px dashed #f59e0b; border-radius: 12px; padding: 16px;">
            <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #0f172a;">${otp}</span>
          </div>
          <p style="font-size: 12px; color: #64748b;">यह कोड केवल <strong>10 मिनट</strong> के लिए मान्य है। सुरक्षा के लिए यह कोड किसी अन्य व्यक्ति को न बताएं।</p>
        </div>
      </div>
    `;

    const resendKey = process.env.RESEND_API_KEY?.trim();
    if (resendKey) {
      const from = process.env.RESEND_FROM?.trim() || 'TEJ FOOD PRODUCTS <onboarding@resend.dev>';
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [toEmail],
          subject,
          text: textBody,
          html: htmlBody,
        }),
      });
      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`Resend API error (${resp.status}): ${errText}`);
      }
      return;
    }

    const smtpUser = process.env.SMTP_USER?.trim() || '';
    const smtpPass = process.env.SMTP_PASS?.trim() || '';
    const smtpHost = process.env.SMTP_HOST?.trim() || 'smtp.gmail.com';
    const smtpPort = Number(process.env.SMTP_PORT || 465);
    const smtpSecure = process.env.SMTP_SECURE
      ? process.env.SMTP_SECURE === 'true'
      : smtpPort === 465;
    const smtpFrom = process.env.SMTP_FROM?.trim() || `"${companyName}" <${smtpUser}>`;

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    await transporter.sendMail({
      from: smtpFrom,
      to: toEmail,
      subject,
      text: textBody,
      html: htmlBody,
    });
  };

  app.get('/api/auth/email-otp-status', (_req, res) => {
    const info = getEmailProviderInfo();
    res.json(info);
  });

  app.post('/api/auth/request-reset-otp', async (req, res) => {
    try {
      const { identifier, email, roomId: rawRoomId, staffHint } = req.body as {
        identifier?: string;
        email?: string;
        roomId?: string;
        staffHint?: {
          id?: string;
          name?: string;
          phone?: string;
          email?: string;
          role?: string;
          active?: boolean;
          companyName?: string;
        };
      };

      const providerInfo = getEmailProviderInfo();
      if (!providerInfo.configured) {
        res.status(503).json({
          ok: false,
          errorCode: 'EMAIL_NOT_CONFIGURED',
          message:
            'ईमेल OTP सेवा सर्वर पर कॉन्फ़िगर नहीं है। AI Studio Secrets में SMTP_USER व SMTP_PASS (Gmail App Password) या RESEND_API_KEY सेट करें।',
        });
        return;
      }

      const roomId = sanitizeRoomId(rawRoomId || 'tej-food-main');
      const room = loadOrCreateRoom(roomId);

      const cleanId = (identifier || '').trim();
      const cleanEmail = (email || '').trim().toLowerCase();
      if (!cleanId || !cleanEmail) {
        res.status(400).json({
          ok: false,
          message: 'कृपया रजिस्टर्ड मोबाइल नंबर और ईमेल दोनों दर्ज करें।',
        });
        return;
      }

      const inputDigits = normalizePhoneDigits(cleanId);
      const lowerId = cleanId.toLowerCase();

      const roomMember = room.state.staff.find((s) => {
        const phoneDigits = normalizePhoneDigits(s.phone || '');
        const phoneMatch = inputDigits.length >= 6 && phoneDigits === inputDigits;
        const emailMatch = Boolean(s.email) && s.email!.trim().toLowerCase() === lowerId;
        const nameMatch = s.name.trim().toLowerCase() === lowerId;
        return phoneMatch || emailMatch || nameMatch;
      });

      const member =
        staffHint && staffHint.id && staffHint.name
          ? {
              id: staffHint.id,
              name: staffHint.name,
              phone: staffHint.phone || '',
              email: staffHint.email,
              role: staffHint.role || 'staff',
              active: staffHint.active !== false,
            }
          : roomMember;

      if (!member) {
        res.status(404).json({
          ok: false,
          message: 'इस मोबाइल नंबर या ईमेल से कोई स्टाफ खाता नहीं मिला।',
        });
        return;
      }

      if (!member.active) {
        res.status(403).json({
          ok: false,
          message: 'यह खाता निष्क्रिय (Inactive) है। कृपया Admin से संपर्क करें।',
        });
        return;
      }

      const registeredEmail = (
        member.email ||
        (member.role === 'admin' ? room.state.settings.email : '') ||
        ''
      )
        .trim()
        .toLowerCase();

      if (!registeredEmail) {
        res.status(400).json({
          ok: false,
          message:
            'इस खाते में कोई ईमेल आईडी सेव नहीं है। कृपया Admin लॉगिन के बाद स्टाफ प्रोफाइल में ईमेल जोड़ें।',
        });
        return;
      }

      if (registeredEmail !== cleanEmail) {
        res.status(403).json({
          ok: false,
          message: 'दर्ज किया गया ईमेल इस खाते के रजिस्टर्ड ईमेल से मेल नहीं खा रहा है।',
        });
        return;
      }

      const storeKey = `${room.roomId}:${member.id}`;
      const existingOtp = resetOtpStore.get(storeKey);
      const now = Date.now();
      if (existingOtp && now - existingOtp.requestedAt < 30_000) {
        const waitSec = Math.ceil((30_000 - (now - existingOtp.requestedAt)) / 1000);
        res.status(429).json({
          ok: false,
          message: `कृपया नया OTP भेजने से पहले ${waitSec} सेकंड प्रतीक्षा करें।`,
        });
        return;
      }

      const otp = crypto.randomInt(100000, 1000000).toString();
      resetOtpStore.set(storeKey, {
        otpHash: hashOtp(otp),
        staffId: member.id,
        email: registeredEmail,
        roomId: room.roomId,
        expiresAt: now + 10 * 60 * 1000,
        requestedAt: now,
        attemptsLeft: 5,
      });

      await sendOtpEmail({
        toEmail: registeredEmail,
        recipientName: member.name,
        companyName: staffHint?.companyName || room.state.settings.companyName || 'Shri Tej Food Products',
        otp,
      });

      res.json({
        ok: true,
        maskedEmail: maskEmail(registeredEmail),
        expiresInMinutes: 10,
      });
    } catch (err) {
      console.error('Failed to send reset OTP email:', err);
      res.status(500).json({
        ok: false,
        message:
          'ईमेल पर OTP भेजने में सर्वर त्रुटि हुई। कृपया SMTP / Email कॉन्फ़िगरेशन जांचें।',
      });
    }
  });

  app.post('/api/auth/verify-reset-otp', (req, res) => {
    const { identifier, email, otp, newPassword, roomId: rawRoomId, staffHint } = req.body as {
      identifier?: string;
      email?: string;
      otp?: string;
      newPassword?: string;
      roomId?: string;
      staffHint?: {
        id?: string;
        name?: string;
        phone?: string;
        email?: string;
        role?: string;
        roleHindi?: string;
        active?: boolean;
        joinedDate?: string;
      };
    };

    const roomId = sanitizeRoomId(rawRoomId || 'tej-food-main');
    const room = loadOrCreateRoom(roomId);

    const cleanId = (identifier || '').trim();
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanOtp = (otp || '').trim();
    const cleanNewPass = (newPassword || '').trim();

    if (!cleanId || !cleanEmail || !cleanOtp || !cleanNewPass) {
      res.status(400).json({
        ok: false,
        message: 'मोबाइल, ईमेल, OTP कोड और नया पासवर्ड सभी भरना अनिवार्य है।',
      });
      return;
    }

    if (cleanNewPass.length < 4) {
      res.status(400).json({
        ok: false,
        message: 'नया पासवर्ड कम से कम 4 अक्षरों या अंकों का होना चाहिए।',
      });
      return;
    }

    const inputDigits = normalizePhoneDigits(cleanId);
    const lowerId = cleanId.toLowerCase();

    const roomMember = room.state.staff.find((s) => {
      const phoneDigits = normalizePhoneDigits(s.phone || '');
      const phoneMatch = inputDigits.length >= 6 && phoneDigits === inputDigits;
      const emailMatch = Boolean(s.email) && s.email!.trim().toLowerCase() === lowerId;
      const nameMatch = s.name.trim().toLowerCase() === lowerId;
      return phoneMatch || emailMatch || nameMatch;
    });

    const member =
      staffHint && staffHint.id && staffHint.name
        ? {
            ...(roomMember || {}),
            ...staffHint,
            id: staffHint.id,
            name: staffHint.name,
            phone: staffHint.phone || roomMember?.phone || '',
            role: (staffHint.role || roomMember?.role || 'salesman') as typeof room.state.staff[number]['role'],
            roleHindi: staffHint.roleHindi || roomMember?.roleHindi || 'स्टाफ',
            active: staffHint.active !== false,
            joinedDate: staffHint.joinedDate || roomMember?.joinedDate || new Date().toISOString().slice(0, 10),
          }
        : roomMember;

    if (!member || !member.active) {
      res.status(404).json({
        ok: false,
        message: 'वैध स्टाफ खाता नहीं मिला।',
      });
      return;
    }

    const storeKey = `${room.roomId}:${member.id}`;
    const record = resetOtpStore.get(storeKey);

    if (!record || record.email !== cleanEmail) {
      res.status(400).json({
        ok: false,
        message: 'इस ईमेल के लिए कोई सक्रिय OTP नहीं मिला। कृपया पहले ईमेल पर OTP कोड भेजें।',
      });
      return;
    }

    if (Date.now() > record.expiresAt) {
      resetOtpStore.delete(storeKey);
      res.status(400).json({
        ok: false,
        message: 'OTP कोड की समय सीमा (10 मिनट) समाप्त हो गई है। कृपया नया कोड भेजें।',
      });
      return;
    }

    const incomingBuf = Buffer.from(hashOtp(cleanOtp), 'hex');
    const storedBuf = Buffer.from(record.otpHash, 'hex');
    const isMatch =
      incomingBuf.length === storedBuf.length &&
      crypto.timingSafeEqual(incomingBuf, storedBuf);

    if (!isMatch) {
      record.attemptsLeft -= 1;
      if (record.attemptsLeft <= 0) {
        resetOtpStore.delete(storeKey);
        res.status(400).json({
          ok: false,
          message: 'गलत OTP कोड! अधिकतम प्रयास समाप्त हो गए। कृपया नया OTP कोड भेजें।',
        });
        return;
      }
      res.status(400).json({
        ok: false,
        message: `गलत OTP कोड! कृपया ईमेल में आया सही 6-अंकों का कोड डालें (${record.attemptsLeft} प्रयास शेष)।`,
      });
      return;
    }

    // Valid OTP — single-use delete and update password in authoritative room state
    resetOtpStore.delete(storeKey);

    const updatedMember = {
      ...member,
      password: cleanNewPass,
    };

    const mutationResult = applyErpMutation(room.state, {
      type: 'staff:update',
      staffMember: updatedMember,
    });

    if (mutationResult.applied) {
      room.state = mutationResult.nextState;
      room.seq += 1;
      const activity: LiveActivityEvent = {
        id: `evt-pwd-reset-${Date.now()}`,
        seq: room.seq,
        timestamp: new Date().toISOString(),
        actorDeviceId: 'email-otp-auth',
        actorName: updatedMember.name,
        actorRole: updatedMember.role,
        category: 'staff',
        title: `पासवर्ड रीसेट: ${updatedMember.name}`,
        detail: 'ईमेल OTP सत्यापन द्वारा पासवर्ड बदला गया',
      };
      room.recentEvents = [activity, ...room.recentEvents].slice(0, 60);
      scheduleRoomSave(room);

      broadcastToRoom(room.roomId, {
        type: 'mutation_broadcast',
        roomId: room.roomId,
        seq: room.seq,
        envelope: {
          mutationId: activity.id,
          roomId: room.roomId,
          actorDeviceId: 'email-otp-auth',
          actorName: updatedMember.name,
          actorRole: updatedMember.role,
          timestamp: activity.timestamp,
          action: {
            type: 'staff:update',
            staffMember: updatedMember,
          },
        },
        activity,
      });
    }

    res.json({
      ok: true,
      updatedMember,
      message: `${updatedMember.name} का पासवर्ड सफलतापूर्वक बदल गया है।`,
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
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const reqUrl = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
    if (reqUrl.pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

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
      server: { middlewareMode: true, hmr: false, ws: false },
      appType: 'spa',
    });
    // HMR is disabled in this environment; serve a lightweight shim without opening a port-24678 WebSocket
    app.get('/@vite/client', (_req, res) => {
      res.type('application/javascript').send(`
const sheetsMap = new Map();
export class ErrorOverlay extends HTMLElement {}
export function injectQuery(id) { return id; }
export function updateStyle(id, content) {
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.setAttribute('data-vite-dev-id', id);
    style.textContent = content;
    document.head.appendChild(style);
    sheetsMap.set(id, style);
  } else {
    style.textContent = content;
  }
}
export function removeStyle(id) {
  const style = sheetsMap.get(id);
  if (style) {
    style.remove();
    sheetsMap.delete(id);
  }
}
export function createHotContext() {
  return {
    data: {},
    accept() {},
    acceptExports() {},
    dispose() {},
    prune() {},
    decline() {},
    invalidate() {},
    on() {},
    off() {},
    send() {},
  };
}
`);
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
