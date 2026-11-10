import React, { useState, useEffect } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { AppDatabaseState } from '../utils/backup';
import { 
  downloadApiVersionJson, 
  downloadOpenApiSpec, 
  generateApiPayload 
} from '../utils/apiExport';
import { 
  Download, 
  Smartphone, 
  HardDrive, 
  ShieldCheck, 
  X, 
  CheckCircle2, 
  Sparkles,
  Code,
  FileJson,
  Copy,
  Check,
  QrCode,
  Layers,
  ArrowRight,
  Info
} from 'lucide-react';
import QRCode from 'qrcode';

interface InstallModalProps {
  onClose: () => void;
  currentState?: AppDatabaseState;
  initialTab?: 'apk' | 'api';
}

export const InstallModal: React.FC<InstallModalProps> = ({ 
  onClose, 
  currentState,
  initialTab = 'apk' 
}) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'apk' | 'api'>(initialTab);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null);
  const [copiedPayload, setCopiedPayload] = useState<boolean>(false);
  const [previewEndpoint, setPreviewEndpoint] = useState<string>('/api/v1/orders');

  const handleInstallClick = async () => {
    const success = await install();
    if (success) {
      onClose();
    }
  };

  // Generate QR code for opening / installing on mobile
  useEffect(() => {
    const generateQr = async () => {
      try {
        const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
        if (currentUrl) {
          const qr = await QRCode.toDataURL(currentUrl, {
            width: 220,
            margin: 1,
            color: { dark: '#0f172a', light: '#ffffff' },
          });
          setQrCodeUrl(qr);
        }
      } catch (err) {
        console.error('Failed to generate install QR:', err);
      }
    };
    generateQr();
  }, []);

  const handleCopy = (text: string, type: 'endpoint' | 'payload', endpointKey?: string) => {
    navigator.clipboard.writeText(text);
    if (type === 'payload') {
      setCopiedPayload(true);
      setTimeout(() => setCopiedPayload(false), 2000);
    } else if (endpointKey) {
      setCopiedEndpoint(endpointKey);
      setTimeout(() => setCopiedEndpoint(null), 2000);
    }
  };

  const handleDownloadApi = () => {
    if (!currentState) {
      alert('डेटा लोड हो रहा है, कृपया पुनः प्रयास करें।');
      return;
    }
    downloadApiVersionJson(currentState);
  };

  const handleDownloadOpenApi = () => {
    if (!currentState) {
      alert('डेटा लोड हो रहा है, कृपया पुनः प्रयास करें।');
      return;
    }
    downloadOpenApiSpec(currentState);
  };

  const apiPayload = currentState ? generateApiPayload(currentState) : null;
  const currentPreviewData = apiPayload?.endpoints[previewEndpoint]?.data || null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 text-slate-800 flex flex-col max-h-[90vh]">
        
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
                <span className="text-[10px] bg-emerald-500/80 text-slate-950 font-bold px-2 py-0.5 rounded-full">
                  v2.4.0
                </span>
              </div>
              <h2 className="text-lg font-bold text-white mt-0.5">
                TEJ FOOD - ऐप (APK) एवं API वर्जन डाउनलोड
              </h2>
            </div>
          </div>
          <button 
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
            <span>📱 एंड्रॉयड APK / मोबाइल ऐप इंस्टॉल</span>
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
          
          {/* TAB 1: Android APK / Mobile App */}
          {activeTab === 'apk' && (
            <div className="space-y-4">
              {/* Free & Local Storage Highlight Box */}
              <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                    <HardDrive className="w-4 h-4 text-emerald-700" />
                    <span>100% फ्री लोकल फोन स्टोरेज (₹0 क्लाउड चार्ज)</span>
                  </div>
                  <span className="text-[10px] bg-emerald-200 text-emerald-950 font-bold px-2 py-0.5 rounded-full">
                    No Server Bills
                  </span>
                </div>
                <p className="text-emerald-800 text-[11px] leading-relaxed">
                  यह ऐप पूरी तरह से फ्री है। आपकी मिल का संपूर्ण डेटा (गेहूं स्टॉक, आटा बैग, ग्राहक उधारी, पिसाई बैच व खर्चे) सीधे आपके फोन के इंटरनल स्टोरेज (LocalStorage) में सुरक्षित रहता है।
                </p>
              </div>

              {/* Install Actions */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                
                {/* Left: One Click Button or State */}
                <div className="md:col-span-7 space-y-3">
                  {isInstalled ? (
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-center space-y-1">
                      <CheckCircle2 className="w-8 h-8 text-blue-600 mx-auto" />
                      <p className="font-bold text-blue-900 text-sm">ऐप आपके फोन में पहले से इंस्टॉल है!</p>
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
                        <span>अभी Android मोबाइल में इंस्टॉल करें (Install App)</span>
                      </button>
                      <p className="text-[10px] text-slate-500 text-center">
                        बटन दबाते ही Google Chrome द्वारा असली <strong>Android WebAPK</strong> आपके फोन में इंस्टॉल हो जाएगा।
                      </p>
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-300 p-4 rounded-xl space-y-2">
                      <span className="font-bold text-slate-900 block text-xs">
                        Android फ़ोन पर सीधे इंस्टॉल करने का तरीका:
                      </span>
                      <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-700">
                        <li>अपने Android Chrome में ऊपर दाईं ओर <strong>3 डॉट्स (⋮)</strong> दबाएं।</li>
                        <li>मेनू में <strong>'Install app'</strong> या <strong>'Add to Home screen'</strong> चुनें।</li>
                        <li><strong>'Install'</strong> पर टैप करें। Tejstha आटा ऐप आपके फोन में आ जाएगा।</li>
                      </ol>
                    </div>
                  )}

                  {/* Feature Bullets */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5 text-[11px] text-slate-700">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span><strong>ऑफ़लाइन सपोर्ट:</strong> बिना इंटरनेट के भी बिलिंग व पिसाई दर्ज होगी।</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span><strong>अलग-अलग लॉगिन:</strong> स्टाफ व मुनीम अपने-अपने फोन से चला सकेंगे।</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span><strong>फुल स्क्रीन:</strong> बिना ब्राउज़र बार के असली Android ऐप अनुभव।</span>
                    </div>
                  </div>
                </div>

                {/* Right: QR Code for Mobile Scanning */}
                <div className="md:col-span-5 bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col items-center text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    मोबाइल से स्कैन करके ऐप खोलें
                  </span>
                  
                  {qrCodeUrl ? (
                    <div className="bg-white p-2 rounded-xl border-2 border-amber-300 shadow-xs">
                      <img src={qrCodeUrl} alt="Scan to install" className="w-32 h-32 object-contain" />
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
                    <span>REST API v2.4.0 डेटा एक्सपोर्ट (Tally, Vyapar & Software Integration)</span>
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
                  className="p-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold flex items-center justify-between shadow-md transition group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-white/20 rounded-lg group-hover:scale-105 transition">
                      <Download className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-left">
                      <span className="block text-xs">API वर्जन डाउनलोड करें (.JSON)</span>
                      <span className="block text-[10px] text-purple-200">पूर्ण डेटाबेस + एंडपॉइंट्स</span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-purple-200 group-hover:translate-x-1 transition" />
                </button>

                <button
                  type="button"
                  onClick={handleDownloadOpenApi}
                  className="p-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center justify-between shadow-md transition group border border-slate-700"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-white/10 rounded-lg group-hover:scale-105 transition">
                      <Code className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="text-left">
                      <span className="block text-xs">OpenAPI (Swagger) Spec डाउनलोड</span>
                      <span className="block text-[10px] text-slate-400">डेवलपर्स व थर्ड पार्टी API</span>
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
                    onClick={() => handleCopy(JSON.stringify(currentPreviewData, null, 2), 'payload')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-300 font-bold text-[10px] transition"
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
                  {apiPayload && Object.keys(apiPayload.endpoints).map((ep) => {
                    const info = apiPayload.endpoints[ep];
                    const isSelected = previewEndpoint === ep;
                    return (
                      <button
                        key={ep}
                        type="button"
                        onClick={() => setPreviewEndpoint(ep)}
                        className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-purple-600 text-white font-bold shadow-xs'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span className="text-[9px] px-1 bg-black/20 rounded font-bold">GET</span>
                        <span>{ep}</span>
                        <span className="text-[10px] opacity-75 font-sans">({info.record_count})</span>
                      </button>
                    );
                  })}
                </div>

                {/* Endpoint Meta */}
                {apiPayload && (
                  <div className="px-3.5 py-2 bg-slate-100/60 border-b border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
                    <div>
                      <strong className="text-slate-900">{apiPayload.endpoints[previewEndpoint]?.descriptionHindi}</strong>
                      <span className="text-slate-500 text-[10px] ml-1.5">({apiPayload.endpoints[previewEndpoint]?.description})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(previewEndpoint, 'endpoint', previewEndpoint)}
                      className="text-purple-700 hover:underline font-mono text-[10px] font-bold flex items-center gap-1"
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
                className="px-3 py-1.5 text-purple-700 font-bold hover:bg-purple-50 rounded-lg transition"
              >
                API वर्जन देखें →
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveTab('apk')}
                className="px-3 py-1.5 text-amber-700 font-bold hover:bg-amber-50 rounded-lg transition"
              >
                ← APK वर्जन देखें
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition"
            >
              बंद करें
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
