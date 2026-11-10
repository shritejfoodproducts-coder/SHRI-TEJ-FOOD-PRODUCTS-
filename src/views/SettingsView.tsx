import React, { useState, useRef, useEffect } from 'react';
import { CompanySettings, ProductMaster, BagSize } from '../types/erp';
import { 
  Settings, 
  Building2, 
  CreditCard, 
  Save, 
  CheckCircle2, 
  QrCode, 
  Upload, 
  HardDrive, 
  Smartphone, 
  Trash2,
  Image as ImageIcon,
  Check,
  Info
} from 'lucide-react';
import { getDeviceStorageStats } from '../utils/localStorageStats';
import QRCode from 'qrcode';

interface SettingsViewProps {
  settings: CompanySettings;
  products: ProductMaster[];
  onSaveSettings: (settings: CompanySettings) => void;
  onUpdateProductRate: (productId: string, bagSize: BagSize, rate: number) => void;
  onOpenInstallModal?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  products,
  onSaveSettings,
  onUpdateProductRate,
  onOpenInstallModal,
}) => {
  const [formData, setFormData] = useState<CompanySettings>(settings);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [previewDynamicQr, setPreviewDynamicQr] = useState<string>('');
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const storageStats = getDeviceStorageStats();

  // Active custom QR base64 string
  const activeQrBase64 = formData.qrCodeBase64 || formData.customQrCodeUrl || '';

  // Sync state if settings change externally
  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  // Generate dynamic QR preview from bank details
  useEffect(() => {
    const generatePreview = async () => {
      try {
        const upi = (formData.upiId || 'shritejfood@sbi').trim();
        const payee = formData.companyName || 'Shri Tej Food Products';
        const url = `upi://pay?pa=${encodeURIComponent(upi)}&pn=${encodeURIComponent(payee)}&cu=INR`;
        const qr = await QRCode.toDataURL(url, {
          width: 200,
          margin: 1,
          color: { dark: '#0f172a', light: '#ffffff' },
        });
        setPreviewDynamicQr(qr);
      } catch (e) {
        console.error(e);
      }
    };
    generatePreview();
  }, [formData.upiId, formData.companyName]);

  // Handle uploading QR image from phone's gallery and store as base64 in settings
  const handleGalleryImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('कृपया केवल इमेज (JPG, PNG, WebP) फ़ाइल चुनें।');
      return;
    }

    setIsProcessingImage(true);
    const reader = new FileReader();

    reader.onload = (event) => {
      const rawBase64 = event.target?.result as string;
      if (!rawBase64) {
        setIsProcessingImage(false);
        return;
      }

      // Optimize image dimensions on canvas to ensure base64 string remains lightweight (~25-40KB) for seamless localStorage persistence
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 450;
        let w = img.width;
        let h = img.height;

        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          // Export as compressed high-clarity base64 string
          const optimizedBase64 = canvas.toDataURL('image/jpeg', 0.88);

          const updatedSettings: CompanySettings = {
            ...formData,
            qrCodeBase64: optimizedBase64,
            customQrCodeUrl: optimizedBase64,
            qrCodeType: 'custom_image',
          };

          setFormData(updatedSettings);
          // Persist immediately in settings object so it survives refreshes & browser sessions in localStorage
          onSaveSettings(updatedSettings);
          setSavedSuccess(true);
          setIsProcessingImage(false);
          setTimeout(() => setSavedSuccess(false), 3000);
        }
      };

      img.onerror = () => {
        // Fallback to raw base64 if canvas processing fails
        const updatedSettings: CompanySettings = {
          ...formData,
          qrCodeBase64: rawBase64,
          customQrCodeUrl: rawBase64,
          qrCodeType: 'custom_image',
        };
        setFormData(updatedSettings);
        onSaveSettings(updatedSettings);
        setSavedSuccess(true);
        setIsProcessingImage(false);
        setTimeout(() => setSavedSuccess(false), 3000);
      };

      img.src = rawBase64;
    };

    reader.readAsDataURL(file);
    // Reset file input value so re-selecting same file triggers change
    e.target.value = '';
  };

  // Remove custom QR code and fall back to auto-generated UPI QR code
  const handleRemoveCustomQr = () => {
    const updatedSettings: CompanySettings = {
      ...formData,
      qrCodeBase64: '',
      customQrCodeUrl: '',
      qrCodeType: 'dynamic_upi',
    };
    setFormData(updatedSettings);
    onSaveSettings(updatedSettings);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Approximate size of saved base64 string
  const qrBase64SizeKb = activeQrBase64
    ? Math.round((activeQrBase64.length * (3 / 4)) / 1024)
    : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-amber-600" />
          <span>फैक्ट्री प्रोफाइल, QR कोड एवं सिस्टम सेटिंग्स (Company Settings)</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          कंपनी नाम, Tejstha आटा ब्रांड, GSTIN, FSSAI, बैंक खाता, कस्टम QR कोड (Base64) और फ्री लोकल स्टोरेज
        </p>
      </div>

      {savedSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-3.5 rounded-xl flex items-center gap-2 text-xs font-bold shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>कंपनी सेटिंग्स एवं QR कोड Base64 इमेज सफलतापूर्वक localStorage में सुरक्षित (Persisted) कर दी गई हैं!</span>
        </div>
      )}

      {/* Free Local Storage Status Card */}
      <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-slate-950 text-white rounded-2xl p-5 border border-emerald-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-600 text-white rounded-xl shadow-xs">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-emerald-300 uppercase">
                100% फ्री लोकल फोन स्टोरेज मोड एक्टिव
              </span>
              <span className="text-[10px] bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full font-bold">
                NO CLOUD
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              क्लाउड का उपयोग न करके सारा डेटा (स्टॉक, बिल, ग्राहक, खर्चे, qrCodeBase64) सीधे आपके फोन के इंटरनल स्टोरेज में सुरक्षित है। कोई सर्वर या मासिक चार्ज नहीं।
            </p>
            <div className="mt-2 flex items-center gap-4 text-[11px] text-emerald-200">
              <span>उपयोग: <strong>{storageStats.usedFormatted}</strong></span>
              <span>कुल रिकॉर्ड्स: <strong>{storageStats.totalRecordsCount}</strong></span>
              <span>क्लाउड चार्ज: <strong>₹0.00 (शून्य)</strong></span>
            </div>
          </div>
        </div>

        {onOpenInstallModal && (
          <button
            type="button"
            onClick={onOpenInstallModal}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-black text-xs transition shadow-md shrink-0"
          >
            <Smartphone className="w-4 h-4" />
            <span>फ़ोन में ऐप (APK) / API डाउनलोड</span>
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 text-xs text-slate-800">
        
        {/* Section 1: Customer Payment QR Code (Gallery File Upload & Base64 Persistence) */}
        <div className="bg-white rounded-2xl border-2 border-amber-300/80 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-500 text-slate-950 rounded-xl">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  ग्राहक पेमेंट QR कोड (qrCodeBase64 File Upload)
                </h3>
                <p className="text-[11px] text-slate-500">
                  फ़ोन गैलरी से QR कोड इमेज चुनें। यह <code className="font-mono font-bold text-slate-800">qrCodeBase64</code> स्ट्रिंग के रूप में LocalStorage में सुरक्षित रहेगा।
                </p>
              </div>
            </div>

            {activeQrBase64 ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                <Check className="w-3.5 h-3.5" />
                <span>कस्टम QR सक्रिय ({qrBase64SizeKb} KB Base64)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                <span>ऑटो डायनामिक UPI QR सक्रिय</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            
            {/* Gallery File Upload Input Box */}
            <div className="md:col-span-7 space-y-3">
              <label 
                htmlFor="qr-file-input" 
                className="block font-bold text-slate-700 text-xs"
              >
                फ़ोन गैलरी से QR कोड इमेज चुनें (Select QR code from phone gallery) *
              </label>

              {/* Native File Input for QR code image selection */}
              <div className="space-y-2">
                <input
                  id="qr-file-input"
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleGalleryImageSelect}
                  className="block w-full text-xs text-slate-600 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-900 file:text-white hover:file:bg-slate-800 file:cursor-pointer cursor-pointer border border-slate-300 rounded-xl bg-slate-50 p-1.5 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Drag & Drop / Gallery Picker Container */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`p-4 rounded-2xl border-2 border-dashed transition cursor-pointer flex flex-col items-center justify-center text-center gap-2 group ${
                  activeQrBase64
                    ? 'border-emerald-300 bg-emerald-50/30 hover:bg-emerald-50/60'
                    : 'border-slate-300 hover:border-amber-500 bg-slate-50/80 hover:bg-amber-50/30'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center group-hover:scale-105 transition shadow-xs">
                  <ImageIcon className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 block text-xs">
                    {activeQrBase64
                      ? 'गैलरी से दूसरा QR कोड इमेज चुनें'
                      : 'फ़ोन गैलरी से QR कोड इमेज फ़ाइल चुनें'}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    PhonePe, Paytm, Google Pay, SBI Standee QR (JPG, PNG, WebP)
                  </span>
                </div>
                <button
                  type="button"
                  disabled={isProcessingImage}
                  className="mt-0.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isProcessingImage ? 'प्रोसेसिंग...' : 'गैलरी से फ़ाइल चुनें'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  फ़ाइल चुनते ही इमेज <strong>Base64 स्ट्रिंग</strong> में बदलकर <code className="font-mono text-purple-700 font-bold">companySettings.qrCodeBase64</code> में सेव हो जाती है और सभी इनवॉइस पर स्वतः दिखती है।
                </span>
              </div>
            </div>

            {/* Current Active QR Code Display & Preview */}
            <div className="md:col-span-5 bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col items-center text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                इनवॉइस पर दिखने वाला QR कोड
              </span>

              {activeQrBase64 ? (
                <div className="relative">
                  <div className="bg-white p-2 rounded-xl border-2 border-emerald-400 shadow-md">
                    <img
                      src={activeQrBase64}
                      alt="Custom Payment QR Code"
                      className="w-36 h-36 object-contain rounded-lg"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCustomQr}
                    className="absolute -top-2 -right-2 p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-md transition"
                    title="कस्टम QR हटाएँ"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="bg-white p-2 rounded-xl border border-slate-300 shadow-xs">
                  {previewDynamicQr ? (
                    <img
                      src={previewDynamicQr}
                      alt="Auto Generated Dynamic QR"
                      className="w-36 h-36 object-contain rounded-lg"
                    />
                  ) : (
                    <div className="w-36 h-36 flex items-center justify-center text-slate-400">
                      <QrCode className="w-10 h-10" />
                    </div>
                  )}
                </div>
              )}

              <div className="mt-2 text-center">
                <span className="font-bold text-xs text-slate-900 block">
                  {activeQrBase64 ? 'कस्टम गैलरी QR (qrCodeBase64)' : 'ऑटो UPI QR'}
                </span>
                <span className="font-mono text-[10px] text-purple-700 font-semibold block">
                  {formData.upiId || 'shritejfood@sbi'}
                </span>
              </div>

              {activeQrBase64 && (
                <button
                  type="button"
                  onClick={handleRemoveCustomQr}
                  className="mt-2 text-[11px] text-rose-600 hover:text-rose-700 font-bold underline"
                >
                  कस्टम QR हटाएं व डिफ़ॉल्ट UPI QR चालू करें
                </button>
              )}
            </div>

          </div>
        </div>

        {/* Section 2: Company Profile */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-600" />
            <span>कंपनी व ब्रांड पहचान (Company & Brand Details)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">कंपनी का नाम *</label>
              <input
                type="text"
                required
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-sm"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">आटा ब्रांड नाम *</label>
              <input
                type="text"
                required
                value={formData.brandName}
                onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-sm text-amber-700"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">प्रोपराइटर / मालिक का नाम *</label>
              <input
                type="text"
                value={formData.proprietor}
                onChange={(e) => setFormData({ ...formData, proprietor: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">संपर्क मोबाइल नंबर *</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">फैक्ट्री का पूरा पता *</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">GSTIN नंबर (टैक्स इनवॉइस हेतु)</label>
              <input
                type="text"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono uppercase font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">FSSAI खाद्य सुरक्षा लाइसेंस नंबर</label>
              <input
                type="text"
                value={formData.fssaiNumber}
                onChange={(e) => setFormData({ ...formData, fssaiNumber: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Bank & UPI Info */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-600" />
            <span>बैंक व UPI भुगतान सेटिंग्स (Invoice Bank Information)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">बैंक का नाम *</label>
              <input
                type="text"
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">खाता नंबर (Account No.) *</label>
              <input
                type="text"
                value={formData.accountNumber}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">IFSC कोड *</label>
              <input
                type="text"
                value={formData.ifscCode}
                onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono uppercase font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">UPI ID (PhonePe / GPay) *</label>
              <input
                type="text"
                value={formData.upiId}
                onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-purple-700"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md transition"
          >
            <Save className="w-4 h-4" />
            <span>सेटिंग्स सुरक्षित करें</span>
          </button>
        </div>
      </form>

      {/* Section 4: Product Master Rates Management */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div>
          <h3 className="font-bold text-sm text-slate-900">
            प्रोडक्ट मास्टर एवं सेलिंग दरें (Default Selling Rates per Bag)
          </h3>
          <p className="text-slate-500 text-xs">
            यहाँ से आप 5 KG, 10 KG, 25 KG व 50 KG बैग की मानक विक्रय दरें बदल सकते हैं:
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">प्रोडक्ट</th>
                <th className="py-2.5 px-3 text-center">5 KG (₹)</th>
                <th className="py-2.5 px-3 text-center">10 KG (₹)</th>
                <th className="py-2.5 px-3 text-center">25 KG (₹)</th>
                <th className="py-2.5 px-3 text-center">50 KG (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="py-3 px-3">
                    <span className="font-bold text-slate-900 block">{p.nameHindi}</span>
                    <span className="text-[10px] text-slate-500">{p.brand}</span>
                  </td>
                  {([5, 10, 25, 50] as BagSize[]).map((size) => (
                    <td key={size} className="py-3 px-3 text-center">
                      <div className="inline-flex items-center gap-1">
                        <span className="text-slate-400 font-mono">₹</span>
                        <input
                          type="number"
                          value={p.rates[size]}
                          onChange={(e) => onUpdateProductRate(p.id, size, Number(e.target.value) || 0)}
                          className="w-20 px-2 py-1 text-xs border border-slate-300 rounded-lg text-center font-mono font-bold"
                        />
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
