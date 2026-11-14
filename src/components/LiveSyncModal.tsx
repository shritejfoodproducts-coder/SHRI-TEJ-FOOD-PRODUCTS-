import React, { useEffect, useState } from 'react';
import {
  Activity,
  Check,
  Copy,
  Crown,
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
import type { SyncConfig, SyncConnectionStatus } from '../hooks/useRealtimeSync';

interface LiveSyncModalProps {
  onClose: () => void;
  config: SyncConfig;
  status: SyncConnectionStatus;
  connectedDevices: ConnectedDevice[];
  recentEvents: LiveActivityEvent[];
  pendingCount: number;
  lastSyncedAt: string | null;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onUpdateConfig: (partial: Partial<SyncConfig>) => void;
  onPushMasterStateNow: () => void;
}

export const LiveSyncModal: React.FC<LiveSyncModalProps> = ({
  onClose,
  config,
  status,
  connectedDevices,
  recentEvents,
  pendingCount,
  lastSyncedAt,
  soundEnabled,
  onToggleSound,
  onUpdateConfig,
  onPushMasterStateNow,
}) => {
  const [deviceNameInput, setDeviceNameInput] = useState(config.deviceName);
  const [roomIdInput, setRoomIdInput] = useState(config.roomId);
  const [serverUrlInput, setServerUrlInput] = useState(
    config.syncServerUrl ||
      'https://ais-pre-yevywmvpbfmbyiknv4vkin-325769928556.asia-northeast1.run.app'
  );
  const [staffInviteQr, setStaffInviteQr] = useState('');
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [pushedSuccess, setPushedSuccess] = useState(false);

  const isNativeShell =
    typeof window !== 'undefined' &&
    (window.location.protocol === 'capacitor:' ||
      window.location.protocol === 'file:' ||
      (window.location.hostname === 'localhost' && window.location.port !== '3000'));

  const baseOrigin =
    isNativeShell && config.syncServerUrl
      ? config.syncServerUrl.replace(/\/+$/, '')
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
    onUpdateConfig({
      deviceName: deviceNameInput.trim() || 'मोबाइल डिवाइस',
      roomId: roomIdInput.trim() || 'tej-food-main',
      syncServerUrl: serverUrlInput.trim() || undefined,
    });
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

  const handlePushNow = () => {
    onPushMasterStateNow();
    setPushedSuccess(true);
    setTimeout(() => setPushedSuccess(false), 2500);
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
                      <Wifi className="w-3 h-3" /> लाइव सिंक चालू
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3 h-3" /> जुड़ रहा है...
                    </>
                  )}
                </span>
                <span className="text-[10px] bg-white/10 text-slate-200 font-bold px-2 py-0.5 rounded-full">
                  {connectedDevices.length} डिवाइस ऑनलाइन
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white mt-0.5">
                मोबाइल सर्वर एवं रियल-टाइम स्टाफ सिंक (Live Multi-Mobile Sync)
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
                यह फ़ोन फैक्ट्री का मुख्य कंट्रोलर रहेगा। बाकी सभी सेल्समैन/मुनीम जो भी ऑर्डर या पेमेंट डालेंगे, वह तुरंत इस फ़ोन पर लाइव दिखेगा व सेव होगा।
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
                सेल्समैन, मुनीम, ऑपरेटर या ड्राइवर अपने फ़ोन पर इस मोड में एंट्री करेंगे। हर नई एंट्री तुरंत मालिक के मोबाइल पर अपडेट हो जाएगी।
              </p>
            </button>
          </div>

          {/* Master Sync Action Banner */}
          {config.deviceRole === 'master' && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-bold text-amber-950 text-xs">
                  क्या आपके मोबाइल में पुराना डेटा/QR सेव है?
                </p>
                <p className="text-[11px] text-amber-800">
                  यह बटन दबाते ही आपके मोबाइल का पूरा डेटा बाकी सभी जुड़े स्टाफ के मोबाइल पर तुरंत सिंक हो जाएगा।
                </p>
              </div>
              <button
                type="button"
                onClick={handlePushNow}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black text-xs shadow-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer transition"
              >
                {pushedSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>सभी डिवाइस पर सिंक हुआ!</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>मेरा डेटा सभी स्टाफ को भेजें</span>
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

            <div className="sm:col-span-3">
              <button
                type="submit"
                className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs cursor-pointer transition"
              >
                नाम व कोड सेव करें
              </button>
            </div>

            <div className="sm:col-span-12">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                लाइव सिंक सर्वर URL (APK / मोबाइल के लिए)
              </label>
              <input
                type="url"
                value={serverUrlInput}
                onChange={(e) => setServerUrlInput(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-[11px] font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="https://..."
              />
            </div>
          </form>

          {/* Invite Staff Phones via QR or WhatsApp Link */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-white border border-slate-200 rounded-xl p-4 items-center">
            <div className="md:col-span-8 space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Share2 className="w-4 h-4 text-emerald-600" />
                <span>अन्य स्टाफ / सेल्समैन के फ़ोन को अपने मोबाइल से जोड़ें</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                यह लिंक अपने सेल्समैन या मुनीम को WhatsApp पर भेजें। जैसे ही वे इस लिंक को अपने फोन में खोलेंगे, उनका फोन सीधे आपके <strong>{config.roomId}</strong> रूम से जुड़ जाएगा और उनकी हर एंट्री तुरंत आपके मोबाइल पर दिखेगी।
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
              {pendingCount > 0 && (
                <p className="text-[11px] text-amber-700 font-bold">
                  ⏳ {pendingCount} ऑफ़लाइन एंट्री सिंक होने के लिए कतार में हैं (नेटवर्क आते ही अपने आप भेजी जाएंगी)
                </p>
              )}
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
                          रोल: {dev.userRole} • जुड़ा: {formatTime(dev.connectedAt)}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          dev.deviceRole === 'master'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}
                      >
                        {dev.deviceRole === 'master' ? '👑 सर्वर' : '📱 स्टाफ'}
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
            रूम कोड: <strong className="font-mono text-slate-800">{config.roomId}</strong> • लोकल स्टोरेज + लाइव सिंक एक्टिव
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
