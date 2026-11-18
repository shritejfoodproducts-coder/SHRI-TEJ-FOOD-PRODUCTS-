import { useCallback, useEffect, useRef, useState } from 'react';
import {
  browserPopupRedirectResolver,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import {
  auth,
  BOOTSTRAP_ADMIN_EMAIL,
  db,
  FIREBASE_PROJECT_ID,
  googleProvider,
  handleFirestoreError,
  OperationType,
  stripUndefinedDeep,
  testFirestoreConnection,
} from '../firebase';
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
} from '../data/initialData';
import { loadStateFromStorage, saveStateToStorage } from '../utils/backup';
import { applyErpMutation } from '../../shared/erpSyncReducer';
import type {
  ConnectedDevice,
  ErpMutationAction,
  LiveActivityEvent,
  SyncableErpState,
  SyncDeviceRole,
} from '../../shared/erpSyncTypes';
import type {
  BagStockItem,
  CompanySettings,
  Customer,
  ExpenseRecord,
  Order,
  ProductionBatch,
  ProductMaster,
  RawMaterialStock,
  UserProfile,
  UserRole,
} from '../types/erp';

const SYNC_CONFIG_KEY = 'tej_erp_sync_config_v1';

export interface FirestoreSyncConfig {
  roomId: string;
  deviceId: string;
  deviceName: string;
  deviceRole: SyncDeviceRole;
  syncServerUrl?: string;
}

export type SyncConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'offline';
export type SyncTransportMode = 'firestore' | 'none';

export interface ServerProbeResult {
  ok: boolean;
  message: string;
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeRoomId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48) || 'tej-food-main';
}

function getInitialSyncConfig(): FirestoreSyncConfig {
  let saved: Partial<FirestoreSyncConfig> = {};
  try {
    const raw = localStorage.getItem(SYNC_CONFIG_KEY);
    if (raw) saved = JSON.parse(raw);
  } catch {
    // ignore
  }

  let urlRoom: string | null = null;
  let urlMode: string | null = null;
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    urlRoom = params.get('syncRoom');
    urlMode = params.get('mode');
  }

  const deviceId = saved.deviceId || generateId('dev');
  const roomId = sanitizeRoomId(urlRoom || saved.roomId || 'tej-food-main');
  const deviceRole: SyncDeviceRole =
    urlMode === 'staff'
      ? 'staff'
      : urlMode === 'master'
        ? 'master'
        : saved.deviceRole || 'master';

  const deviceName =
    saved.deviceName ||
    (deviceRole === 'master' ? 'मालिक मुख्य मोबाइल (Owner Host)' : 'स्टाफ मोबाइल');

  const finalConfig: FirestoreSyncConfig = {
    roomId,
    deviceId,
    deviceName,
    deviceRole,
    syncServerUrl: saved.syncServerUrl,
  };

  try {
    localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(finalConfig));
  } catch {
    // ignore
  }

  return finalConfig;
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
    // ignore autoplay restriction
  }
}

export interface AuthEnvironmentInfo {
  isIframe: boolean;
  isCapacitorNative: boolean;
  isStandalonePwa: boolean;
  isMobileDevice: boolean;
  isInAppBrowser: boolean;
  currentHost: string;
}

function detectAuthEnvironment(): AuthEnvironmentInfo {
  if (typeof window === 'undefined') {
    return {
      isIframe: false,
      isCapacitorNative: false,
      isStandalonePwa: false,
      isMobileDevice: false,
      isInAppBrowser: false,
      currentHost: '',
    };
  }

  let isIframe = false;
  try {
    isIframe = window.self !== window.top;
  } catch {
    isIframe = true;
  }

  const winCap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  const isCapacitorNative =
    window.location.protocol === 'capacitor:' ||
    window.location.protocol === 'file:' ||
    Boolean(winCap?.isNativePlatform?.());

  const isStandalonePwa =
    Boolean(window.matchMedia?.('(display-mode: standalone)').matches) ||
    Boolean((navigator as unknown as { standalone?: boolean }).standalone);

  const ua = navigator.userAgent || '';
  const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(ua);
  const isInAppBrowser = /\bwv\b|WebView|FBAN|FBAV|Instagram|WhatsApp|Line\//i.test(ua);

  return {
    isIframe,
    isCapacitorNative,
    isStandalonePwa,
    isMobileDevice,
    isInAppBrowser,
    currentHost: window.location.hostname || '',
  };
}

function mapFirebaseAuthError(error: unknown): { message: string; unauthorizedHost: string | null } {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code || '')
      : '';
  const rawMsg = error instanceof Error ? error.message : String(error || '');

  if (code === 'auth/popup-blocked') {
    return {
      message:
        'ब्राउज़र ने Google साइन-इन पॉपअप ब्लॉक कर दिया है। पॉपअप Allow करें या नीचे "Redirect से साइन इन" बटन दबाएं।',
      unauthorizedHost: null,
    };
  }
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return {
      message:
        'Google साइन-इन पॉपअप पूरा होने से पहले बंद हो गया। यदि Chrome पेज पर "The requested action is invalid" आए, तो नीचे "Redirect से साइन इन" या "Chrome में पूरा पेज खोलें" विकल्प अपनाएं।',
      unauthorizedHost: null,
    };
  }
  if (code === 'auth/unauthorized-domain') {
    const currentHost =
      typeof window !== 'undefined' ? window.location.hostname || window.location.origin : '';
    return {
      message: currentHost
        ? `यह डोमेन (${currentHost}) Firebase Auth Authorized Domains में जुड़ा नहीं है।`
        : 'यह डोमेन Firebase Auth Authorized Domains में जुड़ा नहीं है। कृपया Firebase Console में इस डोमेन को जोड़ें।',
      unauthorizedHost: currentHost || 'unknown-domain',
    };
  }
  if (
    code === 'auth/bad-request' ||
    code === 'auth/missing-initial-state' ||
    code === 'auth/operation-not-supported-in-this-environment' ||
    rawMsg.toLowerCase().includes('requested action is invalid') ||
    rawMsg.toLowerCase().includes('missing initial state')
  ) {
    return {
      message:
        'मोबाइल/PWA या इन-ऐप ब्राउज़र में पॉपअप सेशन टूटने के कारण Google साइन-इन पूरा नहीं हो सका ("The requested action is invalid")। कृपया ऐप को सीधे Chrome ब्राउज़र में खोलकर साइन इन करें।',
      unauthorizedHost: null,
    };
  }
  if (code === 'auth/network-request-failed') {
    return {
      message: 'नेटवर्क कनेक्शन नहीं मिल रहा। कृपया मोबाइल डेटा या Wi-Fi जांचें।',
      unauthorizedHost: null,
    };
  }
  return {
    message: rawMsg || 'Google साइन-इन में त्रुटि हुई।',
    unauthorizedHost: null,
  };
}

function buildDefaultState(): SyncableErpState {
  return {
    version: '2.5.0',
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

async function commitOperationsInChunks(
  ops: Array<(batch: ReturnType<typeof writeBatch>) => void>
): Promise<void> {
  const CHUNK_SIZE = 400;
  for (let i = 0; i < ops.length; i += CHUNK_SIZE) {
    const batch = writeBatch(db);
    const slice = ops.slice(i, i + CHUNK_SIZE);
    slice.forEach((fn) => fn(batch));
    await batch.commit();
  }
}

interface UseFirestoreErpSyncOptions {
  currentUserRole: UserRole;
  isAuthenticatedInErp: boolean;
  onRemoteActivity: (event: LiveActivityEvent) => void;
}

export function useFirestoreErpSync({
  currentUserRole,
  isAuthenticatedInErp,
  onRemoteActivity,
}: UseFirestoreErpSyncOptions) {
  const [config, setConfig] = useState<FirestoreSyncConfig>(() => getInitialSyncConfig());
  const [authEnv] = useState<AuthEnvironmentInfo>(() => detectAuthEnvironment());
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [unauthorizedDomainHost, setUnauthorizedDomainHost] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);

  const [firestoreReady, setFirestoreReady] = useState<boolean>(false);
  const [status, setStatus] = useState<SyncConnectionStatus>('connecting');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState<boolean>(false);

  const [initialLocal] = useState<SyncableErpState>(() => {
    const saved = loadStateFromStorage();
    const defaults = buildDefaultState();
    if (!saved) return defaults;
    return {
      version: saved.version || defaults.version,
      timestamp: saved.timestamp || defaults.timestamp,
      settings: saved.settings || defaults.settings,
      products: Array.isArray(saved.products) && saved.products.length > 0 ? saved.products : defaults.products,
      rawStock: saved.rawStock || defaults.rawStock,
      bagStock: Array.isArray(saved.bagStock) && saved.bagStock.length > 0 ? saved.bagStock : defaults.bagStock,
      customers: Array.isArray(saved.customers) ? saved.customers : defaults.customers,
      orders: Array.isArray(saved.orders) ? saved.orders : defaults.orders,
      production: Array.isArray(saved.production) ? saved.production : defaults.production,
      expenses: Array.isArray(saved.expenses) ? saved.expenses : defaults.expenses,
      staff: Array.isArray(saved.staff) && saved.staff.length > 0 ? saved.staff : defaults.staff,
    };
  });

  const [settings, setSettings] = useState<CompanySettings>(initialLocal.settings);
  const [products, setProducts] = useState<ProductMaster[]>(initialLocal.products);
  const [rawStock, setRawStock] = useState<RawMaterialStock>(initialLocal.rawStock);
  const [bagStock, setBagStock] = useState<BagStockItem[]>(initialLocal.bagStock);
  const [customers, setCustomers] = useState<Customer[]>(initialLocal.customers);
  const [orders, setOrders] = useState<Order[]>(initialLocal.orders);
  const [production, setProduction] = useState<ProductionBatch[]>(initialLocal.production);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(initialLocal.expenses);
  const [staff, setStaff] = useState<UserProfile[]>(initialLocal.staff);

  const [connectedDevices, setConnectedDevices] = useState<ConnectedDevice[]>([]);
  const [recentEvents, setRecentEvents] = useState<LiveActivityEvent[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [connectTrigger, setConnectTrigger] = useState<number>(0);

  const processedPaymentIdsRef = useRef<Set<string>>(new Set());
  const seenInitialActivityRef = useRef<boolean>(false);
  const seenActivityIdsRef = useRef<Set<string>>(new Set());
  const connectionTestedRef = useRef<boolean>(false);

  const configRef = useRef(config);
  configRef.current = config;
  const userRoleRef = useRef(currentUserRole);
  userRoleRef.current = currentUserRole;
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;
  const onRemoteActivityRef = useRef(onRemoteActivity);
  onRemoteActivityRef.current = onRemoteActivity;
  const firebaseUserRef = useRef(firebaseUser);
  firebaseUserRef.current = firebaseUser;

  const liveStateRef = useRef<SyncableErpState>(buildDefaultState());
  liveStateRef.current = {
    version: '2.5.0',
    timestamp: new Date().toISOString(),
    settings,
    products,
    rawStock,
    bagStock,
    customers,
    orders,
    production,
    expenses,
    staff,
  };

  // 1. Firebase Auth Listener + Redirect Result Handler
  useEffect(() => {
    let active = true;

    getRedirectResult(auth, browserPopupRedirectResolver).catch((err) => {
      if (!active) return;
      const mapped = mapFirebaseAuthError(err);
      if (mapped.message) {
        setAuthError(mapped.message);
        setUnauthorizedDomainHost(mapped.unauthorizedHost);
      }
    });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setAuthReady(true);

      if (user) {
        setAuthError(null);
        setUnauthorizedDomainHost(null);
        setAccessDenied(false);
        if (!connectionTestedRef.current) {
          connectionTestedRef.current = true;
          const online = await testFirestoreConnection();
          if (!online) {
            setStatus('offline');
            setConnectionError(
              'इंटरनेट कनेक्शन नहीं मिल रहा या Firebase तक पहुँच बंद है।'
            );
          }
        }

        // Ensure /users/{uid} record exists
        try {
          const userRef = doc(db, 'users', user.uid);
          const snap = await getDoc(userRef);
          const emailLower = (user.email || '').trim().toLowerCase();
          const isOwnerEmail = emailLower === BOOTSTRAP_ADMIN_EMAIL;
          if (!snap.exists()) {
            await setDoc(
              userRef,
              stripUndefinedDeep({
                uid: user.uid,
                email: emailLower,
                displayName: user.displayName || 'Factory User',
                photoURL: user.photoURL || '',
                role: isOwnerEmail ? 'admin' : 'staff',
                factoryId: configRef.current.roomId,
                createdAt: new Date().toISOString(),
                lastLoginAt: new Date().toISOString(),
              })
            );
          } else {
            await setDoc(
              userRef,
              stripUndefinedDeep({
                uid: user.uid,
                email: emailLower,
                displayName: user.displayName || snap.data().displayName || 'Factory User',
                photoURL: user.photoURL || '',
                role: snap.data().role || (isOwnerEmail ? 'admin' : 'staff'),
                factoryId: configRef.current.roomId,
                lastLoginAt: new Date().toISOString(),
              }),
              { merge: true }
            );
          }
        } catch (err) {
          console.warn('User profile sync warning:', err);
        }
      } else {
        setFirestoreReady(false);
        setStatus('offline');
        setConnectedDevices([]);
        setRecentEvents([]);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const performGoogleSignIn = useCallback(
    async (preferRedirect = false) => {
      setIsSigningIn(true);
      setAuthError(null);
      setUnauthorizedDomainHost(null);
      setAccessDenied(false);

      const env = detectAuthEnvironment();

      if (env.isCapacitorNative) {
        setIsSigningIn(false);
        setAuthError(
          'Android APK (WebView) के अंदर Google Popup साइन-इन Chrome में जाने पर "The requested action is invalid" दे सकता है। कृपया नीचे दिए बटन से ऐप को सीधे Chrome ब्राउज़र में खोलकर Google Sign-In करें।'
        );
        return;
      }

      // In installed Standalone PWA (not inside an iframe), popup loses window.opener when Chrome opens; use redirect.
      const shouldUseRedirect = !env.isIframe && (preferRedirect || env.isStandalonePwa);

      if (shouldUseRedirect) {
        try {
          await signInWithRedirect(auth, googleProvider, browserPopupRedirectResolver);
          return;
        } catch (err) {
          const mapped = mapFirebaseAuthError(err);
          setAuthError(mapped.message);
          setUnauthorizedDomainHost(mapped.unauthorizedHost);
          setIsSigningIn(false);
          return;
        }
      }

      // Guard against Chrome external tab opening without closing/resolving popup opener
      let timedOut = false;
      const timeoutId = window.setTimeout(() => {
        timedOut = true;
        setIsSigningIn(false);
        setAuthError(
          'Google साइन-इन पॉपअप से जवाब नहीं मिला। यदि Chrome में नया टैब खुला है या "The requested action is invalid" दिख रहा है, तो कृपया नीचे "Chrome में पूरा पेज खोलें" या "Redirect से साइन इन" का उपयोग करें।'
        );
      }, 45000);

      try {
        await signInWithPopup(auth, googleProvider, browserPopupRedirectResolver);
      } catch (err) {
        if (!timedOut) {
          const code =
            typeof err === 'object' && err !== null && 'code' in err
              ? String((err as { code?: unknown }).code || '')
              : '';
          // If popup is blocked in a top-level mobile browser, seamlessly try redirect
          if (
            !env.isIframe &&
            env.isMobileDevice &&
            (code === 'auth/popup-blocked' ||
              code === 'auth/operation-not-supported-in-this-environment')
          ) {
            try {
              await signInWithRedirect(auth, googleProvider, browserPopupRedirectResolver);
              return;
            } catch (redirectErr) {
              const mappedRedirect = mapFirebaseAuthError(redirectErr);
              setAuthError(mappedRedirect.message);
              setUnauthorizedDomainHost(mappedRedirect.unauthorizedHost);
              return;
            }
          }
          const mapped = mapFirebaseAuthError(err);
          setAuthError(mapped.message);
          setUnauthorizedDomainHost(mapped.unauthorizedHost);
        }
      } finally {
        window.clearTimeout(timeoutId);
        if (!timedOut) {
          setIsSigningIn(false);
        }
      }
    },
    []
  );

  const signInWithGoogle = useCallback(async () => {
    await performGoogleSignIn(false);
  }, [performGoogleSignIn]);

  const signInWithGoogleRedirect = useCallback(async () => {
    await performGoogleSignIn(true);
  }, [performGoogleSignIn]);

  const signOutGoogle = useCallback(async () => {
    try {
      await signOut(auth);
      setFirestoreReady(false);
      setAccessDenied(false);
      setConnectionError(null);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  }, []);

  const writeFullWorkspaceToFirestore = useCallback(
    async (roomId: string, fullState: SyncableErpState, uid: string, email: string) => {
      const nowIso = new Date().toISOString();
      const factoryRef = doc(db, 'factories', roomId);
      const ops: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];

      ops.push((batch) => {
        batch.set(
          factoryRef,
          stripUndefinedDeep({
            roomId,
            version: fullState.version || '2.5.0',
            ownerUid: uid,
            ownerEmail: email.toLowerCase(),
            timestamp: nowIso,
            settings: fullState.settings,
            products: fullState.products,
            rawStock: fullState.rawStock,
            bagStock: fullState.bagStock,
          })
        );
      });

      const emailSet = new Map<string, { role: 'admin' | 'staff'; staffId?: string }>();
      emailSet.set(BOOTSTRAP_ADMIN_EMAIL, { role: 'admin', staffId: 'staff-1' });
      if (email) {
        emailSet.set(email.toLowerCase(), { role: 'admin' });
      }
      for (const member of fullState.staff) {
        if (member.email && member.email.includes('@')) {
          const lower = member.email.trim().toLowerCase();
          if (!emailSet.has(lower)) {
            emailSet.set(lower, {
              role: member.role === 'admin' ? 'admin' : 'staff',
              staffId: member.id,
            });
          }
        }
      }

      emailSet.forEach((info, mail) => {
        ops.push((batch) => {
          batch.set(
            doc(db, 'factories', roomId, 'authorizedUsers', mail),
            stripUndefinedDeep({
              email: mail,
              role: info.role,
              staffId: info.staffId || '',
              addedByUid: uid,
              createdAt: nowIso,
            })
          );
        });
      });

      for (const customer of fullState.customers) {
        ops.push((batch) => {
          batch.set(
            doc(db, 'factories', roomId, 'customers', customer.id),
            stripUndefinedDeep({ ...customer, updatedAt: nowIso })
          );
        });
      }

      for (const order of fullState.orders) {
        ops.push((batch) => {
          batch.set(
            doc(db, 'factories', roomId, 'orders', order.id),
            stripUndefinedDeep({ ...order, createdByUid: uid, updatedAt: nowIso })
          );
        });
      }

      for (const batchRec of fullState.production) {
        ops.push((batch) => {
          batch.set(
            doc(db, 'factories', roomId, 'production', batchRec.id),
            stripUndefinedDeep({ ...batchRec, createdByUid: uid, updatedAt: nowIso })
          );
        });
      }

      for (const exp of fullState.expenses) {
        ops.push((batch) => {
          batch.set(
            doc(db, 'factories', roomId, 'expenses', exp.id),
            stripUndefinedDeep({ ...exp, createdByUid: uid, updatedAt: nowIso })
          );
        });
      }

      for (const member of fullState.staff) {
        ops.push((batch) => {
          batch.set(
            doc(db, 'factories', roomId, 'staff', member.id),
            stripUndefinedDeep({ ...member, updatedAt: nowIso })
          );
        });
      }

      await commitOperationsInChunks(ops);
    },
    []
  );

  // 2. Real-time Firestore onSnapshot Listeners (only when Firebase Auth is ready & signed in)
  useEffect(() => {
    if (!authReady || !firebaseUser) {
      return;
    }

    let cancelled = false;
    const unsubscribes: Array<() => void> = [];
    const roomId = sanitizeRoomId(config.roomId);
    const factoryRef = doc(db, 'factories', roomId);

    seenInitialActivityRef.current = false;
    seenActivityIdsRef.current = new Set();
    setStatus('connecting');
    setConnectionError(null);
    setAccessDenied(false);

    const setupRealtimeListeners = async () => {
      try {
        const factorySnap = await getDoc(factoryRef);
        if (cancelled) return;

        if (!factorySnap.exists()) {
          const emailLower = (firebaseUser.email || '').trim().toLowerCase();
          const canSeedRoom =
            emailLower === BOOTSTRAP_ADMIN_EMAIL || roomId !== 'tej-food-main';

          if (!canSeedRoom) {
            setAccessDenied(true);
            setStatus('offline');
            setConnectionError(
              `फ़ैक्ट्री रूम "${roomId}" अभी शुरू नहीं हुआ है। कृपया पहले मालिक के ईमेल (${BOOTSTRAP_ADMIN_EMAIL}) से लॉगिन करें।`
            );
            return;
          }

          // Migrate legacy localStorage data if present on first cloud seed, else defaults
          const legacySaved = loadStateFromStorage();
          const seedSource: SyncableErpState = legacySaved
            ? {
                version: '2.5.0',
                timestamp: new Date().toISOString(),
                settings: legacySaved.settings || INITIAL_SETTINGS,
                products: legacySaved.products || INITIAL_PRODUCTS,
                rawStock: legacySaved.rawStock || INITIAL_RAW_STOCK,
                bagStock: legacySaved.bagStock || INITIAL_BAG_STOCK,
                customers: legacySaved.customers || INITIAL_CUSTOMERS,
                orders: legacySaved.orders || INITIAL_ORDERS,
                production: legacySaved.production || INITIAL_PRODUCTION,
                expenses: legacySaved.expenses || INITIAL_EXPENSES,
                staff: legacySaved.staff || INITIAL_STAFF,
              }
            : buildDefaultState();

          await writeFullWorkspaceToFirestore(
            roomId,
            seedSource,
            firebaseUser.uid,
            emailLower
          );
        }
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('insufficient')) {
          setAccessDenied(true);
          setStatus('offline');
          setConnectionError(
            `ईमेल ${firebaseUser.email} को रूम "${roomId}" की अनुमति नहीं है। एडमिन से स्टाफ लिस्ट में यह ईमेल जोड़ने को कहें।`
          );
          return;
        }
        setStatus('offline');
        setConnectionError('Firestore से जुड़ने में समस्या आ रही है। कृपया इंटरनेट जांचें।');
        return;
      }

      if (cancelled) return;

      const handleSnapshotError = (path: string) => (err: unknown) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.toLowerCase().includes('permission')) {
          setAccessDenied(true);
          setStatus('offline');
          setConnectionError(
            `ईमेल ${firebaseUser.email} को "${roomId}" डेटा पढ़ने की अनुमति नहीं है।`
          );
        } else {
          setStatus('reconnecting');
          setConnectionError(`रियल-टाइम सिंक त्रुटि (${path}): ${msg}`);
        }
      };

      // Listener 1: Factory Root Doc (settings, products, rawStock, bagStock)
      unsubscribes.push(
        onSnapshot(
          factoryRef,
          (snap) => {
            if (!snap.exists()) return;
            const data = snap.data() as Partial<SyncableErpState>;
            if (data.settings) setSettings(data.settings);
            if (data.products) setProducts(data.products);
            if (data.rawStock) setRawStock(data.rawStock);
            if (data.bagStock) setBagStock(data.bagStock);
            setStatus('connected');
            setConnectionError(null);
            setFirestoreReady(true);
            setLastSyncedAt(new Date().toISOString());
          },
          handleSnapshotError(`factories/${roomId}`)
        )
      );

      // Listener 2: Customers
      unsubscribes.push(
        onSnapshot(
          collection(db, 'factories', roomId, 'customers'),
          (snap) => {
            const list = snap.docs.map((d) => d.data() as Customer);
            list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            setCustomers(list);
            setLastSyncedAt(new Date().toISOString());
          },
          handleSnapshotError(`factories/${roomId}/customers`)
        )
      );

      // Listener 3: Orders
      unsubscribes.push(
        onSnapshot(
          collection(db, 'factories', roomId, 'orders'),
          (snap) => {
            const list = snap.docs.map((d) => d.data() as Order);
            list.sort((a, b) => {
              const cmp = (b.date || '').localeCompare(a.date || '');
              return cmp !== 0 ? cmp : (b.id || '').localeCompare(a.id || '');
            });
            setOrders(list);
            setLastSyncedAt(new Date().toISOString());
          },
          handleSnapshotError(`factories/${roomId}/orders`)
        )
      );

      // Listener 4: Production Batches
      unsubscribes.push(
        onSnapshot(
          collection(db, 'factories', roomId, 'production'),
          (snap) => {
            const list = snap.docs.map((d) => d.data() as ProductionBatch);
            list.sort((a, b) => {
              const cmp = (b.date || '').localeCompare(a.date || '');
              return cmp !== 0 ? cmp : (b.id || '').localeCompare(a.id || '');
            });
            setProduction(list);
            setLastSyncedAt(new Date().toISOString());
          },
          handleSnapshotError(`factories/${roomId}/production`)
        )
      );

      // Listener 5: Expenses
      unsubscribes.push(
        onSnapshot(
          collection(db, 'factories', roomId, 'expenses'),
          (snap) => {
            const list = snap.docs.map((d) => d.data() as ExpenseRecord);
            list.sort((a, b) => {
              const cmp = (b.date || '').localeCompare(a.date || '');
              return cmp !== 0 ? cmp : (b.id || '').localeCompare(a.id || '');
            });
            setExpenses(list);
            setLastSyncedAt(new Date().toISOString());
          },
          handleSnapshotError(`factories/${roomId}/expenses`)
        )
      );

      // Listener 6: Staff Directory
      unsubscribes.push(
        onSnapshot(
          collection(db, 'factories', roomId, 'staff'),
          (snap) => {
            const list = snap.docs.map((d) => d.data() as UserProfile);
            list.sort((a, b) => (a.id || '').localeCompare(b.id || ''));
            setStaff(list);
            setLastSyncedAt(new Date().toISOString());
          },
          handleSnapshotError(`factories/${roomId}/staff`)
        )
      );

      // Listener 7: Processed Payment IDs
      unsubscribes.push(
        onSnapshot(
          collection(db, 'factories', roomId, 'payments'),
          (snap) => {
            const nextSet = new Set<string>();
            snap.docs.forEach((d) => nextSet.add(d.id));
            processedPaymentIdsRef.current = nextSet;
          },
          handleSnapshotError(`factories/${roomId}/payments`)
        )
      );

      // Listener 8: Connected Mobile Devices Presence
      unsubscribes.push(
        onSnapshot(
          collection(db, 'factories', roomId, 'devices'),
          (snap) => {
            const nowMs = Date.now();
            const activeCutoff = nowMs - 1000 * 60 * 60 * 12; // Last 12 hours
            const list = snap.docs
              .map((d) => d.data() as ConnectedDevice)
              .filter((d) => {
                const seenMs = Date.parse(d.lastSeenAt || '');
                return Number.isNaN(seenMs) || seenMs >= activeCutoff;
              })
              .sort((a, b) => (b.lastSeenAt || '').localeCompare(a.lastSeenAt || ''));
            setConnectedDevices(list);
          },
          handleSnapshotError(`factories/${roomId}/devices`)
        )
      );

      // Listener 9: Live Activity Events (triggers instant remote toast on other mobiles)
      const activityQ = query(
        collection(db, 'factories', roomId, 'activity'),
        orderBy('timestamp', 'desc'),
        limit(40)
      );
      unsubscribes.push(
        onSnapshot(
          activityQ,
          (snap) => {
            const events = snap.docs.map((d) => d.data() as LiveActivityEvent);
            setRecentEvents(events);

            if (!seenInitialActivityRef.current) {
              events.forEach((ev) => seenActivityIdsRef.current.add(ev.id));
              seenInitialActivityRef.current = true;
              return;
            }

            snap.docChanges().forEach((change) => {
              if (change.type === 'added') {
                const evt = change.doc.data() as LiveActivityEvent;
                if (!seenActivityIdsRef.current.has(evt.id)) {
                  seenActivityIdsRef.current.add(evt.id);
                  if (evt.actorDeviceId !== configRef.current.deviceId) {
                    if (soundEnabledRef.current) playNotificationChime();
                    onRemoteActivityRef.current(evt);
                  }
                }
              }
            });
          },
          handleSnapshotError(`factories/${roomId}/activity`)
        )
      );

      // Register / Heartbeat Device Presence
      const registerPresence = async () => {
        try {
          const cfg = configRef.current;
          const nowIso = new Date().toISOString();
          const devRef = doc(db, 'factories', roomId, 'devices', cfg.deviceId);
          await setDoc(
            devRef,
            stripUndefinedDeep({
              deviceId: cfg.deviceId,
              deviceName: cfg.deviceName,
              deviceRole: cfg.deviceRole,
              userRole: userRoleRef.current,
              uid: firebaseUser.uid,
              connectedAt: nowIso,
              lastSeenAt: nowIso,
            }),
            { merge: true }
          );
        } catch {
          // ignore transient presence errors
        }
      };

      void registerPresence();
      const heartbeatId = window.setInterval(registerPresence, 60000);
      unsubscribes.push(() => window.clearInterval(heartbeatId));
    };

    void setupRealtimeListeners();

    return () => {
      cancelled = true;
      unsubscribes.forEach((fn) => {
        try {
          fn();
        } catch {
          // ignore
        }
      });
    };
  }, [authReady, firebaseUser, config.roomId, connectTrigger, writeFullWorkspaceToFirestore]);

  // Keep a local mirror of live ERP state so Direct Mobile+Password login works offline & across refreshes
  useEffect(() => {
    saveStateToStorage({
      version: '2.5.0',
      timestamp: new Date().toISOString(),
      settings,
      products,
      rawStock,
      bagStock,
      customers,
      orders,
      production,
      expenses,
      staff,
    });
  }, [settings, products, rawStock, bagStock, customers, orders, production, expenses, staff]);

  // 2B. Server HTTP Sync Fallback when logged in directly via Mobile+Password (no Google Auth)
  const serverSeqRef = useRef<number>(-1);
  const applyLocalFullState = useCallback((next: SyncableErpState) => {
    if (next.settings) setSettings(next.settings);
    if (Array.isArray(next.products)) setProducts(next.products);
    if (next.rawStock) setRawStock(next.rawStock);
    if (Array.isArray(next.bagStock)) setBagStock(next.bagStock);
    if (Array.isArray(next.customers)) setCustomers(next.customers);
    if (Array.isArray(next.orders)) setOrders(next.orders);
    if (Array.isArray(next.production)) setProduction(next.production);
    if (Array.isArray(next.expenses)) setExpenses(next.expenses);
    if (Array.isArray(next.staff) && next.staff.length > 0) setStaff(next.staff);
  }, []);

  const resolveSyncApiBase = useCallback(() => {
    if (typeof window === 'undefined') return '';
    if (authEnv.isCapacitorNative) {
      return (
        configRef.current.syncServerUrl ||
        'https://ais-pre-yevywmvpbfmbyiknv4vkin-325769928556.asia-northeast1.run.app'
      )
        .trim()
        .replace(/\/+$/, '');
    }
    return '';
  }, [authEnv.isCapacitorNative]);

  useEffect(() => {
    if (!authReady || firebaseUser) return;

    let cancelled = false;
    const roomId = sanitizeRoomId(config.roomId);
    const base = resolveSyncApiBase();

    const joinAndPoll = async () => {
      try {
        const joinRes = await fetch(`${base}/api/sync/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId,
            deviceId: configRef.current.deviceId,
            deviceName: configRef.current.deviceName,
            deviceRole: configRef.current.deviceRole,
            userRole: userRoleRef.current,
            initialMasterState:
              configRef.current.deviceRole === 'master' ? liveStateRef.current : undefined,
          }),
        });
        if (!joinRes.ok || cancelled) {
          if (!cancelled) setStatus('offline');
          return;
        }
        const json = (await joinRes.json()) as {
          ok?: boolean;
          seq?: number;
          hasMasterSeed?: boolean;
          state?: SyncableErpState;
          devices?: ConnectedDevice[];
          recentEvents?: LiveActivityEvent[];
        };
        if (cancelled || !json?.ok) return;
        serverSeqRef.current = typeof json.seq === 'number' ? json.seq : 0;
        if (json.hasMasterSeed && json.state) {
          applyLocalFullState(json.state);
        }
        if (Array.isArray(json.devices)) setConnectedDevices(json.devices);
        if (Array.isArray(json.recentEvents)) setRecentEvents(json.recentEvents);
        setStatus('connected');
        setConnectionError(null);
        setLastSyncedAt(new Date().toISOString());
      } catch {
        if (!cancelled) {
          setStatus('offline');
        }
      }
    };

    void joinAndPoll();

    const pollTimer = window.setInterval(async () => {
      if (cancelled) return;
      try {
        const qs = new URLSearchParams({
          sinceSeq: String(serverSeqRef.current),
          deviceId: configRef.current.deviceId,
          deviceName: configRef.current.deviceName,
          deviceRole: configRef.current.deviceRole,
          userRole: userRoleRef.current,
        });
        const pollRes = await fetch(`${base}/api/sync/poll/${encodeURIComponent(roomId)}?${qs.toString()}`);
        if (!pollRes.ok || cancelled) return;
        const json = (await pollRes.json()) as {
          ok?: boolean;
          seq?: number;
          changed?: boolean;
          hasMasterSeed?: boolean;
          state?: SyncableErpState;
          devices?: ConnectedDevice[];
          recentEvents?: LiveActivityEvent[];
        };
        if (cancelled || !json?.ok) return;
        if (Array.isArray(json.devices)) setConnectedDevices(json.devices);
        if (Array.isArray(json.recentEvents)) setRecentEvents(json.recentEvents);
        if (json.changed && json.hasMasterSeed && json.state) {
          serverSeqRef.current = typeof json.seq === 'number' ? json.seq : serverSeqRef.current;
          applyLocalFullState(json.state);
          setLastSyncedAt(new Date().toISOString());
        }
        setStatus('connected');
      } catch {
        if (!cancelled) setStatus('offline');
      }
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(pollTimer);
    };
  }, [authReady, firebaseUser, config.roomId, connectTrigger, resolveSyncApiBase, applyLocalFullState]);

  // Update presence whenever user role or device identity changes
  useEffect(() => {
    if (!firebaseUser || !firestoreReady || accessDenied) return;
    const roomId = sanitizeRoomId(config.roomId);
    const devRef = doc(db, 'factories', roomId, 'devices', config.deviceId);
    setDoc(
      devRef,
      stripUndefinedDeep({
        deviceId: config.deviceId,
        deviceName: config.deviceName,
        deviceRole: config.deviceRole,
        userRole: isAuthenticatedInErp ? currentUserRole : 'guest',
        uid: firebaseUser.uid,
        connectedAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
      }),
      { merge: true }
    ).catch(() => {});
  }, [
    firebaseUser,
    firestoreReady,
    accessDenied,
    config.roomId,
    config.deviceId,
    config.deviceName,
    config.deviceRole,
    currentUserRole,
    isAuthenticatedInErp,
  ]);

  const updateSyncConfig = useCallback((partial: Partial<FirestoreSyncConfig>) => {
    setConfig((prev) => {
      const next: FirestoreSyncConfig = {
        ...prev,
        ...partial,
        roomId: sanitizeRoomId(partial.roomId ?? prev.roomId),
      };
      try {
        localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const reconnectNow = useCallback(() => {
    setConnectionError(null);
    setConnectTrigger((prev) => prev + 1);
  }, []);

  const probeServerHealth = useCallback(async (): Promise<ServerProbeResult> => {
    if (!firebaseUserRef.current) {
      try {
        const base = resolveSyncApiBase();
        const res = await fetch(`${base}/api/health`);
        if (res.ok) {
          return {
            ok: true,
            message: 'लोकल + सर्वर लाइव सिंक चालू है (डायरेक्ट मोबाइल+पासवर्ड मोड)।',
          };
        }
      } catch {
        // ignore
      }
      return {
        ok: true,
        message: 'ऑफ़लाइन/लोकल स्टोरेज मोड चालू है। क्लाउड सिंक के लिए Google से जुड़ सकते हैं।',
      };
    }
    const ok = await testFirestoreConnection();
    if (!ok) {
      return {
        ok: false,
        message: 'Firebase Firestore ऑफ़लाइन है। कृपया अपना मोबाइल डेटा या Wi-Fi जांचें।',
      };
    }
    return {
      ok: true,
      message: `Firebase Firestore (${FIREBASE_PROJECT_ID}) से लाइव कनेक्शन चालू है!`,
    };
  }, [resolveSyncApiBase]);

  // 3. Atomic Firestore / Local+Server Mutation Dispatcher
  const dispatchMutation = useCallback(
    async (action: ErpMutationAction, actorNameOverride?: string) => {
      const user = firebaseUserRef.current;
      const roomId = sanitizeRoomId(configRef.current.roomId);

      const currentState = liveStateRef.current;
      const res = applyErpMutation(
        currentState,
        action,
        processedPaymentIdsRef.current
      );
      if (!res.applied) return;

      const nowIso = new Date().toISOString();
      const evtId = generateId('act');
      const activityEvent: LiveActivityEvent = {
        id: evtId,
        seq: Date.now(),
        timestamp: nowIso,
        actorDeviceId: configRef.current.deviceId,
        actorName: actorNameOverride || configRef.current.deviceName,
        actorRole: userRoleRef.current,
        category: res.activityMeta?.category || 'sync',
        title: res.activityMeta?.title || 'डेटा अपडेट',
        detail: res.activityMeta?.detail || '',
      };

      // If logged in directly via Mobile + Password (no Firebase Google Auth yet), update local + Express server sync
      if (!user) {
        applyLocalFullState(res.nextState);
        saveStateToStorage(res.nextState);
        setRecentEvents((prev) => [activityEvent, ...prev].slice(0, 40));
        setLastSyncedAt(nowIso);

        try {
          const base = resolveSyncApiBase();
          const syncRes = await fetch(`${base}/api/sync/mutation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              envelope: {
                mutationId: evtId,
                roomId,
                actorDeviceId: configRef.current.deviceId,
                actorName: actorNameOverride || configRef.current.deviceName,
                actorRole: userRoleRef.current,
                timestamp: nowIso,
                action,
              },
            }),
          });
          if (syncRes.ok) {
            const data = (await syncRes.json()) as { seq?: number };
            if (typeof data.seq === 'number') {
              serverSeqRef.current = data.seq;
            }
            setStatus('connected');
          }
        } catch {
          // Safe offline/local persistence already succeeded above
        }
        return;
      }

      const factoryRef = doc(db, 'factories', roomId);
      const activityRef = doc(db, 'factories', roomId, 'activity', evtId);
      const batch = writeBatch(db);
      let handledViaBatch = true;

      try {
        switch (action.type) {
          case 'order:create': {
            const { order } = action;
            const createdOrder =
              res.nextState.orders.find((o) => o.id === order.id) || order;
            batch.set(
              doc(db, 'factories', roomId, 'orders', createdOrder.id),
              stripUndefinedDeep({ ...createdOrder, createdByUid: user.uid, updatedAt: nowIso })
            );
            const updatedCustomer = res.nextState.customers.find(
              (c) => c.id === order.customerId
            );
            if (updatedCustomer) {
              batch.set(
                doc(db, 'factories', roomId, 'customers', updatedCustomer.id),
                stripUndefinedDeep({ ...updatedCustomer, updatedAt: nowIso })
              );
            }
            batch.update(factoryRef, {
              bagStock: stripUndefinedDeep(res.nextState.bagStock),
              timestamp: nowIso,
            });
            break;
          }

          case 'order:update': {
            const { updatedOrder } = action;
            const resolvedOrder =
              res.nextState.orders.find((o) => o.id === updatedOrder.id) || updatedOrder;
            batch.set(
              doc(db, 'factories', roomId, 'orders', resolvedOrder.id),
              stripUndefinedDeep({ ...resolvedOrder, updatedAt: nowIso })
            );
            const updatedCustomer = res.nextState.customers.find(
              (c) => c.id === resolvedOrder.customerId
            );
            if (updatedCustomer) {
              batch.set(
                doc(db, 'factories', roomId, 'customers', updatedCustomer.id),
                stripUndefinedDeep({ ...updatedCustomer, updatedAt: nowIso })
              );
            }
            batch.update(factoryRef, {
              bagStock: stripUndefinedDeep(res.nextState.bagStock),
              timestamp: nowIso,
            });
            break;
          }

          case 'order:delete': {
            const existingOrder = currentState.orders.find((o) => o.id === action.orderId);
            batch.delete(doc(db, 'factories', roomId, 'orders', action.orderId));
            if (existingOrder) {
              const updatedCustomer = res.nextState.customers.find(
                (c) => c.id === existingOrder.customerId
              );
              if (updatedCustomer) {
                batch.set(
                  doc(db, 'factories', roomId, 'customers', updatedCustomer.id),
                  stripUndefinedDeep({ ...updatedCustomer, updatedAt: nowIso })
                );
              }
            }
            batch.update(factoryRef, {
              bagStock: stripUndefinedDeep(res.nextState.bagStock),
              timestamp: nowIso,
            });
            break;
          }

          case 'order:status': {
            const updatedOrder = res.nextState.orders.find((o) => o.id === action.orderId);
            if (updatedOrder) {
              batch.set(
                doc(db, 'factories', roomId, 'orders', updatedOrder.id),
                stripUndefinedDeep({ ...updatedOrder, updatedAt: nowIso })
              );
            }
            batch.update(factoryRef, {
              bagStock: stripUndefinedDeep(res.nextState.bagStock),
              timestamp: nowIso,
            });
            break;
          }

          case 'payment:receive': {
            const { payment } = action;
            batch.set(
              doc(db, 'factories', roomId, 'payments', payment.id),
              stripUndefinedDeep({ ...payment, createdByUid: user.uid })
            );
            const updatedCustomer = res.nextState.customers.find(
              (c) => c.id === payment.customerId
            );
            if (updatedCustomer) {
              batch.set(
                doc(db, 'factories', roomId, 'customers', updatedCustomer.id),
                stripUndefinedDeep({ ...updatedCustomer, updatedAt: nowIso })
              );
            }
            break;
          }

          case 'customer:create':
          case 'customer:update': {
            batch.set(
              doc(db, 'factories', roomId, 'customers', action.customer.id),
              stripUndefinedDeep({ ...action.customer, updatedAt: nowIso })
            );
            break;
          }

          case 'customer:delete': {
            batch.delete(doc(db, 'factories', roomId, 'customers', action.customerId));
            break;
          }

          case 'production:create': {
            batch.set(
              doc(db, 'factories', roomId, 'production', action.batch.id),
              stripUndefinedDeep({
                ...action.batch,
                createdByUid: user.uid,
                updatedAt: nowIso,
              })
            );
            batch.update(factoryRef, {
              rawStock: stripUndefinedDeep(res.nextState.rawStock),
              bagStock: stripUndefinedDeep(res.nextState.bagStock),
              timestamp: nowIso,
            });
            break;
          }

          case 'production:update': {
            batch.set(
              doc(db, 'factories', roomId, 'production', action.updatedBatch.id),
              stripUndefinedDeep({ ...action.updatedBatch, updatedAt: nowIso })
            );
            batch.update(factoryRef, {
              rawStock: stripUndefinedDeep(res.nextState.rawStock),
              bagStock: stripUndefinedDeep(res.nextState.bagStock),
              timestamp: nowIso,
            });
            break;
          }

          case 'production:delete': {
            batch.delete(doc(db, 'factories', roomId, 'production', action.batchId));
            batch.update(factoryRef, {
              rawStock: stripUndefinedDeep(res.nextState.rawStock),
              bagStock: stripUndefinedDeep(res.nextState.bagStock),
              timestamp: nowIso,
            });
            break;
          }

          case 'expense:create': {
            batch.set(
              doc(db, 'factories', roomId, 'expenses', action.expense.id),
              stripUndefinedDeep({
                ...action.expense,
                createdByUid: user.uid,
                updatedAt: nowIso,
              })
            );
            break;
          }

          case 'staff:create':
          case 'staff:update': {
            const member = action.staffMember;
            batch.set(
              doc(db, 'factories', roomId, 'staff', member.id),
              stripUndefinedDeep({ ...member, updatedAt: nowIso })
            );
            if (member.email && member.email.includes('@')) {
              const lower = member.email.trim().toLowerCase();
              batch.set(
                doc(db, 'factories', roomId, 'authorizedUsers', lower),
                stripUndefinedDeep({
                  email: lower,
                  role: member.role === 'admin' ? 'admin' : 'staff',
                  staffId: member.id,
                  addedByUid: user.uid,
                  createdAt: nowIso,
                })
              );
            }
            break;
          }

          case 'staff:delete': {
            const target = currentState.staff.find((s) => s.id === action.staffId);
            batch.delete(doc(db, 'factories', roomId, 'staff', action.staffId));
            if (
              target?.email &&
              target.email.includes('@') &&
              target.email.trim().toLowerCase() !== BOOTSTRAP_ADMIN_EMAIL
            ) {
              batch.delete(
                doc(
                  db,
                  'factories',
                  roomId,
                  'authorizedUsers',
                  target.email.trim().toLowerCase()
                )
              );
            }
            break;
          }

          case 'stock:raw_update': {
            batch.update(factoryRef, {
              rawStock: stripUndefinedDeep(res.nextState.rawStock),
              timestamp: nowIso,
            });
            break;
          }

          case 'stock:bag_update': {
            batch.update(factoryRef, {
              bagStock: stripUndefinedDeep(res.nextState.bagStock),
              timestamp: nowIso,
            });
            break;
          }

          case 'settings:update': {
            batch.update(factoryRef, {
              settings: stripUndefinedDeep(res.nextState.settings),
              timestamp: nowIso,
            });
            break;
          }

          case 'product:rate_update': {
            batch.update(factoryRef, {
              products: stripUndefinedDeep(res.nextState.products),
              timestamp: nowIso,
            });
            break;
          }

          case 'master:push_full_state':
          case 'master:reset_factory': {
            handledViaBatch = false;
            // Clear stale subcollections for reset_factory, then write full workspace
            if (action.type === 'master:reset_factory') {
              const cols = ['customers', 'orders', 'production', 'expenses', 'staff'];
              for (const colName of cols) {
                const existingDocs = await getDocs(
                  collection(db, 'factories', roomId, colName)
                );
                await Promise.all(existingDocs.docs.map((d) => deleteDoc(d.ref)));
              }
            }
            await writeFullWorkspaceToFirestore(
              roomId,
              res.nextState,
              user.uid,
              (user.email || '').trim().toLowerCase()
            );
            await setDoc(activityRef, stripUndefinedDeep(activityEvent));
            break;
          }
        }

        if (handledViaBatch) {
          batch.set(activityRef, stripUndefinedDeep(activityEvent));
          await batch.commit();
        }

        setLastSyncedAt(nowIso);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `factories/${roomId}`);
      }
    },
    [writeFullWorkspaceToFirestore, applyLocalFullState, resolveSyncApiBase]
  );

  const pushMasterStateNow = useCallback(async () => {
    const current = liveStateRef.current;
    await dispatchMutation({ type: 'master:push_full_state', fullState: current });
  }, [dispatchMutation]);

  return {
    // Auth & Readiness
    authEnv,
    firebaseUser,
    authReady,
    authError,
    unauthorizedDomainHost,
    isSigningIn,
    signInWithGoogle,
    signInWithGoogleRedirect,
    signOutGoogle,
    firestoreReady,
    accessDenied,

    // Live Firestore ERP State
    settings,
    products,
    rawStock,
    bagStock,
    customers,
    orders,
    production,
    expenses,
    staff,

    // Sync Metadata & Controls
    config,
    status,
    transportMode: (status === 'connected' ? 'firestore' : 'none') as SyncTransportMode,
    connectionError,
    connectedDevices,
    recentEvents,
    pendingCount: 0,
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
