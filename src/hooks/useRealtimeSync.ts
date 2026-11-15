import { useCallback, useEffect, useRef, useState } from 'react';
import { applyErpMutation } from '../../shared/erpSyncReducer';
import type {
  ConnectedDevice,
  ErpMutationAction,
  LiveActivityEvent,
  SyncableErpState,
  SyncDeviceRole,
  SyncMutationEnvelope,
  WsServerMessage,
} from '../../shared/erpSyncTypes';
import type { UserRole } from '../types/erp';

const SYNC_CONFIG_KEY = 'tej_erp_sync_config_v1';
const PENDING_QUEUE_KEY = 'tej_erp_pending_queue_v1';

const DEFAULT_SYNC_SERVER_URL =
  'https://ais-pre-yevywmvpbfmbyiknv4vkin-325769928556.asia-northeast1.run.app';

export interface SyncConfig {
  roomId: string;
  deviceId: string;
  deviceName: string;
  deviceRole: SyncDeviceRole;
  syncServerUrl?: string;
}

export type SyncConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'offline';
export type SyncTransportMode = 'websocket' | 'http' | 'none';

export interface ServerProbeResult {
  ok: boolean;
  message: string;
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isRunningInNativeShell(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.location.protocol === 'capacitor:' ||
    window.location.protocol === 'file:' ||
    (window.location.hostname === 'localhost' && window.location.port !== '3000')
  );
}

function resolveHttpBase(syncServerUrl?: string): string {
  if (typeof window === 'undefined') return '';
  if (isRunningInNativeShell()) {
    return (syncServerUrl || DEFAULT_SYNC_SERVER_URL).trim().replace(/\/+$/, '');
  }
  const trimmed = (syncServerUrl || '').trim().replace(/\/+$/, '');
  if (
    trimmed &&
    trimmed !== DEFAULT_SYNC_SERVER_URL &&
    trimmed !== window.location.origin
  ) {
    return trimmed;
  }
  return '';
}

function getInitialSyncConfig(): SyncConfig {
  let saved: Partial<SyncConfig> = {};
  try {
    const raw = localStorage.getItem(SYNC_CONFIG_KEY);
    if (raw) saved = JSON.parse(raw);
  } catch {
    // ignore parse error
  }

  let urlRoom: string | null = null;
  let urlMode: string | null = null;
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    urlRoom = params.get('syncRoom');
    urlMode = params.get('mode');
  }

  const deviceId = saved.deviceId || generateId('dev');
  const roomId = (urlRoom || saved.roomId || 'tej-food-main').trim() || 'tej-food-main';
  const deviceRole: SyncDeviceRole =
    urlMode === 'staff'
      ? 'staff'
      : urlMode === 'master'
        ? 'master'
        : saved.deviceRole || 'master';

  const deviceName =
    saved.deviceName ||
    (deviceRole === 'master' ? 'मालिक मुख्य मोबाइल (Owner Host)' : 'स्टाफ मोबाइल');

  const finalConfig: SyncConfig = {
    roomId,
    deviceId,
    deviceName,
    deviceRole,
    syncServerUrl: saved.syncServerUrl || DEFAULT_SYNC_SERVER_URL,
  };

  try {
    localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(finalConfig));
  } catch {
    // ignore storage errors
  }

  return finalConfig;
}

function loadPendingQueue(): SyncMutationEnvelope[] {
  try {
    const raw = localStorage.getItem(PENDING_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePendingQueue(queue: SyncMutationEnvelope[]): void {
  try {
    localStorage.setItem(PENDING_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // ignore
  }
}

function playNotificationChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {
    // Audio playback might be blocked before interaction
  }
}

interface UseRealtimeSyncOptions {
  currentUserRole: UserRole;
  getCurrentState: () => SyncableErpState;
  applyFullState: (nextState: SyncableErpState) => void;
  isAppLoaded: boolean;
  onRemoteActivity: (event: LiveActivityEvent) => void;
}

export function useRealtimeSync({
  currentUserRole,
  getCurrentState,
  applyFullState,
  isAppLoaded,
  onRemoteActivity,
}: UseRealtimeSyncOptions) {
  const [config, setConfig] = useState<SyncConfig>(() => getInitialSyncConfig());
  const [status, setStatus] = useState<SyncConnectionStatus>('connecting');
  const [transportMode, setTransportMode] = useState<SyncTransportMode>('none');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connectedDevices, setConnectedDevices] = useState<ConnectedDevice[]>([]);
  const [recentEvents, setRecentEvents] = useState<LiveActivityEvent[]>([]);
  const [serverSeq, setServerSeq] = useState<number>(0);
  const [pendingCount, setPendingCount] = useState<number>(() => loadPendingQueue().length);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [hasMasterSeed, setHasMasterSeed] = useState<boolean>(false);
  const [connectTrigger, setConnectTrigger] = useState<number>(0);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const pingTimerRef = useRef<number | null>(null);
  const httpPollTimerRef = useRef<number | null>(null);
  const reconnectAttemptRef = useRef<number>(0);
  const processedPaymentIdsRef = useRef<Set<string>>(new Set());
  const transportModeRef = useRef<SyncTransportMode>('none');
  const serverSeqRef = useRef<number>(0);

  const getCurrentStateRef = useRef(getCurrentState);
  getCurrentStateRef.current = getCurrentState;
  const applyFullStateRef = useRef(applyFullState);
  applyFullStateRef.current = applyFullState;
  const onRemoteActivityRef = useRef(onRemoteActivity);
  onRemoteActivityRef.current = onRemoteActivity;
  const configRef = useRef(config);
  configRef.current = config;
  const userRoleRef = useRef(currentUserRole);
  userRoleRef.current = currentUserRole;
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  const updateTransport = (next: SyncTransportMode) => {
    transportModeRef.current = next;
    setTransportMode(next);
  };

  const probeServerHealth = useCallback(async (urlOverride?: string): Promise<ServerProbeResult> => {
    const base =
      urlOverride !== undefined
        ? urlOverride.trim().replace(/\/+$/, '')
        : resolveHttpBase(configRef.current.syncServerUrl);
    const target = `${base}/api/health`;
    try {
      const resp = await fetch(target, { method: 'GET' });
      const contentType = resp.headers.get('content-type') || '';
      if (resp.status === 404) {
        return {
          ok: false,
          message:
            'सर्वर URL पर ऐप डिप्लॉय नहीं मिला (404)। APK चलाने के लिए पहले AI Studio से "Deploy App" करें या लाइव Public Server URL डालें।',
        };
      }
      if (!contentType.includes('application/json')) {
        return {
          ok: false,
          message:
            'यह URL Google Auth/Preview पेज पर रीडायरेक्ट हो रहा है। मोबाइल APK के लिए कृपया Deployed Public URL या लोकल Wi-Fi Server URL (http://IP:3000) डालें।',
        };
      }
      if (!resp.ok) {
        return {
          ok: false,
          message: `सर्वर से त्रुटि मिली (HTTP ${resp.status})। कृपया सर्वर URL जांचें।`,
        };
      }
      const json = (await resp.json()) as { ok?: boolean };
      if (!json?.ok) {
        return { ok: false, message: 'सर्वर ने वैध हेल्थ रिस्पॉन्स नहीं दिया।' };
      }
      return { ok: true, message: 'सर्वर कनेक्शन सफल! रियल-टाइम सिंक चालू है।' };
    } catch {
      return {
        ok: false,
        message:
          'सर्वर तक नेटवर्क नहीं पहुँच पा रहा। कृपया अपना मोबाइल डेटा/इंटरनेट और सर्वर URL जांचें।',
      };
    }
  }, []);

  const flushPendingQueueWs = useCallback((ws: WebSocket) => {
    const queue = loadPendingQueue();
    if (queue.length === 0) return;

    const remaining: SyncMutationEnvelope[] = [];
    for (const env of queue) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'mutation', envelope: env }));
      } else {
        remaining.push(env);
      }
    }
    savePendingQueue(remaining);
    setPendingCount(remaining.length);
  }, []);

  const flushPendingQueueHttp = useCallback(async (httpBase: string) => {
    const queue = loadPendingQueue();
    if (queue.length === 0) return;

    const remaining: SyncMutationEnvelope[] = [];
    for (const env of queue) {
      try {
        const res = await fetch(`${httpBase}/api/sync/mutation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ envelope: env }),
        });
        if (!res.ok) {
          remaining.push(env);
        }
      } catch {
        remaining.push(env);
      }
    }
    savePendingQueue(remaining);
    setPendingCount(remaining.length);
  }, []);

  useEffect(() => {
    if (!isAppLoaded) return;

    let unmounted = false;

    const stopHttpPolling = () => {
      if (httpPollTimerRef.current) {
        window.clearInterval(httpPollTimerRef.current);
        httpPollTimerRef.current = null;
      }
    };

    const startHttpFallbackSync = async (httpBase: string): Promise<boolean> => {
      if (unmounted) return false;
      try {
        const activeConfig = configRef.current;
        const joinRes = await fetch(`${httpBase}/api/sync/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId: activeConfig.roomId,
            deviceId: activeConfig.deviceId,
            deviceName: activeConfig.deviceName,
            deviceRole: activeConfig.deviceRole,
            userRole: userRoleRef.current,
            initialMasterState:
              activeConfig.deviceRole === 'master' && userRoleRef.current === 'admin'
                ? getCurrentStateRef.current()
                : undefined,
          }),
        });
        if (!joinRes.ok) return false;
        const joinData = (await joinRes.json()) as {
          ok?: boolean;
          seq: number;
          hasMasterSeed: boolean;
          state: SyncableErpState;
          devices: ConnectedDevice[];
          recentEvents: LiveActivityEvent[];
        };
        if (!joinData?.ok) return false;

        updateTransport('http');
        setStatus('connected');
        setConnectionError(null);
        reconnectAttemptRef.current = 0;
        serverSeqRef.current = joinData.seq;
        setServerSeq(joinData.seq);
        setHasMasterSeed(Boolean(joinData.hasMasterSeed));
        setConnectedDevices(joinData.devices || []);
        setRecentEvents(joinData.recentEvents || []);
        setLastSyncedAt(new Date().toISOString());

        if (joinData.hasMasterSeed || activeConfig.deviceRole === 'staff') {
          applyFullStateRef.current(joinData.state);
        }

        await flushPendingQueueHttp(httpBase);

        stopHttpPolling();
        httpPollTimerRef.current = window.setInterval(async () => {
          if (unmounted) return;
          try {
            const cfg = configRef.current;
            const qs = new URLSearchParams({
              sinceSeq: String(serverSeqRef.current),
              deviceId: cfg.deviceId,
              deviceName: cfg.deviceName,
              deviceRole: cfg.deviceRole,
              userRole: userRoleRef.current,
            });
            const pollResp = await fetch(
              `${httpBase}/api/sync/poll/${encodeURIComponent(cfg.roomId)}?${qs.toString()}`
            );
            if (!pollResp.ok) {
              throw new Error(`HTTP ${pollResp.status}`);
            }
            const pollData = (await pollResp.json()) as {
              ok?: boolean;
              seq: number;
              changed: boolean;
              state?: SyncableErpState;
              devices: ConnectedDevice[];
              recentEvents: LiveActivityEvent[];
            };
            if (!pollData?.ok) return;

            setConnectedDevices(pollData.devices || []);
            setLastSyncedAt(new Date().toISOString());

            if (pollData.changed && pollData.state) {
              const previousSeq = serverSeqRef.current;
              serverSeqRef.current = pollData.seq;
              setServerSeq(pollData.seq);
              setRecentEvents(pollData.recentEvents || []);
              applyFullStateRef.current(pollData.state);

              const latestEvt = pollData.recentEvents?.[0];
              if (
                pollData.seq > previousSeq &&
                latestEvt &&
                latestEvt.actorDeviceId !== cfg.deviceId
              ) {
                if (soundEnabledRef.current) playNotificationChime();
                onRemoteActivityRef.current(latestEvt);
              }
            }
          } catch {
            stopHttpPolling();
            updateTransport('none');
            if (!unmounted) {
              setStatus('reconnecting');
              reconnectTimerRef.current = window.setTimeout(connect, 3500);
            }
          }
        }, 3000);

        return true;
      } catch {
        return false;
      }
    };

    const connect = () => {
      if (unmounted) return;
      stopHttpPolling();

      const httpBase = resolveHttpBase(configRef.current.syncServerUrl);
      let wsUrl: string;
      if (httpBase) {
        wsUrl = httpBase.replace(/^https:/i, 'wss:').replace(/^http:/i, 'ws:') + '/ws';
      } else {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl = `${protocol}//${window.location.host}/ws`;
      }

      setStatus(reconnectAttemptRef.current > 0 ? 'reconnecting' : 'connecting');

      let wsOpened = false;
      let ws: WebSocket;
      try {
        ws = new WebSocket(wsUrl);
      } catch {
        updateTransport('none');
        setStatus('offline');
        setConnectionError('सर्वर URL अमान्य है। कृपया सही https:// या http:// URL दर्ज करें।');
        return;
      }
      wsRef.current = ws;

      ws.onopen = () => {
        if (unmounted) {
          ws.close();
          return;
        }
        wsOpened = true;
        stopHttpPolling();
        updateTransport('websocket');
        reconnectAttemptRef.current = 0;
        setStatus('connected');
        setConnectionError(null);

        const activeConfig = configRef.current;
        ws.send(
          JSON.stringify({
            type: 'join',
            roomId: activeConfig.roomId,
            deviceId: activeConfig.deviceId,
            deviceName: activeConfig.deviceName,
            deviceRole: activeConfig.deviceRole,
            userRole: userRoleRef.current,
            initialMasterState:
              activeConfig.deviceRole === 'master' && userRoleRef.current === 'admin'
                ? getCurrentStateRef.current()
                : undefined,
          })
        );

        flushPendingQueueWs(ws);

        if (pingTimerRef.current) window.clearInterval(pingTimerRef.current);
        pingTimerRef.current = window.setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 25000);
      };

      ws.onmessage = (event) => {
        let msg: WsServerMessage;
        try {
          msg = JSON.parse(event.data) as WsServerMessage;
        } catch {
          return;
        }

        if (msg.type === 'pong') return;

        if (msg.type === 'init') {
          serverSeqRef.current = msg.seq;
          setServerSeq(msg.seq);
          setHasMasterSeed(Boolean(msg.hasMasterSeed));
          setConnectedDevices(msg.devices);
          setRecentEvents(msg.recentEvents);
          setLastSyncedAt(new Date().toISOString());

          if (msg.hasMasterSeed || configRef.current.deviceRole === 'staff') {
            applyFullStateRef.current(msg.state);
          }
          return;
        }

        if (msg.type === 'presence_update') {
          setConnectedDevices(msg.devices);
          return;
        }

        if (msg.type === 'mutation_ack') {
          serverSeqRef.current = msg.seq;
          setServerSeq(msg.seq);
          setLastSyncedAt(new Date().toISOString());
          return;
        }

        if (msg.type === 'mutation_broadcast') {
          serverSeqRef.current = msg.seq;
          setServerSeq(msg.seq);
          setLastSyncedAt(new Date().toISOString());
          setRecentEvents((prev) => [msg.activity, ...prev].slice(0, 60));

          if (msg.state) {
            applyFullStateRef.current(msg.state);
          } else {
            const current = getCurrentStateRef.current();
            const res = applyErpMutation(
              current,
              msg.envelope.action,
              processedPaymentIdsRef.current
            );
            if (res.applied) {
              applyFullStateRef.current(res.nextState);
            }
          }

          if (msg.envelope.actorDeviceId !== configRef.current.deviceId) {
            if (soundEnabledRef.current) {
              playNotificationChime();
            }
            onRemoteActivityRef.current(msg.activity);
          }
        }
      };

      ws.onclose = async () => {
        if (pingTimerRef.current) {
          window.clearInterval(pingTimerRef.current);
          pingTimerRef.current = null;
        }
        if (unmounted) return;

        // If WebSocket couldn't establish, try HTTPS REST Sync Fallback before failing
        if (!wsOpened) {
          const probe = await probeServerHealth(httpBase);
          if (unmounted) return;

          if (probe.ok) {
            const startedHttp = await startHttpFallbackSync(httpBase);
            if (startedHttp) return;
          } else {
            setConnectionError(probe.message);
          }
        }

        updateTransport('none');
        setStatus('reconnecting');
        const delay = Math.min(12000, 1500 * Math.pow(1.5, reconnectAttemptRef.current));
        reconnectAttemptRef.current += 1;
        reconnectTimerRef.current = window.setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      unmounted = true;
      stopHttpPolling();
      if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
      if (pingTimerRef.current) window.clearInterval(pingTimerRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [
    isAppLoaded,
    config.roomId,
    config.syncServerUrl,
    connectTrigger,
    flushPendingQueueWs,
    flushPendingQueueHttp,
    probeServerHealth,
  ]);

  // Update presence whenever user role or device role changes
  useEffect(() => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: 'update_presence',
          roomId: config.roomId,
          deviceId: config.deviceId,
          deviceName: config.deviceName,
          deviceRole: config.deviceRole,
          userRole: currentUserRole,
        })
      );
    }
  }, [config.roomId, config.deviceId, config.deviceName, config.deviceRole, currentUserRole]);

  const updateSyncConfig = useCallback((partial: Partial<SyncConfig>) => {
    setConfig((prev) => {
      const next: SyncConfig = {
        ...prev,
        ...partial,
        roomId: (partial.roomId ?? prev.roomId).trim() || 'tej-food-main',
      };
      try {
        localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
    reconnectAttemptRef.current = 0;
  }, []);

  const reconnectNow = useCallback(() => {
    reconnectAttemptRef.current = 0;
    setConnectionError(null);
    setConnectTrigger((prev) => prev + 1);
  }, []);

  const dispatchMutation = useCallback(
    (action: ErpMutationAction, actorNameOverride?: string) => {
      const current = getCurrentStateRef.current();
      const res = applyErpMutation(current, action, processedPaymentIdsRef.current);
      if (res.applied) {
        applyFullStateRef.current(res.nextState);
      }

      const envelope: SyncMutationEnvelope = {
        mutationId: generateId('mut'),
        roomId: configRef.current.roomId,
        actorDeviceId: configRef.current.deviceId,
        actorName: actorNameOverride || configRef.current.deviceName,
        actorRole: userRoleRef.current,
        timestamp: new Date().toISOString(),
        action,
      };

      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'mutation', envelope }));
        return;
      }

      if (transportModeRef.current === 'http') {
        const httpBase = resolveHttpBase(configRef.current.syncServerUrl);
        fetch(`${httpBase}/api/sync/mutation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ envelope }),
        })
          .then((r) => {
            if (!r.ok) throw new Error('HTTP sync failed');
          })
          .catch(() => {
            const nextQueue = [...loadPendingQueue(), envelope];
            savePendingQueue(nextQueue);
            setPendingCount(nextQueue.length);
          });
        return;
      }

      const nextQueue = [...loadPendingQueue(), envelope];
      savePendingQueue(nextQueue);
      setPendingCount(nextQueue.length);
    },
    []
  );

  const pushMasterStateNow = useCallback(() => {
    const current = getCurrentStateRef.current();
    dispatchMutation({ type: 'master:push_full_state', fullState: current });
  }, [dispatchMutation]);

  return {
    config,
    status,
    transportMode,
    connectionError,
    hasMasterSeed,
    connectedDevices,
    recentEvents,
    serverSeq,
    pendingCount,
    lastSyncedAt,
    soundEnabled,
    setSoundEnabled,
    updateSyncConfig,
    reconnectNow,
    probeServerHealth,
    dispatchMutation,
    pushMasterStateNow,
  };
}
