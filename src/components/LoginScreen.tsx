import React, { useState } from 'react';
import { CompanySettings, UserProfile } from '../types/erp';
import {
  Lock,
  Phone,
  Eye,
  EyeOff,
  LogIn,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  Radio,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { SyncConnectionStatus } from '../hooks/useRealtimeSync';

interface LoginScreenProps {
  settings: CompanySettings;
  staffList: UserProfile[];
  syncStatus?: SyncConnectionStatus;
  connectedDevicesCount?: number;
  onLoginSuccess: (member: UserProfile, rememberMe: boolean) => void;
  onOpenLiveSync?: () => void;
}

function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length > 10) {
    return digits.slice(-10);
  }
  return digits;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  settings,
  staffList,
  syncStatus = 'connecting',
  connectedDevicesCount = 1,
  onLoginSuccess,
  onOpenLiveSync,
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showDemoHelp, setShowDemoHelp] = useState(false);

  const defaultAdmin = staffList.find((s) => s.id === 'staff-1' && s.role === 'admin');
  const isDefaultAdminPass = defaultAdmin?.password === 'admin@tej786';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const rawId = identifier.trim();
    const trimmedPass = password.trim();

    if (!rawId) {
      setErrorMsg('कृपया अपना मोबाइल नंबर या ईमेल दर्ज करें।');
      return;
    }
    if (!trimmedPass) {
      setErrorMsg('कृपया अपना पासवर्ड दर्ज करें।');
      return;
    }

    const normalizedInputPhone = normalizePhone(rawId);
    const lowerInput = rawId.toLowerCase();

    const matchedMember = staffList.find((member) => {
      const memberPhoneNorm = normalizePhone(member.phone || '');
      const phoneMatches =
        normalizedInputPhone.length >= 6 && memberPhoneNorm === normalizedInputPhone;
      const emailMatches =
        Boolean(member.email) && member.email!.trim().toLowerCase() === lowerInput;
      const nameMatches = member.name.trim().toLowerCase() === lowerInput;
      return phoneMatches || emailMatches || nameMatches;
    });

    if (!matchedMember) {
      setErrorMsg('यह मोबाइल नंबर या ईमेल किसी स्टाफ खाते से मेल नहीं खा रहा है।');
      return;
    }

    if (!matchedMember.active) {
      setErrorMsg('यह खाता अभी निष्क्रिय (Inactive) है। कृपया मालिक (Admin) से संपर्क करें।');
      return;
    }

    if ((matchedMember.password || '') !== trimmedPass) {
      setErrorMsg('गलत पासवर्ड! कृपया सही पासवर्ड दर्ज करें।');
      return;
    }

    onLoginSuccess(matchedMember, rememberMe);
  };

  const handleQuickFillDemo = (member: UserProfile) => {
    setIdentifier(member.phone || member.email || '');
    setPassword(member.password || '');
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/80 flex flex-col justify-between p-4 sm:p-6 font-sans selection:bg-amber-500 selection:text-white">
      {/* Top Status Strip */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between text-[11px] text-slate-300 pt-1">
        <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>सुरक्षित ERP लॉगिन</span>
        </div>

        {onOpenLiveSync && (
          <button
            type="button"
            onClick={onOpenLiveSync}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold transition cursor-pointer ${
              syncStatus === 'connected'
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
            }`}
          >
            <Radio
              className={`w-3 h-3 ${syncStatus === 'connected' ? 'animate-pulse text-emerald-400' : ''}`}
            />
            <span>
              {syncStatus === 'connected'
                ? `सर्वर लाइव (${connectedDevicesCount})`
                : 'सर्वर पेयर करें'}
            </span>
          </button>
        )}
      </div>

      {/* Main Centered Login Card */}
      <div className="max-w-md w-full mx-auto my-6">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
          {/* Brand Header */}
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-amber-900 text-white px-6 py-6 text-center relative">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-slate-950 flex items-center justify-center font-black text-3xl shadow-lg ring-4 ring-amber-400/20">
              T
            </div>
            <h1 className="mt-3 text-xl font-black tracking-tight text-white">
              {settings.companyName || 'Shri Tej Food Products'}
            </h1>
            <div className="mt-1 inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-200 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{settings.brandName || 'Tejstha'} आटा मिल ERP</span>
            </div>
            <p className="mt-2 text-xs text-slate-300">
              आगे बढ़ने के लिए अपने मोबाइल नंबर या ईमेल से लॉगिन करें
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl px-3.5 py-2.5 flex items-start gap-2 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="font-semibold">{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                मोबाइल नंबर या ईमेल (Mobile / Email)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="उदाहरण: 9829012345 या email@..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-sm text-slate-900 font-medium outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                पासवर्ड (Password)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="अपना पासवर्ड लिखें"
                  className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-sm text-slate-900 font-medium outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                  aria-label={showPassword ? 'पासवर्ड छुपाएं' : 'पासवर्ड देखें'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none pt-0.5">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
              />
              <span className="text-xs text-slate-600 font-medium">
                इस फोन में लॉगिन सेव रखें (अगली बार बिना पासवर्ड खोलें)
              </span>
            </label>

            <button
              type="submit"
              className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>लॉगिन करें (Sign In)</span>
            </button>

            {/* First-time Demo Setup Helper (auto-hides default password if Admin changed it) */}
            {isDefaultAdminPass && (
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDemoHelp((prev) => !prev)}
                  className="w-full flex items-center justify-between text-[11px] font-bold text-slate-500 hover:text-slate-800 py-1 cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                    पहली बार लॉगिन? डिफ़ॉल्ट Admin / स्टाफ आईडी देखें
                  </span>
                  {showDemoHelp ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                {showDemoHelp && (
                  <div className="mt-2 bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 text-[11px]">
                    <p className="text-slate-600">
                      नीचे किसी भी अकाउंट पर टैप करके विवरण भरें (बाद में स्टाफ सेक्शन से पासवर्ड बदल सकते हैं):
                    </p>
                    <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto">
                      {staffList
                        .filter((m) => m.active)
                        .map((member) => (
                          <button
                            key={member.id}
                            type="button"
                            onClick={() => handleQuickFillDemo(member)}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 flex items-center justify-between gap-2 transition cursor-pointer"
                          >
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 truncate">
                                {member.roleHindi} — {member.name}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono truncate">
                                ID: {member.phone} {member.email ? `| ${member.email}` : ''}
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded shrink-0">
                              भरें
                            </span>
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-md w-full mx-auto text-center text-[11px] text-slate-400 pb-2">
        © {new Date().getFullYear()} {settings.companyName} • 100% सुरक्षित व ऑफ़लाइन रेडी
      </div>
    </div>
  );
};
