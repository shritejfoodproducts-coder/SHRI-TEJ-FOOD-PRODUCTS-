import React, { useState, useEffect } from 'react';
import { CompanySettings, UserProfile } from '../types/erp';
import {
  Lock,
  Phone,
  Mail,
  Eye,
  EyeOff,
  LogIn,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Radio,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  KeyRound,
  ArrowLeft,
  Send,
  Loader2,
  ShieldAlert,
  Cloud,
  LogOut,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import { FIREBASE_PROJECT_ID } from '../firebase';
import type {
  AuthEnvironmentInfo,
  SyncConnectionStatus,
} from '../hooks/useFirestoreErpSync';

interface LoginScreenProps {
  settings: CompanySettings;
  staffList: UserProfile[];
  syncStatus?: SyncConnectionStatus;
  connectedDevicesCount?: number;
  syncRoomId?: string;
  syncServerUrl?: string;
  authReady: boolean;
  authEnv?: AuthEnvironmentInfo;
  firebaseEmail?: string | null;
  authError?: string | null;
  unauthorizedDomainHost?: string | null;
  isSigningIn?: boolean;
  firestoreReady?: boolean;
  accessDenied?: boolean;
  connectionError?: string | null;
  onGoogleSignIn: () => Promise<void>;
  onGoogleSignInRedirect?: () => Promise<void>;
  onGoogleSignOut: () => Promise<void>;
  onLoginSuccess: (member: UserProfile, rememberMe: boolean) => void;
  onResetPassword: (updatedMember: UserProfile) => void;
  onOpenLiveSync?: () => void;
}

function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length > 10) {
    return digits.slice(-10);
  }
  return digits;
}

function resolveApiBaseUrl(syncServerUrl?: string): string {
  if (typeof window === 'undefined') return '';
  const isNativeShell =
    window.location.protocol === 'capacitor:' ||
    window.location.protocol === 'file:' ||
    (window.location.hostname === 'localhost' && window.location.port !== '3000');

  if (isNativeShell && syncServerUrl) {
    return syncServerUrl.trim().replace(/\/+$/, '');
  }
  return '';
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  settings,
  staffList,
  syncStatus = 'connecting',
  connectedDevicesCount = 1,
  syncRoomId = 'tej-food-main',
  syncServerUrl,
  authReady,
  authEnv,
  firebaseEmail,
  authError,
  unauthorizedDomainHost,
  isSigningIn = false,
  firestoreReady = false,
  accessDenied = false,
  connectionError,
  onGoogleSignIn,
  onGoogleSignInRedirect,
  onGoogleSignOut,
  onLoginSuccess,
  onResetPassword,
  onOpenLiveSync,
}) => {
  const [mode, setMode] = useState<'login' | 'reset'>('login');
  const [resetStep, setResetStep] = useState<'request_otp' | 'verify_otp'>('request_otp');

  // Login State
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showDemoHelp, setShowDemoHelp] = useState(false);

  // Email OTP Reset Password State
  const [resetPhoneOrId, setResetPhoneOrId] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [maskedSentEmail, setMaskedSentEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetInfo, setResetInfo] = useState<string | null>(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [emailProviderConfigured, setEmailProviderConfigured] = useState<boolean | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);

  const defaultAdmin = staffList.find((s) => s.id === 'staff-1' && s.role === 'admin');
  const isDefaultAdminPass = defaultAdmin?.password === 'admin@tej786';

  const apiBase = resolveApiBaseUrl(syncServerUrl);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = window.setTimeout(() => setResendCooldown((prev) => Math.max(0, prev - 1)), 1000);
    return () => window.clearTimeout(t);
  }, [resendCooldown]);

  useEffect(() => {
    if (mode !== 'reset') return;
    let active = true;
    fetch(`${apiBase}/api/auth/email-otp-status`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { configured?: boolean } | null) => {
        if (active && data) {
          setEmailProviderConfigured(Boolean(data.configured));
        }
      })
      .catch(() => {
        if (active) setEmailProviderConfigured(null);
      });
    return () => {
      active = false;
    };
  }, [mode, apiBase]);

  const findStaffByIdentifier = (rawId: string): UserProfile | undefined => {
    const trimmed = rawId.trim();
    if (!trimmed) return undefined;
    const normalizedInputPhone = normalizePhone(trimmed);
    const lowerInput = trimmed.toLowerCase();

    return staffList.find((member) => {
      const memberPhoneNorm = normalizePhone(member.phone || '');
      const phoneMatches =
        normalizedInputPhone.length >= 6 && memberPhoneNorm === normalizedInputPhone;
      const emailMatches =
        Boolean(member.email) && member.email!.trim().toLowerCase() === lowerInput;
      const nameMatches = member.name.trim().toLowerCase() === lowerInput;
      return phoneMatches || emailMatches || nameMatches;
    });
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

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

    const matchedMember = findStaffByIdentifier(rawId);

    if (!matchedMember) {
      setErrorMsg('यह मोबाइल नंबर या ईमेल किसी स्टाफ खाते से मेल नहीं खा रहा है।');
      return;
    }

    if (!matchedMember.active) {
      setErrorMsg('यह खाता अभी निष्क्रिय (Inactive) है। कृपया मालिक (Admin) से संपर्क करें।');
      return;
    }

    if ((matchedMember.password || '') !== trimmedPass) {
      setErrorMsg('गलत पासवर्ड! कृपया सही पासवर्ड दर्ज करें या "पासवर्ड भूल गए?" से ईमेल OTP द्वारा रीसेट करें।');
      return;
    }

    onLoginSuccess(matchedMember, rememberMe);
  };

  const handleOpenResetView = () => {
    setResetError(null);
    setResetInfo(null);
    setErrorMsg(null);
    setSuccessMsg(null);
    setResetPhoneOrId(identifier.trim());
    setResetEmail('');
    setMaskedSentEmail('');
    setOtpCode('');
    setNewPassword('');
    setConfirmNewPassword('');
    setResetStep('request_otp');
    setMode('reset');
  };

  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setResetError(null);
    setResetInfo(null);

    const cleanId = resetPhoneOrId.trim();
    const cleanEmail = resetEmail.trim().toLowerCase();

    if (!cleanId) {
      setResetError('कृपया अपना रजिस्टर्ड मोबाइल नंबर दर्ज करें।');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setResetError('कृपया अपना रजिस्टर्ड ईमेल आईडी दर्ज करें।');
      return;
    }

    const matchedHint = findStaffByIdentifier(cleanId);

    setIsSendingOtp(true);
    try {
      const response = await fetch(`${apiBase}/api/auth/request-reset-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: cleanId,
          email: cleanEmail,
          roomId: syncRoomId,
          staffHint: matchedHint
            ? {
                ...matchedHint,
                companyName: settings.companyName,
              }
            : undefined,
        }),
      });

      const data = (await response.json().catch(() => null)) as {
        ok?: boolean;
        errorCode?: string;
        message?: string;
        maskedEmail?: string;
        expiresInMinutes?: number;
      } | null;

      if (!response.ok || !data?.ok) {
        if (data?.errorCode === 'EMAIL_NOT_CONFIGURED') {
          setEmailProviderConfigured(false);
        }
        setResetError(
          data?.message ||
            'ईमेल पर OTP कोड भेजा नहीं जा सका। कृपया विवरण व इंटरनेट कनेक्शन जांचें।'
        );
        return;
      }

      setMaskedSentEmail(data.maskedEmail || cleanEmail);
      setResetStep('verify_otp');
      setResendCooldown(30);
      setResetInfo(
        `आपके ईमेल (${data.maskedEmail || cleanEmail}) पर 6-अंकों का OTP कोड भेज दिया गया है।`
      );
    } catch {
      setResetError(
        'सर्वर से संपर्क नहीं हो सका। ईमेल OTP के लिए इंटरनेट व लाइव सिंक सर्वर कनेक्ट होना ज़रूरी है।'
      );
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtpAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);

    const cleanOtp = otpCode.trim();
    const nextPass = newPassword.trim();
    const confirmPass = confirmNewPassword.trim();

    if (!/^\d{6}$/.test(cleanOtp)) {
      setResetError('कृपया अपने ईमेल में प्राप्त 6-अंकों का OTP कोड सही-सही दर्ज करें।');
      return;
    }

    if (nextPass.length < 4) {
      setResetError('नया पासवर्ड कम से कम 4 अक्षरों या अंकों का होना चाहिए।');
      return;
    }

    if (nextPass !== confirmPass) {
      setResetError('दोनों नए पासवर्ड एक जैसे नहीं हैं, कृपया दोबारा जांचें।');
      return;
    }

    const matchedHint = findStaffByIdentifier(resetPhoneOrId.trim());

    setIsVerifyingOtp(true);
    try {
      const response = await fetch(`${apiBase}/api/auth/verify-reset-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: resetPhoneOrId.trim(),
          email: resetEmail.trim().toLowerCase(),
          otp: cleanOtp,
          newPassword: nextPass,
          roomId: syncRoomId,
          staffHint: matchedHint,
        }),
      });

      const data = (await response.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
        updatedMember?: UserProfile;
      } | null;

      if (!response.ok || !data?.ok || !data.updatedMember) {
        setResetError(
          data?.message ||
            'OTP सत्यापन विफल रहा। केवल ईमेल में प्राप्त सही कोड डालने पर ही पासवर्ड रीसेट होगा।'
        );
        return;
      }

      onResetPassword(data.updatedMember);
      setIdentifier(data.updatedMember.phone || data.updatedMember.email || '');
      setPassword('');
      setMode('login');
      setSuccessMsg(
        `${data.updatedMember.name} का पासवर्ड ईमेल OTP सत्यापन के बाद सफलतापूर्वक बदल गया है! अब नए पासवर्ड से लॉगिन करें।`
      );
    } catch {
      setResetError('OTP सत्यापित करने में सर्वर त्रुटि हुई। कृपया इंटरनेट कनेक्शन जांचें।');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleQuickFillDemo = (member: UserProfile) => {
    setIdentifier(member.phone || member.email || '');
    setPassword(member.password || '');
    setErrorMsg(null);
    setSuccessMsg(null);
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

      {/* Main Centered Auth Card */}
      <div className="max-w-md w-full mx-auto my-6">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
          {/* Brand Header */}
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-amber-900 text-white px-6 py-6 text-center relative">
            {mode === 'login' ? (
              <div className="w-20 h-20 mx-auto rounded-2xl overflow-hidden shadow-lg ring-4 ring-amber-400/35 bg-[#08172E]">
                <img
                  src="/logo.png"
                  alt="TEJ FOOD PRODUCTS Logo"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-slate-950 flex items-center justify-center font-black text-3xl shadow-lg ring-4 ring-amber-400/20">
                <KeyRound className="w-8 h-8 text-slate-950" />
              </div>
            )}
            <h1 className="mt-3 text-xl font-black tracking-tight text-white">
              {mode === 'login'
                ? settings.companyName || 'Shri Tej Food Products'
                : 'ईमेल OTP से पासवर्ड रीसेट'}
            </h1>
            <div className="mt-1 inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-200 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{settings.brandName || 'Tejstha'} आटा मिल ERP</span>
            </div>
            <p className="mt-2 text-xs text-slate-300">
              {mode === 'login'
                ? 'आगे बढ़ने के लिए अपने मोबाइल नंबर या ईमेल से लॉगिन करें'
                : 'आपके रजिस्टर्ड ईमेल पर 6-अंकों का कोड आएगा, कोड डालने पर ही पासवर्ड बदलेगा'}
            </p>
          </div>

          {mode === 'login' ? (
            /* DIRECT MOBILE NUMBER + PASSWORD LOGIN FORM (Always visible on main page) */
            <form onSubmit={handleLoginSubmit} className="p-6 space-y-4">
              {/* Cloud / Server Sync Status Strip */}
              {firebaseEmail && accessDenied ? (
                <div className="bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-bold">
                      <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>इस Google ईमेल को फ़ैक्ट्री डेटा अनुमति नहीं है</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void onGoogleSignOut()}
                      className="inline-flex items-center gap-1 text-rose-700 font-bold underline shrink-0 cursor-pointer"
                    >
                      <LogOut className="w-3 h-3" />
                      <span>हटाएं</span>
                    </button>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    {connectionError ||
                      `ईमेल (${firebaseEmail}) रूम "${syncRoomId}" में अधिकृत नहीं है। आप बिना Google के भी नीचे मोबाइल नंबर व पासवर्ड से लॉगिन कर सकते हैं।`}
                  </p>
                </div>
              ) : firebaseEmail ? (
                <div className="flex items-center justify-between gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-[11px]">
                  <div className="flex items-center gap-1.5 text-emerald-900 font-semibold truncate">
                    {firestoreReady ? (
                      <Cloud className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600 shrink-0" />
                    )}
                    <span className="truncate">
                      {firestoreReady
                        ? `Firebase Cloud लाइव: ${firebaseEmail}`
                        : `Firestore लोड हो रहा है (${firebaseEmail})...`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void onGoogleSignOut()}
                    className="text-emerald-800 hover:text-emerald-950 font-bold underline shrink-0 cursor-pointer"
                  >
                    बदलें
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[11px] text-slate-700">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Phone className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>सीधे मोबाइल नंबर और पासवर्ड से लॉगिन करें</span>
                  </div>
                  {!authReady && <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600 shrink-0" />}
                </div>
              )}

              {successMsg && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-3.5 py-2.5 flex items-start gap-2 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="font-semibold">{successMsg}</span>
                </div>
              )}

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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    पासवर्ड (Password)
                  </label>
                  <button
                    type="button"
                    onClick={handleOpenResetView}
                    className="text-xs font-bold text-amber-700 hover:text-amber-800 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <KeyRound className="w-3 h-3" />
                    <span>पासवर्ड भूल गए?</span>
                  </button>
                </div>
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

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleOpenResetView}
                  className="text-xs font-semibold text-slate-500 hover:text-amber-700 transition cursor-pointer"
                >
                  नया पासवर्ड सेट करना है?{' '}
                  <span className="font-bold underline">ईमेल OTP से रीसेट करें</span>
                </button>
              </div>

              {/* Optional Google Cloud Sync Panel (Firebase Firestore) */}
              {!firebaseEmail && (
                <div className="pt-3 border-t border-slate-100 space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <Cloud className="w-3.5 h-3.5 text-amber-600" />
                      <span>वैकल्पिक: Google से लाइव क्लाउड सिंक जोड़ें</span>
                    </span>
                  </div>

                  {authError && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl px-3 py-2 space-y-2 text-[11px]">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                        <span className="font-semibold">{authError}</span>
                      </div>

                      {unauthorizedDomainHost && (
                        <div className="bg-white border border-rose-200 rounded-lg p-2.5 space-y-1.5 text-[11px] text-slate-700">
                          <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-md px-2 py-1">
                            <code className="flex-1 font-mono text-[10px] text-slate-900 break-all">
                              {unauthorizedDomainHost}
                            </code>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard?.writeText(unauthorizedDomainHost);
                                setCopiedDomain(true);
                                window.setTimeout(() => setCopiedDomain(false), 2000);
                              }}
                              className="px-2 py-0.5 rounded bg-slate-900 text-white font-bold text-[10px] flex items-center gap-1 shrink-0 cursor-pointer"
                            >
                              {copiedDomain ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span>कॉपी हुआ</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>कॉपी</span>
                                </>
                              )}
                            </button>
                          </div>
                          <a
                            href={`https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/authentication/settings`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-1 w-full py-1.5 px-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[11px] rounded-md transition"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Firebase Authorized Domains खोलें</span>
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={isSigningIn}
                    onClick={() => void onGoogleSignIn()}
                    className="w-full py-2.5 px-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    {isSigningIn ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                        <span>Google से जुड़ रहा है...</span>
                      </>
                    ) : (
                      <>
                        <Cloud className="w-3.5 h-3.5 text-amber-400" />
                        <span>Google से क्लाउड सिंक जोड़ें (Connect Firebase)</span>
                      </>
                    )}
                  </button>

                  <div className="flex flex-wrap gap-1.5">
                    {!authEnv?.isIframe && !authEnv?.isCapacitorNative && onGoogleSignInRedirect && (
                      <button
                        type="button"
                        disabled={isSigningIn}
                        onClick={() => void onGoogleSignInRedirect()}
                        className="flex-1 py-2 px-2.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-950 font-bold text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <ExternalLink className="w-3 h-3 text-amber-700" />
                        <span>Mobile Redirect साइन-इन</span>
                      </button>
                    )}

                    {(authEnv?.isIframe || authEnv?.isCapacitorNative || authEnv?.isInAppBrowser) &&
                      typeof window !== 'undefined' && (
                        <a
                          href={
                            authEnv?.isCapacitorNative
                              ? syncServerUrl ||
                                'https://ais-pre-yevywmvpbfmbyiknv4vkin-325769928556.asia-northeast1.run.app'
                              : window.location.href
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-2 px-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-900 font-bold text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition"
                        >
                          <ExternalLink className="w-3 h-3 text-blue-600" />
                          <span>Chrome टैब में खोलें</span>
                        </a>
                      )}
                  </div>
                </div>
              )}

              {/* First-time Demo Setup Helper (auto-hides if Admin changed password) */}
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
          ) : (
            /* STRICT 2-STEP EMAIL OTP RESET FLOW */
            <div className="p-6 space-y-4">
              {emailProviderConfigured === false && (
                <div className="bg-amber-50 border border-amber-300 text-amber-950 rounded-xl p-3 flex items-start gap-2 text-[11px] leading-relaxed">
                  <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <strong>सर्वर ईमेल कॉन्फ़िगरेशन बाकी है:</strong> असली ईमेल पर OTP भेजने के लिए सर्वर Secrets में{' '}
                    <code className="font-mono font-bold">SMTP_USER</code> +{' '}
                    <code className="font-mono font-bold">SMTP_PASS</code> (Gmail App Password) या{' '}
                    <code className="font-mono font-bold">RESEND_API_KEY</code> सेट होना आवश्यक है। बिना ईमेल OTP कोड के पासवर्ड रीसेट नहीं होगा।
                  </div>
                </div>
              )}

              {resetInfo && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl px-3.5 py-2.5 flex items-start gap-2 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="font-semibold">{resetInfo}</span>
                </div>
              )}

              {resetError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl px-3.5 py-2.5 flex items-start gap-2 text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="font-semibold">{resetError}</span>
                </div>
              )}

              {resetStep === 'request_otp' ? (
                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <div className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                    <strong>कदम 1/2:</strong> अपना रजिस्टर्ड मोबाइल नंबर और ईमेल दर्ज करें। हम आपके ईमेल पर 6-अंकों का OTP कोड भेजेंगे।
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      रजिस्टर्ड मोबाइल नंबर (Mobile Number)
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={resetPhoneOrId}
                        onChange={(e) => setResetPhoneOrId(e.target.value)}
                        placeholder="उदाहरण: 9829012345"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-sm text-slate-900 font-medium outline-none transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      रजिस्टर्ड ईमेल (OTP इसी ईमेल पर आएगा)
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="उदाहरण: shritejfoodproducts@gmail.com"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-sm text-slate-900 font-medium outline-none transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSendingOtp}
                    className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-60 text-slate-950 font-black text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    {isSendingOtp ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>ईमेल पर OTP भेजा जा रहा है...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>ईमेल पर OTP कोड भेजें (Send Code)</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtpAndReset} className="space-y-4">
                  <div className="text-[11px] text-slate-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
                    <span>
                      <strong>कदम 2/2:</strong> <span className="font-mono">{maskedSentEmail}</span> पर आया 6-अंकों का कोड डालें।
                    </span>
                    <button
                      type="button"
                      disabled={resendCooldown > 0 || isSendingOtp}
                      onClick={() => handleRequestOtp()}
                      className="text-amber-800 font-bold underline disabled:no-underline disabled:opacity-50 shrink-0 cursor-pointer"
                    >
                      {resendCooldown > 0 ? `${resendCooldown}s` : 'दोबारा भेजें'}
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      ईमेल OTP कोड (6-Digit Verification Code)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="6-अंकों का कोड (जैसे 482910)"
                      className="w-full px-4 py-3 text-center tracking-[0.4em] font-mono text-lg font-black rounded-xl border-2 border-amber-300 bg-amber-50/40 focus:bg-white focus:border-amber-500 text-slate-900 outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      नया पासवर्ड (New Password)
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="कम से कम 4 अक्षर/अंक लिखें"
                        className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-sm text-slate-900 font-medium outline-none transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                        aria-label={showNewPassword ? 'पासवर्ड छुपाएं' : 'पासवर्ड देखें'}
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      नया पासवर्ड कन्फर्म करें (Confirm Password)
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="नया पासवर्ड दोबारा लिखें"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-sm text-slate-900 font-medium outline-none transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isVerifyingOtp}
                    className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-60 text-white font-black text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    {isVerifyingOtp ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>कोड सत्यापित हो रहा है...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        <span>OTP सत्यापित कर पासवर्ड बदलें</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setResetStep('request_otp');
                      setResetError(null);
                      setResetInfo(null);
                    }}
                    className="w-full py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    मोबाइल / ईमेल बदलें
                  </button>
                </form>
              )}

              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setResetError(null);
                  setResetInfo(null);
                }}
                className="w-full py-2 px-3 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>वापस लॉगिन स्क्रीन पर जाएं</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-md w-full mx-auto text-center text-[11px] text-slate-400 pb-2">
        © {new Date().getFullYear()} {settings.companyName} • 100% सुरक्षित व ऑफ़लाइन रेडी
      </div>
    </div>
  );
};
