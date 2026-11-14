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

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
  const [connectedDevices, setConnectedDevices] = useState<ConnectedDevice[]>([]);
  const [recentEvents, setRecentEvents] = useState<LiveActivityEvent[]>([]);
  const [serverSeq, setServerSeq] = useState<number>(0);
  const [pendingCount, setPendingCount] = useState<number>(() => loadPendingQueue().length);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const pingTimerRef = useRef<number | null>(null);
  const reconnectAttemptRef = useRef<number>(0);
  const processedPaymentIdsRef = useRef<Set<string>>(new Set());

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

  const flushPendingQueue = useCallback((ws: WebSocket) => {
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

  useEffect(() => {
    if (!isAppLoaded) return;

    let unmounted = false;

    const connect = () => {
      if (unmounted) return;

      const isNativeShell =
        window.location.protocol === 'capacitor:' ||
        window.location.protocol === 'file:' ||
        (window.location.hostname === 'localhost' && window.location.port !== '3000');

      let wsUrl: string;
      if (isNativeShell && configRef.current.syncServerUrl) {
        const cleanBase = configRef.current.syncServerUrl.trim().replace(/\/+$/, '');
        wsUrl = cleanBase.replace(/^https:/i, 'wss:').replace(/^http:/i, 'ws:') + '/ws';
      } else {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl = `${protocol}//${window.location.host}/ws`;
      }

      setStatus(reconnectAttemptRef.current > 0 ? 'reconnecting' : 'connecting');

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (unmounted) {
          ws.close();
          return;
        }
        reconnectAttemptRef.current = 0;
        setStatus('connected');

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
              activeConfig.deviceRole === 'master'
                ? getCurrentStateRef.current()
                : undefined,
          })
        );

        flushPendingQueue(ws);

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
          setServerSeq(msg.seq);
          setConnectedDevices(msg.devices);
          setRecentEvents(msg.recentEvents);
          setLastSyncedAt(new Date().toISOString());

          // Reconcile state from authoritative server when server has seed or incoming updates
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
          setServerSeq(msg.seq);
          setLastSyncedAt(new Date().toISOString());
          return;
        }

        if (msg.type === 'mutation_broadcast') {
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

      ws.onclose = () => {
        if (pingTimerRef.current) {
          window.clearInterval(pingTimerRef.current);
          pingTimerRef.current = null;
        }
        if (unmounted) return;
        setStatus('reconnecting');
        const delay = Math.min(10000, 1000 * Math.pow(1.6, reconnectAttemptRef.current));
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
      if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
      if (pingTimerRef.current) window.clearInterval(pingTimerRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [isAppLoaded, config.roomId, config.syncServerUrl, flushPendingQueue]);

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
      } else {
        const nextQueue = [...loadPendingQueue(), envelope];
        savePendingQueue(nextQueue);
        setPendingCount(nextQueue.length);
      }
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
    connectedDevices,
    recentEvents,
    serverSeq,
    pendingCount,
    lastSyncedAt,
    soundEnabled,
    setSoundEnabled,
    updateSyncConfig,
    dispatchMutation,
    pushMasterStateNow,
  };
}
