import React, { useState, useEffect } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { AppDatabaseState } from '../utils/backup';
import {
  downloadApiVersionJson,
  downloadOpenApiSpec,
  generateApiPayload,
} from '../utils/apiExport';
import {
  Download,
  Smartphone,
  HardDrive,
  ShieldCheck,
  X,
  CheckCircle2,
  Code,
  FileJson,
  Copy,
  Check,
  QrCode,
  Layers,
  ArrowRight,
  Info,
  Share2,
  ExternalLink,
  FolderArchive,
  Terminal,
  GitBranch,
  AlertCircle,
} from 'lucide-react';
import QRCode from 'qrcode';

interface InstallModalProps {
  onClose: () => void;
  currentState?: AppDatabaseState;
  initialTab?: 'apk' | 'api';
}

interface ApkStatusResponse {
  available: boolean;
  downloadUrl: string | null;
  fileName: string;
  fileSizeBytes: number | null;
  packageId: string;
  versionName: string;
  hasAndroidProject: boolean;
  hasGithubWorkflow: boolean;
  hasDistBuild: boolean;
  bundleUrl: string;
}

const SHARED_APP_URL =
  'https://ais-pre-yevywmvpbfmbyiknv4vkin-325769928556.asia-northeast1.run.app';
const GITHUB_REPO_STORAGE_KEY = 'tej_food_github_repo';
const LOCAL_BUILD_COMMAND =
  'npm install --legacy-peer-deps && npm run android:sync && cd android && ./gradlew assembleDebug';

function normalizeRepoSlug(raw: string): string {
  const trimmed = raw
    .trim()
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/^\/+|\/+$/g, '');
  const parts = trimmed.split('/').filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]}/${parts[1]}`;
  }
  return '';
}

function formatBytes(bytes: number | null): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const InstallModal: React.FC<InstallModalProps> = ({
  onClose,
  currentState,
  initialTab = 'apk',
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'apk' | 'api'>(initialTab);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null);
  const [copiedPayload, setCopiedPayload] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedCmd, setCopiedCmd] = useState<boolean>(false);
  const [previewEndpoint, setPreviewEndpoint] = useState<string>('/api/v1/orders');
  const [actionError, setActionError] = useState<string | null>(null);
  const [apkStatus, setApkStatus] = useState<ApkStatusResponse | null>(null);
  const [githubRepoInput, setGithubRepoInput] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(GITHUB_REPO_STORAGE_KEY) || '';
  });

  const normalizedRepo = normalizeRepoSlug(githubRepoInput);

  const shareableAppUrl =
    typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    !window.location.hostname.startsWith('127.') &&
    !window.location.hostname.includes('ais-dev-')
      ? window.location.href
      : SHARED_APP_URL;

  const handleInstallClick = async () => {
    const success = await install();
    if (success) {
      onClose();
    }
  };

  // Fetch APK / Capacitor availability status from backend
  useEffect(() => {
    let active = true;
    fetch('/api/apk-status')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ApkStatusResponse | null) => {
        if (active && data) {
          setApkStatus(data);
        }
      })
      .catch(() => {
        // Ignore silently if offline
      });
    return () => {
      active = false;
    };
  }, []);

  // Generate QR code for opening / installing on mobile
  useEffect(() => {
    const generateQr = async () => {
      try {
        const targetUrl =
          typeof window !== 'undefined' ? window.location.href : SHARED_APP_URL;
        const qr = await QRCode.toDataURL(targetUrl, {
          width: 220,
          margin: 1,
          color: { dark: '#0f172a', light: '#ffffff' },
        });
        setQrCodeUrl(qr);
      } catch (err) {
        console.error('Failed to generate install QR:', err);
      }
    };
    generateQr();
  }, []);

  const handleRepoInputChange = (value: string) => {
    setGithubRepoInput(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem(GITHUB_REPO_STORAGE_KEY, value);
    }
  };

  const handleCopy = (
    text: string,
    type: 'endpoint' | 'payload' | 'cmd',
    endpointKey?: string
  ) => {
    navigator.clipboard.writeText(text);
    if (type === 'payload') {
      setCopiedPayload(true);
      setTimeout(() => setCopiedPayload(false), 2000);
    } else if (type === 'cmd') {
      setCopiedCmd(true);
      setTimeout(() => setCopiedCmd(false), 2000);
    } else if (endpointKey) {
      setCopiedEndpoint(endpointKey);
      setTimeout(() => setCopiedEndpoint(null), 2000);
    }
  };

  const handleDownloadApi = () => {
    if (!currentState) {
      setActionError('डेटा लोड हो रहा है, कृपया कुछ सेकंड बाद पुनः प्रयास करें।');
      return;
    }
    setActionError(null);
    downloadApiVersionJson(currentState);
  };

  const handleDownloadOpenApi = () => {
    if (!currentState) {
      setActionError('डेटा लोड हो रहा है, कृपया कुछ सेकंड बाद पुनः प्रयास करें।');
      return;
    }
    setActionError(null);
    downloadOpenApiSpec(currentState);
  };

  const apiPayload = currentState ? generateApiPayload(currentState) : null;
  const currentPreviewData = apiPayload?.endpoints[previewEndpoint]?.data || null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 text-slate-800 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-slate-950 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              {activeTab === 'apk' ? (
                <Smartphone className="w-6 h-6 text-amber-200" />
              ) : (
                <Code className="w-6 h-6 text-amber-200" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  डाउनलोड केंद्र (Download Center)
                </span>
                <span className="text-[10px] bg-emerald-500/90 text-slate-950 font-bold px-2 py-0.5 rounded-full">
                  v{apkStatus?.versionName || '2.4.0'}
                </span>
              </div>
              <h2 className="text-lg font-bold text-white mt-0.5">
                TEJ FOOD - Android .APK एवं API डाउनलोड
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs: APK vs API Version */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-bold shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('apk')}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 border-b-2 transition ${
              activeTab === 'apk'
                ? 'border-amber-600 text-amber-900 bg-white shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <Smartphone className="w-4 h-4 text-amber-600" />
            <span>📱 Android .APK / मोबाइल ऐप डाउनलोड</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('api')}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 border-b-2 transition ${
              activeTab === 'api'
                ? 'border-purple-600 text-purple-900 bg-white shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <Code className="w-4 h-4 text-purple-600" />
            <span>📡 सिस्टम API वर्जन डाउनलोड (.JSON)</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
          {actionError && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span className="font-semibold text-[11px]">{actionError}</span>
              </div>
              <button
                type="button"
                onClick={() => setActionError(null)}
                className="text-red-500 hover:text-red-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* TAB 1: Android APK / Mobile App */}
          {activeTab === 'apk' && (
            <div className="space-y-4">
              {/* Direct Built .APK Download Card (or Honest Container Explanation) */}
              {apkStatus?.available && apkStatus.downloadUrl ? (
                <div className="bg-emerald-50 border-2 border-emerald-400 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-emerald-950 font-black text-sm">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span>असली Android .APK डाउनलोड के लिए तैयार है!</span>
                    </div>
                    <span className="text-[10px] bg-emerald-200 text-emerald-950 font-bold px-2 py-0.5 rounded-full font-mono">
                      {formatBytes(apkStatus.fileSizeBytes) || 'APK Ready'}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    पैकेज ID: <strong className="font-mono">{apkStatus.packageId}</strong> • वर्जन{' '}
                    <strong>v{apkStatus.versionName}</strong> • सीधा फोन में डाउनलोड कर इंस्टॉल करें।
                  </p>
                  <a
                    href={apkStatus.downloadUrl}
                    download={apkStatus.fileName}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-sm shadow-md flex items-center justify-center gap-2 transition"
                  >
                    <Download className="w-5 h-5" />
                    <span>सीधे डाउनलोड करें: {apkStatus.fileName}</span>
                  </a>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-amber-950 font-bold text-xs">
                      <Info className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>
                        Capacitor Android प्रोजेक्ट ({apkStatus?.packageId || 'com.shritejfood.erp'}) सिंक है
                      </span>
                    </div>
                    <span className="text-[10px] bg-amber-200 text-amber-950 font-bold px-2 py-0.5 rounded-full">
                      Cloud Server Notice
                    </span>
                  </div>
                  <p className="text-amber-900 text-[11px] leading-relaxed">
                    इस क्लाउड Node.js सर्वर में Android SDK / Java 21 कंपाइलर मौजूद नहीं होने के कारण बाइनरी <strong>.apk</strong> सीधे यहाँ कंपाइल नहीं हो सकती। असली <strong>TejFoodProducts-ERP-debug.apk</strong> पाने के लिए नीचे दिए <strong>GitHub Auto-APK Release</strong>, <strong>Android Bundle डाउनलोड</strong> या <strong>1-Tap Chrome Install</strong> का उपयोग करें।
                  </p>
                </div>
              )}

              {/* Method 1: GitHub Actions + GitHub Releases Direct .APK */}
              <div className="bg-slate-950 text-white rounded-xl p-4 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-emerald-400 shrink-0" />
                    <h3 className="font-bold text-sm text-white">
                      1. GitHub Actions से ऑटो असली .APK जनरेट व डाउनलोड करें
                    </h3>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold px-2 py-0.5 rounded-full">
                    Recommended
                  </span>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed">
                  प्रोजेक्ट में <code className="text-amber-300 font-mono">.github/workflows/build-apk.yml</code> (Java 21 + Capacitor Android) पहले से सेट है। GitHub पर कोड पुश करते ही यह अपनेआप{' '}
                  <strong className="text-white">TejFoodProducts-ERP-debug.apk</strong> बनाकर{' '}
                  <strong className="text-emerald-300">GitHub Releases</strong> में डाल देता है।
                </p>

                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    अपना GitHub Repo दर्ज करें (ताकि सीधा Release APK लिंक खुल सके):
                  </label>
                  <input
                    type="text"
                    value={githubRepoInput}
                    onChange={(e) => handleRepoInputChange(e.target.value)}
                    placeholder="उदाहरण: username/tejstha-erp या पूरा GitHub URL"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                {normalizedRepo ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <a
                      href={`https://github.com/${normalizedRepo}/actions/workflows/build-apk.yml`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg font-black text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      <span>APK Build चलाएं (Actions)</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <a
                      href={`https://github.com/${normalizedRepo}/releases/latest`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg font-black text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Releases से .APK डाउनलोड करें</span>
                    </a>
                  </div>
                ) : (
                  <div className="text-[11px] text-amber-300/90 bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-2">
                    ऊपर <span className="font-mono text-white">owner/repo</span> लिखते ही{' '}
                    <strong>Actions (Run Build)</strong> और <strong>Releases (Download .APK)</strong> बटन सक्रिय हो जाएंगे।
                  </div>
                )}
              </div>

              {/* Method 2: Download Full Synced Android Project Bundle + Local Gradle Build */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                    <FolderArchive className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>2. पूरा Android + Capacitor प्रोजेक्ट डाउनलोड करें (.tar.gz)</span>
                  </div>
                  <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                    Synced v2.4.0
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  इस बंडल में अपडेटेड <code className="font-mono">android/</code> प्रोजेक्ट,{' '}
                  <code className="font-mono">dist/</code> वेब बिल्ड और{' '}
                  <code className="font-mono">build-apk.yml</code> शामिल हैं। इसे PC/Android Studio में खोलकर या GitHub पर अपलोड करके 1 क्लिक में APK बनाएं।
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <a
                    href={apkStatus?.bundleUrl || '/api/download-android-bundle'}
                    download="TejFoodProducts-Android-APK-Project-v2.4.0.tar.gz"
                    className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>Android बंडल डाउनलोड करें (.tar.gz)</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => handleCopy(LOCAL_BUILD_COMMAND, 'cmd')}
                    className="py-2.5 px-3 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    {copiedCmd ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>APK Build कमांड कॉपी हो गई!</span>
                      </>
                    ) : (
                      <>
                        <Terminal className="w-4 h-4 text-amber-300" />
                        <span>Gradle APK कमांड कॉपी करें</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-slate-900 text-emerald-300 font-mono text-[10px] px-3 py-2 rounded-lg overflow-x-auto whitespace-nowrap">
                  {LOCAL_BUILD_COMMAND}
                </div>
              </div>

              {/* Method 3: 1-Tap Chrome WebAPK + QR Code */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center border-t border-slate-200 pt-4">
                <div className="md:col-span-7 space-y-3">
                  {isInstalled ? (
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-center space-y-1">
                      <CheckCircle2 className="w-8 h-8 text-blue-600 mx-auto" />
                      <p className="font-bold text-blue-900 text-sm">
                        ऐप आपके फोन में पहले से इंस्टॉल है!
                      </p>
                      <p className="text-blue-700 text-xs">
                        आप सीधे अपने फोन की होम स्क्रीन से TEJ FOOD ऐप चला सकते हैं।
                      </p>
                    </div>
                  ) : isInstallable ? (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={handleInstallClick}
                        className="w-full py-3.5 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black text-sm shadow-md transition flex items-center justify-center gap-2 group cursor-pointer"
                      >
                        <Download className="w-5 h-5 text-amber-200 group-hover:scale-110 transition" />
                        <span>अभी फोन में इंस्टॉल करें (1-Tap WebAPK)</span>
                      </button>
                      <p className="text-[10px] text-slate-500 text-center">
                        Google Chrome द्वारा तुरंत असली <strong>Android WebAPK</strong> फोन में इंस्टॉल हो जाएगा।
                      </p>
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-300 p-3.5 rounded-xl space-y-1.5">
                      <span className="font-bold text-slate-900 block text-xs">
                        3. मोबाइल ब्राउज़र से 10 सेकंड में ऐप इंस्टॉल करें:
                      </span>
                      <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-700">
                        <li>
                          अपने Android Chrome में ऊपर दाईं ओर <strong>3 डॉट्स (⋮)</strong> दबाएं।
                        </li>
                        <li>
                          मेनू में <strong>&apos;Install app&apos;</strong> या{' '}
                          <strong>&apos;Add to Home screen&apos;</strong> चुनें।
                        </li>
                        <li>
                          <strong>&apos;Install&apos;</strong> टैप करें — बिना ब्राउज़र बार के ऐप चलेगा।
                        </li>
                      </ol>
                    </div>
                  )}

                  {/* PWABuilder + WhatsApp Share Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <a
                      href={`https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(
                        shareableAppUrl
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shadow-xs text-center flex items-center justify-center gap-1.5 transition"
                    >
                      <span>PWABuilder .APK</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </a>

                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(shareableAppUrl);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2500);
                      }}
                      className="py-2 px-3 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs shadow-xs text-center flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>लिंक कॉपी हुआ!</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>स्टाफ को लिंक भेजें</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Right: QR Code for Mobile Scanning */}
                <div className="md:col-span-5 bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col items-center text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    मोबाइल से स्कैन करके ऐप खोलें
                  </span>

                  {qrCodeUrl ? (
                    <div className="bg-white p-2 rounded-xl border-2 border-amber-300 shadow-xs">
                      <img
                        src={qrCodeUrl}
                        alt="Scan to install"
                        className="w-32 h-32 object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-32 h-32 flex items-center justify-center bg-white rounded-xl border border-slate-200">
                      <QrCode className="w-8 h-8 text-slate-400" />
                    </div>
                  )}

                  <span className="text-[10px] text-slate-500 mt-2">
                    फोन कैमरा या Google Lens से स्कैन करें
                  </span>
                </div>
              </div>

              {/* Offline & Storage Highlight */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2.5 text-[11px] text-emerald-900">
                <HardDrive className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  <strong>100% फ्री लोकल + रियल-टाइम सिंक:</strong> ऑफ़लाइन लोकल स्टोरेज (₹0 क्लाउड बिल) व मल्टी-मोबाइल लाइव सिंक सपोर्ट।
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: API Version Download */}
          {activeTab === 'api' && (
            <div className="space-y-4">
              {/* API Info Header Box */}
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-purple-950 font-bold text-sm">
                    <FileJson className="w-4 h-4 text-purple-700" />
                    <span>
                      REST API v2.4.0 डेटा एक्सपोर्ट (Tally, Vyapar &amp; Software Integration)
                    </span>
                  </div>
                  <span className="text-[10px] bg-purple-200 text-purple-900 font-bold px-2 py-0.5 rounded-full font-mono">
                    JSON / REST
                  </span>
                </div>
                <p className="text-purple-800 text-[11px] leading-relaxed">
                  इस विकल्प से आप अपनी पूरी फैक्ट्री का डेटा <strong>REST API JSON</strong> प्रारूप में डाउनलोड कर सकते हैं। इसे आप Tally Prime, Vyapar, Marg ERP या किसी भी कस्टम सॉफ्टवेयर में आसानी से जोड़ सकते हैं।
                </p>
              </div>

              {/* Action Buttons for API Download */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleDownloadApi}
                  className="p-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold flex items-center justify-between shadow-md transition group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-white/20 rounded-lg group-hover:scale-105 transition">
                      <Download className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-left">
                      <span className="block text-xs">API वर्जन डाउनलोड करें (.JSON)</span>
                      <span className="block text-[10px] text-purple-200">
                        पूर्ण डेटाबेस + एंडपॉइंट्स
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-purple-200 group-hover:translate-x-1 transition" />
                </button>

                <button
                  type="button"
                  onClick={handleDownloadOpenApi}
                  className="p-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center justify-between shadow-md transition group border border-slate-700 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-white/10 rounded-lg group-hover:scale-105 transition">
                      <Code className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="text-left">
                      <span className="block text-xs">OpenAPI (Swagger) Spec डाउनलोड</span>
                      <span className="block text-[10px] text-slate-400">
                        डेवलपर्स व थर्ड पार्टी API
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition" />
                </button>
              </div>

              {/* Interactive Endpoint Selector & Live Preview */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                <div className="bg-slate-100 px-3.5 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-slate-700" />
                    <span className="font-bold text-slate-800 text-xs">
                      उपलब्ध REST API एंडपॉइंट्स (Available Endpoints):
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(JSON.stringify(currentPreviewData, null, 2), 'payload')
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-300 font-bold text-[10px] transition cursor-pointer"
                  >
                    {copiedPayload ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">कॉपी हो गया!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>JSON कॉपी करें</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Endpoint Pills */}
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-1.5">
                  {apiPayload &&
                    Object.keys(apiPayload.endpoints).map((ep) => {
                      const info = apiPayload.endpoints[ep];
                      const isSelected = previewEndpoint === ep;
                      return (
                        <button
                          key={ep}
                          type="button"
                          onClick={() => setPreviewEndpoint(ep)}
                          className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition flex items-center gap-1.5 cursor-pointer ${
                            isSelected
                              ? 'bg-purple-600 text-white font-bold shadow-xs'
                              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <span className="text-[9px] px-1 bg-black/20 rounded font-bold">GET</span>
                          <span>{ep}</span>
                          <span className="text-[10px] opacity-75 font-sans">
                            ({info.record_count})
                          </span>
                        </button>
                      );
                    })}
                </div>

                {/* Endpoint Meta */}
                {apiPayload && (
                  <div className="px-3.5 py-2 bg-slate-100/60 border-b border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
                    <div>
                      <strong className="text-slate-900">
                        {apiPayload.endpoints[previewEndpoint]?.descriptionHindi}
                      </strong>
                      <span className="text-slate-500 text-[10px] ml-1.5">
                        ({apiPayload.endpoints[previewEndpoint]?.description})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(previewEndpoint, 'endpoint', previewEndpoint)}
                      className="text-purple-700 hover:underline font-mono text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedEndpoint === previewEndpoint ? 'URL कॉपी हुआ!' : 'रूट कॉपी करें'}
                    </button>
                  </div>
                )}

                {/* JSON Code Box */}
                <div className="p-3 bg-slate-950 font-mono text-[11px] text-emerald-400 max-h-48 overflow-y-auto rounded-b-xl">
                  <pre className="whitespace-pre-wrap break-all">
                    {JSON.stringify(currentPreviewData, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Developer / Accounting Software Note */}
              <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 p-3 rounded-xl text-[11px] text-slate-600">
                <Info className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <span>
                  इस API JSON फ़ाइल में <strong>orders, inventory, wheatStock, customers, production, expenses</strong> सभी का स्ट्रक्चर्ड डेटा मौजूद है जिसे आप अपने अकाउंटिंग सॉफ्टवेयर में डायरेक्ट इम्पोर्ट कर सकते हैं।
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs shrink-0">
          <div className="text-slate-500 text-[11px] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>100% सुरक्षित • आपके फोन की मेमोरी में सुरक्षित</span>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'apk' ? (
              <button
                type="button"
                onClick={() => setActiveTab('api')}
                className="px-3 py-1.5 text-purple-700 font-bold hover:bg-purple-50 rounded-lg transition cursor-pointer"
              >
                API वर्जन देखें →
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveTab('apk')}
                className="px-3 py-1.5 text-amber-700 font-bold hover:bg-amber-50 rounded-lg transition cursor-pointer"
              >
                ← APK वर्जन देखें
              </button>
            )}

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
    </div>
  );
};
