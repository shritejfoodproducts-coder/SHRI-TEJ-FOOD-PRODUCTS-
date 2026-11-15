import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Check,
  Cloud,
  Copy,
  Crown,
  Loader2,
  LogOut,
  QrCode,
  Radio,
  RefreshCw,
  Share2,
  Smartphone,
  Users,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import QRCode from 'qrcode';
import type {
  ConnectedDevice,
  LiveActivityEvent,
  SyncDeviceRole,
} from '../../shared/erpSyncTypes';
import type {
  FirestoreSyncConfig,
  ServerProbeResult,
  SyncConnectionStatus,
} from '../hooks/useFirestoreErpSync';
import { FIREBASE_PROJECT_ID } from '../firebase';

interface LiveSyncModalProps {
  onClose: () => void;
  config: FirestoreSyncConfig;
  status: SyncConnectionStatus;
  firebaseEmail?: string | null;
  connectionError?: string | null;
  connectedDevices: ConnectedDevice[];
  recentEvents: LiveActivityEvent[];
  lastSyncedAt: string | null;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onUpdateConfig: (partial: Partial<FirestoreSyncConfig>) => void;
  onReconnectNow?: () => void;
  onProbeServer?: () => Promise<ServerProbeResult>;
  onPushMasterStateNow: () => Promise<void> | void;
  onGoogleSignIn?: () => Promise<void>;
  onGoogleSignOut?: () => Promise<void>;
}

export const LiveSyncModal: React.FC<LiveSyncModalProps> = ({
  onClose,
  config,
  status,
  firebaseEmail,
  connectionError,
  connectedDevices,
  recentEvents,
  lastSyncedAt,
  soundEnabled,
  onToggleSound,
  onUpdateConfig,
  onReconnectNow,
  onProbeServer,
  onPushMasterStateNow,
  onGoogleSignIn,
  onGoogleSignOut,
}) => {
  const [deviceNameInput, setDeviceNameInput] = useState(config.deviceName);
  const [roomIdInput, setRoomIdInput] = useState(config.roomId);
  const [staffInviteQr, setStaffInviteQr] = useState('');
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [pushedSuccess, setPushedSuccess] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [isTestingServer, setIsTestingServer] = useState(false);
  const [testResult, setTestResult] = useState<ServerProbeResult | null>(null);

  const isNativeShell =
    typeof window !== 'undefined' &&
    (window.location.protocol === 'capacitor:' ||
      window.location.protocol === 'file:' ||
      (window.location.hostname === 'localhost' && window.location.port !== '3000'));

  const baseOrigin =
    isNativeShell
      ? 'https://ais-pre-yevywmvpbfmbyiknv4vkin-325769928556.asia-northeast1.run.app'
      : typeof window !== 'undefined'
        ? window.location.origin
        : '';

  const staffInviteUrl = baseOrigin
    ? `${baseOrigin}/?syncRoom=${encodeURIComponent(config.roomId)}&mode=staff`
    : '';

  useEffect(() => {
    if (!staffInviteUrl) return;
    QRCode.toDataURL(staffInviteUrl, {
      width: 200,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then(setStaffInviteQr)
      .catch(() => {});
  }, [staffInviteUrl]);

  const handleSaveIdentity = (e: React.FormEvent) => {
    e.preventDefault();
    setTestResult(null);
    onUpdateConfig({
      deviceName: deviceNameInput.trim() || 'मोबाइल डिवाइस',
      roomId: roomIdInput.trim() || 'tej-food-main',
    });
    if (onReconnectNow) {
      onReconnectNow();
    }
  };

  const handleTestFirestoreConnection = async () => {
    onUpdateConfig({
      deviceName: deviceNameInput.trim() || 'मोबाइल डिवाइस',
      roomId: roomIdInput.trim() || 'tej-food-main',
    });
    if (!onProbeServer) {
      if (onReconnectNow) onReconnectNow();
      return;
    }
    setIsTestingServer(true);
    setTestResult(null);
    const probe = await onProbeServer();
    setTestResult(probe);
    setIsTestingServer(false);
    if (probe.ok && onReconnectNow) {
      onReconnectNow();
    }
  };

  const handleSwitchMode = (mode: SyncDeviceRole) => {
    const defaultName =
      mode === 'master'
        ? 'मालिक मुख्य मोबाइल (Owner Host)'
        : 'स्टाफ / सेल्समैन मोबाइल';
    setDeviceNameInput((prev) =>
      prev.includes('मालिक') || prev.includes('स्टाफ') ? defaultName : prev
    );
    onUpdateConfig({
      deviceRole: mode,
      deviceName:
        deviceNameInput.includes('मालिक') || deviceNameInput.includes('स्टाफ')
          ? defaultName
          : deviceNameInput,
    });
  };

  const handleCopyStaffLink = () => {
    if (!staffInviteUrl) return;
    navigator.clipboard.writeText(staffInviteUrl);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2500);
  };

  const handlePushNow = async () => {
    setIsPushing(true);
    try {
      await onPushMasterStateNow();
      setPushedSuccess(true);
      setTimeout(() => setPushedSuccess(false), 2500);
    } finally {
      setIsPushing(false);
    }
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString('hi-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 text-slate-800 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center">
              <Radio
                className={`w-6 h-6 ${
                  status === 'connected' ? 'text-emerald-400 animate-pulse' : 'text-amber-400'
                }`}
              />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 ${
                    status === 'connected'
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-amber-400 text-slate-950'
                  }`}
                >
                  {status === 'connected' ? (
                    <>
                      <Wifi className="w-3 h-3" /> Firebase Firestore लाइव
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3 h-3" /> कनेक्शन नहीं जुड़ा
                    </>
                  )}
                </span>
                <span className="text-[10px] bg-white/10 text-slate-200 font-bold px-2 py-0.5 rounded-full">
                  {connectedDevices.length} डिवाइस ऑनलाइन
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white mt-0.5">
                Firebase Firestore रियल-टाइम सिंक (Live Multi-Mobile Sync)
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onToggleSound}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
              title={soundEnabled ? 'अलर्ट आवाज़ बंद करें' : 'अलर्ट आवाज़ चालू करें'}
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-300" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-400" />
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs">
          {/* Firebase Account Banner */}
          <div className="bg-slate-900 text-white rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400 shrink-0">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-xs text-white">
                  {firebaseEmail
                    ? `क्लाउड अकाउंट जुड़ा है: ${firebaseEmail}`
                    : 'Google क्लाउड अकाउंट से साइन इन करें'}
                </p>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Firebase Project: <span className="font-mono text-amber-300">{FIREBASE_PROJECT_ID}</span> • हर बदलाव बिना रिफ्रेश किए सभी मोबाइल पर तुरंत अपडेट होता है।
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {firebaseEmail ? (
                onGoogleSignOut && (
                  <button
                    type="button"
                    onClick={onGoogleSignOut}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Google अकाउंट बदलें</span>
                  </button>
                )
              ) : (
                onGoogleSignIn && (
                  <button
                    type="button"
                    onClick={onGoogleSignIn}
                    className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg font-black text-xs cursor-pointer transition"
                  >
                    Google से जोड़ें
                  </button>
                )
              )}
            </div>
          </div>

          {/* Mode Selector: Owner Master Mobile vs Staff Mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleSwitchMode('master')}
              className={`p-4 rounded-xl border-2 text-left transition cursor-pointer ${
                config.deviceRole === 'master'
                  ? 'border-amber-500 bg-amber-50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 font-black text-slate-900 text-sm">
                  <Crown className="w-4 h-4 text-amber-600" />
                  <span>मेरा मोबाइल मुख्य सर्वर (Owner Host)</span>
                </div>
                {config.deviceRole === 'master' && (
                  <span className="text-[10px] bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded-full">
                    एक्टिव
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                मालिक का मुख्य मोबाइल। सभी सेल्समैन/मुनीम जो भी ऑर्डर या पेमेंट डालेंगे, वह तुरंत इस फ़ोन पर लाइव दिखेगा व Firebase में सेव होगा।
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchMode('staff')}
              className={`p-4 rounded-xl border-2 text-left transition cursor-pointer ${
                config.deviceRole === 'staff'
                  ? 'border-emerald-600 bg-emerald-50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 font-black text-slate-900 text-sm">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span>स्टाफ / सेल्समैन एंट्री मोड (Staff Client)</span>
                </div>
                {config.deviceRole === 'staff' && (
                  <span className="text-[10px] bg-emerald-600 text-white font-black px-2 py-0.5 rounded-full">
                    एक्टिव
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                सेल्समैन, मुनीम, ऑपरेटर या ड्राइवर अपने फ़ोन पर इस मोड में एंट्री करेंगे। हर नई एंट्री बिना रिफ्रेश किए तुरंत सभी मोबाइल पर अपडेट होगी।
              </p>
            </button>
          </div>

          {/* Master Sync Action Banner */}
          {config.deviceRole === 'master' && firebaseEmail && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-bold text-amber-950 text-xs">
                  पूरा डेटा Firebase Firestore में री-सिंक करें
                </p>
                <p className="text-[11px] text-amber-800">
                  यह बटन दबाते ही वर्तमान पूरा ERP डेटा क्लाउड में सेव होकर सभी जुड़े स्टाफ के मोबाइल पर तुरंत ताज़ा हो जाएगा।
                </p>
              </div>
              <button
                type="button"
                disabled={isPushing}
                onClick={handlePushNow}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white rounded-xl font-black text-xs shadow-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer transition"
              >
                {isPushing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>सिंक हो रहा है...</span>
                  </>
                ) : pushedSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>सभी डिवाइस पर सिंक हुआ!</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>क्लाउड में री-सिंक करें</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Device Identity & Sync Room Settings */}
          <form
            onSubmit={handleSaveIdentity}
            className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
          >
            <div className="sm:col-span-5">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                इस मोबाइल / यूज़र का नाम
              </label>
              <input
                type="text"
                value={deviceNameInput}
                onChange={(e) => setDeviceNameInput(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="जैसे: मालिक मुख्य मोबाइल / सुरेश सेल्समैन"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                फैक्ट्री सिंक कोड (Factory Room ID)
              </label>
              <input
                type="text"
                value={roomIdInput}
                onChange={(e) => setRoomIdInput(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="tej-food-main"
              />
            </div>

            <div className="sm:col-span-3 flex gap-2">
              <button
                type="submit"
                className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs cursor-pointer transition"
              >
                सेव करें
              </button>
              <button
                type="button"
                onClick={handleTestFirestoreConnection}
                disabled={isTestingServer}
                className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition"
                title="Firebase कनेक्शन जांचें"
              >
                {isTestingServer ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {(testResult || (status !== 'connected' && connectionError)) && (
              <div
                className={`sm:col-span-12 rounded-xl p-3 text-[11px] flex items-start gap-2 border ${
                  testResult?.ok
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <AlertTriangle
                  className={`w-4 h-4 shrink-0 mt-0.5 ${
                    testResult?.ok ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                />
                <p className="font-bold">
                  {testResult ? testResult.message : connectionError}
                </p>
              </div>
            )}
          </form>

          {/* Invite Staff Phones via QR or WhatsApp Link */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-white border border-slate-200 rounded-xl p-4 items-center">
            <div className="md:col-span-8 space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Share2 className="w-4 h-4 text-emerald-600" />
                <span>अन्य स्टाफ / सेल्समैन के फ़ोन को अपने मोबाइल से जोड़ें</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                स्टाफ को जोड़ने के लिए पहले <strong>स्टाफ सेक्शन</strong> में उनका Email जोड़ें (या इस लिंक को WhatsApp पर भेजें)। जैसे ही वे इस लिंक को अपने फोन में खोलकर साइन इन करेंगे, उनका फोन सीधे आपके <strong>{config.roomId}</strong> डेटाबेस से जुड़ जाएगा।
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCopyStaffLink}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition"
                >
                  {copiedInvite ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>स्टाफ जॉइन लिंक कॉपी हो गया!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>स्टाफ जॉइन लिंक कॉपी करें (WhatsApp)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="md:col-span-4 flex flex-col items-center justify-center bg-slate-50 rounded-xl p-3 border border-slate-200">
              {staffInviteQr ? (
                <img src={staffInviteQr} alt="Staff Join QR" className="w-28 h-28 object-contain rounded-lg bg-white p-1 border border-slate-200" />
              ) : (
                <div className="w-28 h-28 flex items-center justify-center">
                  <QrCode className="w-8 h-8 text-slate-400" />
                </div>
              )}
              <span className="text-[10px] font-bold text-slate-500 mt-1.5 text-center">
                स्टाफ फ़ोन से स्कैन करके जुड़ें
              </span>
            </div>
          </div>

          {/* Live Connected Devices + Real-time Activity Log */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Connected Devices */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-100 px-3.5 py-2.5 border-b border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                  <Users className="w-4 h-4 text-emerald-600" />
                  अभी जुड़े हुए मोबाइल ({connectedDevices.length})
                </span>
                {lastSyncedAt && (
                  <span className="text-[10px] text-slate-500">
                    अंतिम सिंक: {formatTime(lastSyncedAt)}
                  </span>
                )}
              </div>
              <div className="divide-y divide-slate-100 max-h-52 overflow-y-auto p-2 space-y-1">
                {connectedDevices.length === 0 ? (
                  <p className="text-center text-slate-400 py-6 text-[11px]">
                    कनेक्शन की जाँच हो रही है...
                  </p>
                ) : (
                  connectedDevices.map((dev) => (
                    <div
                      key={dev.deviceId}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          <span className="font-bold text-slate-900 truncate">
                            {dev.deviceName}
                          </span>
                          {dev.deviceId === config.deviceId && (
                            <span className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-full font-bold">
                              यह फ़ोन
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 block pl-3.5">
                          रोल: {dev.userRole} • जुड़ा: {formatTime(dev.lastSeenAt || dev.connectedAt)}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          dev.deviceRole === 'master'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}
                      >
                        {dev.deviceRole === 'master' ? '👑 मालिक' : '📱 स्टाफ'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Live Activity Feed */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-100 px-3.5 py-2.5 border-b border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                  <Activity className="w-4 h-4 text-amber-600" />
                  रियल-टाइम एंट्री अपडेट ({recentEvents.length})
                </span>
              </div>
              <div className="divide-y divide-slate-100 max-h-52 overflow-y-auto p-2 space-y-1">
                {recentEvents.length === 0 ? (
                  <p className="text-center text-slate-400 py-6 text-[11px]">
                    अभी कोई नई लाइव एंट्री नहीं है। जब भी कोई स्टाफ ऑर्डर, पेमेंट या पिसाई दर्ज करेगा, यहाँ तुरंत दिखेगा।
                  </p>
                ) : (
                  recentEvents.map((evt) => (
                    <div key={evt.id} className="p-2 rounded-lg bg-slate-50 space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900 truncate">
                          {evt.title}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                          {formatTime(evt.timestamp)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 truncate">{evt.detail}</p>
                      <p className="text-[10px] text-emerald-700 font-semibold">
                        द्वारा: {evt.actorName} ({evt.actorRole})
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs shrink-0">
          <span className="text-slate-500 text-[11px]">
            रूम कोड: <strong className="font-mono text-slate-800">{config.roomId}</strong> • Firebase Firestore onSnapshot एक्टिव
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition cursor-pointer"
          >
            बंद करें
          </button>
        </div>
      </div>
    </div>
  );
};
