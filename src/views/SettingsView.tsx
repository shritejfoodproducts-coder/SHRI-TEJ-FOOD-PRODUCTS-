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
  Info,
  Cloud,
  Database,
  HardDriveDownload,
  RotateCcw,
  Users,
  Store,
  Package,
  UserCheck,
  Briefcase,
  FileSpreadsheet,
  ArrowRight,
  Plus,
  Edit3,
  X,
} from 'lucide-react';
import { getDeviceStorageStats } from '../utils/localStorageStats';
import { exportDatabaseBackup, importDatabaseBackup, AppDatabaseState } from '../utils/backup';
import type { SyncConnectionStatus } from '../hooks/useFirestoreErpSync';
import type { ActiveTab } from '../components/Sidebar';
import QRCode from 'qrcode';

interface SettingsViewProps {
  settings: CompanySettings;
  products: ProductMaster[];
  syncStatus?: SyncConnectionStatus;
  connectedDevicesCount?: number;
  currentAppState?: AppDatabaseState;
  onSaveSettings: (settings: CompanySettings) => void;
  onUpdateProductRate: (productId: string, bagSize: BagSize, rate: number) => void;
  onAddProduct?: (product: ProductMaster) => void;
  onUpdateProduct?: (product: ProductMaster) => void;
  onDeleteProduct?: (productId: string) => void;
  onNavigate?: (tab: ActiveTab) => void;
  onRestoreState?: (state: AppDatabaseState) => void;
  onResetFactorySeeds?: () => void;
  onOpenInstallModal?: () => void;
  onOpenLiveSync?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  products,
  syncStatus = 'connecting',
  connectedDevicesCount = 1,
  currentAppState,
  onSaveSettings,
  onUpdateProductRate,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onNavigate,
  onRestoreState,
  onResetFactorySeeds,
  onOpenInstallModal,
  onOpenLiveSync,
}) => {
  const [formData, setFormData] = useState<CompanySettings>(settings);
  const [rateDrafts, setRateDrafts] = useState<Record<string, Record<BagSize, number>>>(() => {
    const init: Record<string, Record<BagSize, number>> = {};
    products.forEach((p) => {
      init[p.id] = { ...p.rates };
    });
    return init;
  });
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [previewDynamicQr, setPreviewDynamicQr] = useState<string>('');
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupFileInputRef = useRef<HTMLInputElement>(null);

  // Add / Edit Product (Atta Type / Custom Item) Modal State
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [prodNameHindi, setProdNameHindi] = useState('');
  const [prodNameEn, setProdNameEn] = useState('');
  const [prodBrand, setProdBrand] = useState('');
  const [prodHsn, setProdHsn] = useState('1101');
  const [prodDesc, setProdDesc] = useState('');
  const [prodRates, setProdRates] = useState<Record<BagSize, number>>({
    5: 180,
    10: 350,
    25: 850,
    50: 1650,
  });
  const [prodCostRates, setProdCostRates] = useState<Record<BagSize, number>>({
    5: 145,
    10: 285,
    25: 700,
    50: 1360,
  });

  const storageStats = getDeviceStorageStats();
  const activeQrBase64 = formData.qrCodeBase64 || formData.customQrCodeUrl || '';

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  useEffect(() => {
    const nextDrafts: Record<string, Record<BagSize, number>> = {};
    products.forEach((p) => {
      nextDrafts[p.id] = { ...p.rates };
    });
    setRateDrafts(nextDrafts);
  }, [products]);

  const showToast = (msg: string) => {
    setSavedMessage(msg);
    window.setTimeout(() => {
      setSavedMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

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
      showToast('कृपया केवल इमेज (JPG, PNG, WebP) फ़ाइल चुनें।');
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
          const optimizedBase64 = canvas.toDataURL('image/jpeg', 0.88);

          const updatedSettings: CompanySettings = {
            ...formData,
            qrCodeBase64: optimizedBase64,
            customQrCodeUrl: optimizedBase64,
            qrCodeType: 'custom_image',
          };

          setFormData(updatedSettings);
          onSaveSettings(updatedSettings);
          setIsProcessingImage(false);
          showToast('कस्टम पेमेंट QR कोड सफलतापूर्वक अपडेट व सुरक्षित हो गया!');
        }
      };

      img.onerror = () => {
        const updatedSettings: CompanySettings = {
          ...formData,
          qrCodeBase64: rawBase64,
          customQrCodeUrl: rawBase64,
          qrCodeType: 'custom_image',
        };
        setFormData(updatedSettings);
        onSaveSettings(updatedSettings);
        setIsProcessingImage(false);
        showToast('कस्टम पेमेंट QR कोड सफलतापूर्वक अपडेट व सुरक्षित हो गया!');
      };

      img.src = rawBase64;
    };

    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveCustomQr = () => {
    const updatedSettings: CompanySettings = {
      ...formData,
      qrCodeBase64: '',
      customQrCodeUrl: '',
      qrCodeType: 'dynamic_upi',
    };
    setFormData(updatedSettings);
    onSaveSettings(updatedSettings);
    showToast('कस्टम QR हटाया गया। अब UPI ID से ऑटो डायनामिक QR दिखेगा।');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned: CompanySettings = {
      ...formData,
      companyName: formData.companyName.trim(),
      brandName: formData.brandName.trim(),
      proprietor: formData.proprietor.trim(),
      address: formData.address.trim(),
      phone: formData.phone.trim(),
      email: (formData.email || '').trim(),
      gstin: (formData.gstin || '').trim().toUpperCase(),
      fssaiNumber: (formData.fssaiNumber || '').trim(),
      bankName: formData.bankName.trim(),
      accountNumber: formData.accountNumber.trim(),
      ifscCode: formData.ifscCode.trim().toUpperCase(),
      upiId: formData.upiId.trim(),
      defaultGstRate: Number(formData.defaultGstRate) || 0,
      autoBackupDays: Number(formData.autoBackupDays) || 1,
    };
    setFormData(cleaned);
    onSaveSettings(cleaned);
    showToast('फैक्ट्री का नाम, पता, बैंक खाता, UPI ID व सभी सेटिंग्स सफलतापूर्वक अपडेट हो गईं!');
  };

  const handleSaveAllProductRates = () => {
    let changedCount = 0;
    products.forEach((p) => {
      const draft = rateDrafts[p.id];
      if (!draft) return;
      ([5, 10, 25, 50] as BagSize[]).forEach((size) => {
        const nextVal = Number(draft[size]) || 0;
        if (nextVal !== p.rates[size]) {
          onUpdateProductRate(p.id, size, nextVal);
          changedCount += 1;
        }
      });
    });
    showToast(
      changedCount > 0
        ? `आटा बैग की ${changedCount} नई दरें सफलतापूर्वक अपडेट कर दी गईं!`
        : 'सभी प्रोडक्ट दरें पहले से अपडेट हैं।'
    );
  };

  const handleBackupRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onRestoreState) return;
    try {
      const restored = await importDatabaseBackup(file);
      onRestoreState(restored);
      showToast('बैकअप फ़ाइल से सारा डेटा सफलतापूर्वक रीस्टोर व सिंक कर दिया गया!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'अमान्य बैकअप फ़ाइल';
      showToast(`बैकअप त्रुटि: ${msg}`);
    } finally {
      e.target.value = '';
    }
  };

  const qrBase64SizeKb = activeQrBase64
    ? Math.round((activeQrBase64.length * (3 / 4)) / 1024)
    : 0;

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-amber-600 shrink-0" />
            <span>फैक्ट्री सेटिंग्स एवं डेटा प्रबंधन (Factory Settings)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            यहाँ से कंपनी नाम, ब्रांड, पता, मोबाइल, ईमेल, GSTIN, बैंक खाता नंबर, UPI ID, QR कोड, प्रोडक्ट रेट और पूरा डेटा अपडेट करें
          </p>
        </div>
      </div>

      {/* Save Success Toast */}
      {savedMessage && (
        <div className="sticky top-16 z-30 bg-emerald-50 border-2 border-emerald-400 text-emerald-900 p-3.5 rounded-xl flex items-center gap-2 text-xs font-bold shadow-md">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{savedMessage}</span>
        </div>
      )}

      {/* Sync & Storage Status Card */}
      <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-slate-950 text-white rounded-2xl p-5 border border-emerald-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-600 text-white rounded-xl shadow-xs shrink-0">
            {syncStatus === 'connected' ? <Cloud className="w-6 h-6" /> : <HardDrive className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-black text-emerald-300 uppercase">
                {syncStatus === 'connected'
                  ? 'लाइव क्लाउड + लोकल डेटा सिंक एक्टिव'
                  : 'लोकल स्टोरेज सुरक्षित मोड एक्टिव'}
              </span>
              <span className="text-[10px] bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full font-bold">
                {syncStatus === 'connected' ? `${connectedDevicesCount} डिवाइस लाइव` : 'OFFLINE READY'}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              यहाँ से सेव की गई हर फैक्ट्री जानकारी (नाम, पता, बैंक अकाउंट, UPI ID, QR व रेट) तुरंत सभी बिल/इनवॉइस, WhatsApp शेयर और जुड़े मोबाइल डिवाइस पर अपडेट हो जाती है।
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-emerald-200">
              <span>लोकल उपयोग: <strong>{storageStats.usedFormatted}</strong></span>
              <span>कुल रिकॉर्ड्स: <strong>{storageStats.totalRecordsCount}</strong></span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          {onOpenLiveSync && (
            <button
              type="button"
              onClick={onOpenLiveSync}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-black text-xs transition shadow-md cursor-pointer"
            >
              <Smartphone className="w-4 h-4" />
              <span>लाइव सिंक / Google कनेक्ट</span>
            </button>
          )}
          {onOpenInstallModal && (
            <button
              type="button"
              onClick={onOpenInstallModal}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-black text-xs transition shadow-md cursor-pointer"
            >
              <Smartphone className="w-4 h-4" />
              <span>फ़ोन में ऐप / APK</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Editable Factory Form */}
      <form onSubmit={handleSubmit} className="space-y-6 text-xs text-slate-800">
        {/* Section 1: Company Profile */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-600" />
              <span>1. फैक्ट्री / कंपनी पहचान व पूरा पता (Factory Details)</span>
            </h3>
            <span className="text-[11px] text-slate-500 font-medium">
              सभी GST बिल व चालान पर यही विवरण छपेगा
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">कंपनी / फैक्ट्री का नाम *</label>
              <input
                type="text"
                required
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                placeholder="जैसे: Shri Tej Food Products"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">आटा ब्रांड नाम *</label>
              <input
                type="text"
                required
                value={formData.brandName}
                onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                placeholder="जैसे: Tejstha (तेजस्था)"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-sm text-amber-700 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">प्रोपराइटर / मालिक का नाम *</label>
              <input
                type="text"
                required
                value={formData.proprietor}
                onChange={(e) => setFormData({ ...formData, proprietor: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">फैक्ट्री संपर्क मोबाइल नंबर *</label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98290 12345"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">फैक्ट्री ईमेल आईडी (Email)</label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="shritejfoodproducts@gmail.com"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">डिफ़ॉल्ट GST दर (%)</label>
              <input
                type="number"
                min={0}
                max={28}
                step={0.5}
                value={formData.defaultGstRate ?? 5}
                onChange={(e) =>
                  setFormData({ ...formData, defaultGstRate: Number(e.target.value) || 0 })
                }
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">फैक्ट्री का पूरा पता (Factory Address) *</label>
              <textarea
                rows={2}
                required
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="प्लॉट नंबर, इंडस्ट्रियल एरिया, शहर, राज्य व पिनकोड"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">GSTIN नंबर (टैक्स इनवॉइस हेतु)</label>
              <input
                type="text"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono uppercase font-bold focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">FSSAI खाद्य सुरक्षा लाइसेंस नंबर</label>
              <input
                type="text"
                value={formData.fssaiNumber}
                onChange={(e) => setFormData({ ...formData, fssaiNumber: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Bank & UPI Info */}
        <div className="bg-white rounded-2xl border-2 border-emerald-200/80 p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>2. बैंक खाता नंबर एवं UPI ID विवरण (Bank Account & UPI)</span>
            </h3>
            <span className="text-[11px] text-emerald-700 font-semibold">
              इनवॉइस, WhatsApp लिंक व कस्टमर खाते में दिखेगा
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">बैंक व शाखा का नाम *</label>
              <input
                type="text"
                required
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">बैंक खाता नंबर (Account No.) *</label>
              <input
                type="text"
                required
                value={formData.accountNumber}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">IFSC कोड *</label>
              <input
                type="text"
                required
                value={formData.ifscCode}
                onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono uppercase font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">UPI ID (PhonePe / GPay / Paytm) *</label>
              <input
                type="text"
                required
                value={formData.upiId}
                onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                placeholder="example@sbi"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-sm text-purple-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs sm:text-sm rounded-xl shadow-md transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>फैक्ट्री नाम, पता, बैंक व UPI सेटिंग्स सेव करें</span>
            </button>
          </div>
        </div>

        {/* Section 3: Customer Payment QR Code */}
        <div className="bg-white rounded-2xl border-2 border-amber-300/80 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-500 text-slate-950 rounded-xl">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  3. ग्राहक पेमेंट QR कोड (कस्टम अपलोड या ऑटो UPI QR)
                </h3>
                <p className="text-[11px] text-slate-500">
                  फ़ोन गैलरी से अपनी दुकान का QR कोड अपलोड करें या ऊपर भरे गए UPI ID से ऑटो QR उपयोग करें
                </p>
              </div>
            </div>

            {activeQrBase64 ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                <Check className="w-3.5 h-3.5" />
                <span>कस्टम QR सक्रिय ({qrBase64SizeKb} KB)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                <span>ऑटो डायनामिक UPI QR सक्रिय</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-7 space-y-3">
              <label htmlFor="qr-file-input" className="block font-bold text-slate-700 text-xs">
                फ़ोन गैलरी से QR कोड इमेज चुनें (PhonePe / GPay / SBI Standee)
              </label>

              <input
                id="qr-file-input"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleGalleryImageSelect}
                className="block w-full text-xs text-slate-600 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-900 file:text-white hover:file:bg-slate-800 file:cursor-pointer cursor-pointer border border-slate-300 rounded-xl bg-slate-50 p-1.5 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />

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
                    {activeQrBase64 ? 'गैलरी से दूसरा QR कोड इमेज चुनें' : 'फ़ोन गैलरी से QR कोड इमेज फ़ाइल चुनें'}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">JPG, PNG, WebP</span>
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
                  इमेज चुनते ही QR कोड तुरंत सेव हो जाता है और सभी बिल/इनवॉइस पर दिखने लगता है।
                </span>
              </div>
            </div>

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
                  {activeQrBase64 ? 'कस्टम गैलरी QR' : 'ऑटो UPI QR'}
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
      </form>

      {/* Section 4: Atta Types & Custom Items Master (Add / Edit / Delete / Rates) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-slate-900">
              4. आटा के प्रकार, अन्य आइटम्स व विक्रय दरें (Atta Types & Items Master)
            </h3>
            <p className="text-slate-500 text-xs">
              नया आटा/आइटम (सूजी, मैदा, बेसन, दलिया आदि) जोड़ें, नाम/रेट एडिट करें या हटाएँ:
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onAddProduct && (
              <button
                type="button"
                onClick={() => {
                  setEditingProductId(null);
                  setProdNameHindi('');
                  setProdNameEn('');
                  setProdBrand(settings.brandName ? `${settings.brandName.split(' ')[0]} Special` : 'Tejstha Special');
                  setProdHsn('1101');
                  setProdDesc('');
                  setProdRates({ 5: 180, 10: 350, 25: 850, 50: 1650 });
                  setProdCostRates({ 5: 145, 10: 285, 25: 700, 50: 1360 });
                  setShowProductModal(true);
                }}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ नया आटा / आइटम जोड़ें</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleSaveAllProductRates}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>दरें सुरक्षित करें</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">आटा / आइटम का नाम</th>
                <th className="py-2.5 px-3 text-center">5 KG (₹)</th>
                <th className="py-2.5 px-3 text-center">10 KG (₹)</th>
                <th className="py-2.5 px-3 text-center">25 KG (₹)</th>
                <th className="py-2.5 px-3 text-center">50 KG (₹)</th>
                {(onUpdateProduct || onDeleteProduct) && (
                  <th className="py-2.5 px-3 text-center">एडिट / हटाएँ</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="py-3 px-3 min-w-[170px]">
                    <span className="font-bold text-slate-900 block">{p.nameHindi}</span>
                    <span className="text-[10px] text-slate-500 block">
                      {p.brand} {p.hsnCode ? `• HSN: ${p.hsnCode}` : ''}
                    </span>
                    {p.nameEn && (
                      <span className="text-[10px] text-slate-400 block">{p.nameEn}</span>
                    )}
                  </td>
                  {([5, 10, 25, 50] as BagSize[]).map((size) => (
                    <td key={size} className="py-3 px-3 text-center">
                      <div className="inline-flex items-center gap-1">
                        <span className="text-slate-400 font-mono">₹</span>
                        <input
                          type="number"
                          min={0}
                          value={rateDrafts[p.id]?.[size] ?? p.rates[size]}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            setRateDrafts((prev) => ({
                              ...prev,
                              [p.id]: {
                                ...(prev[p.id] || p.rates),
                                [size]: val,
                              },
                            }));
                          }}
                          className="w-20 px-2 py-1.5 text-xs border border-slate-300 rounded-lg text-center font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </td>
                  ))}
                  {(onUpdateProduct || onDeleteProduct) && (
                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        {onUpdateProduct && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingProductId(p.id);
                              setProdNameHindi(p.nameHindi);
                              setProdNameEn(p.nameEn);
                              setProdBrand(p.brand);
                              setProdHsn(p.hsnCode || '1101');
                              setProdDesc(p.description || '');
                              setProdRates({ ...p.rates });
                              setProdCostRates({ ...p.costRates });
                              setShowProductModal(true);
                            }}
                            className="p-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg transition cursor-pointer"
                            title="आइटम नाम, ब्रांड व रेट एडिट करें"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onDeleteProduct && (
                          <button
                            type="button"
                            disabled={products.length <= 1}
                            onClick={() => {
                              if (products.length <= 1) {
                                showToast('कम से कम 1 आटा/प्रोडक्ट होना जरूरी है।');
                                return;
                              }
                              if (
                                window.confirm(
                                  `क्या आप "${p.nameHindi}" को लिस्ट से हटाना चाहते हैं?`
                                )
                              ) {
                                onDeleteProduct(p.id);
                                showToast(`"${p.nameHindi}" आइटम सफलतापूर्वक हटा दिया गया!`);
                              }
                            }}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            title={
                              products.length <= 1
                                ? 'कम से कम 1 आइटम होना जरूरी है'
                                : 'आइटम हटाएँ'
                            }
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 5: All Data & Modules Update Hub */}
      {onNavigate && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-600" />
              <span>5. फैक्ट्री का सारा डेटा अपडेट व प्रबंधन केंद्र (All Data Center)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              स्टाफ, सेल्समैन कमीशन, स्टॉक, ग्राहक, डीलर और बैकअप सहित हर रिकॉर्ड को सीधे यहाँ से अपडेट करें:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            <button
              type="button"
              onClick={() => onNavigate('staff')}
              className="p-3.5 rounded-xl border border-slate-200 hover:border-amber-400 bg-slate-50 hover:bg-amber-50/40 text-left flex items-center justify-between gap-2 transition cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-100 text-amber-800">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 block">स्टाफ व पासवर्ड अपडेट</span>
                  <span className="text-[11px] text-slate-500">स्टाफ मोबाइल, पासवर्ड, अधिकार व सैलरी</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('salesman_ledger')}
              className="p-3.5 rounded-xl border border-slate-200 hover:border-amber-400 bg-slate-50 hover:bg-amber-50/40 text-left flex items-center justify-between gap-2 transition cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-purple-100 text-purple-800">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 block">सेल्समैन व कमीशन सेटिंग</span>
                  <span className="text-[11px] text-slate-500">सेल्समैन कमीशन %, प्रति बैग व मासिक लेखा</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('inventory')}
              className="p-3.5 rounded-xl border border-slate-200 hover:border-amber-400 bg-slate-50 hover:bg-amber-50/40 text-left flex items-center justify-between gap-2 transition cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 block">गेहूँ व बैग स्टॉक अपडेट</span>
                  <span className="text-[11px] text-slate-500">कच्चा गेहूँ, खाली बैग व तैयार स्टॉक</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('wholesale_dealers')}
              className="p-3.5 rounded-xl border border-slate-200 hover:border-amber-400 bg-slate-50 hover:bg-amber-50/40 text-left flex items-center justify-between gap-2 transition cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-800">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 block">होलसेल डीलर्स डेटा</span>
                  <span className="text-[11px] text-slate-500">डीलर खाता, लोकेशन, दुकान फोटो व बकाया</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('retail_customers')}
              className="p-3.5 rounded-xl border border-slate-200 hover:border-amber-400 bg-slate-50 hover:bg-amber-50/40 text-left flex items-center justify-between gap-2 transition cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-teal-100 text-teal-800">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 block">रिटेल कस्टमर्स डेटा</span>
                  <span className="text-[11px] text-slate-500">दुकानदार नाम, पता, मैप पिन व भुगतान</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="p-3.5 rounded-xl border border-slate-200 hover:border-amber-400 bg-slate-50 hover:bg-amber-50/40 text-left flex items-center justify-between gap-2 transition cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-slate-200 text-slate-800">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 block">Excel रिपोर्ट्स व बैकअप</span>
                  <span className="text-[11px] text-slate-500">मास्टर एक्सेल शीट व API एक्सपोर्ट</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
            </button>
          </div>
        </div>
      )}

      {/* Section 6: Full Database Backup, Restore & Reset */}
      {(currentAppState || onRestoreState || onResetFactorySeeds) && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div>
            <h3 className="font-bold text-sm text-slate-900">
              6. पूरा डेटाबेस बैकअप, रीस्टोर व रीसेट (Full Data Backup & Restore)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              अपने पूरे फैक्ट्री डेटा का JSON बैकअप सुरक्षित रखें या किसी पुरानी बैकअप फ़ाइल से सारा डेटा अपडेट करें
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {currentAppState && (
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-slate-900 block">पूरा डेटा बैकअप डाउनलोड (.JSON)</span>
                  <span className="text-[11px] text-slate-500">सेटिंग्स, ग्राहक, ऑर्डर, स्टॉक व स्टाफ</span>
                </div>
                <button
                  type="button"
                  onClick={() => exportDatabaseBackup(currentAppState)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition shrink-0 cursor-pointer"
                >
                  <HardDriveDownload className="w-4 h-4 text-emerald-400" />
                  <span>डाउनलोड</span>
                </button>
              </div>
            )}

            {onRestoreState && (
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-slate-900 block">बैकअप फ़ाइल से डेटा रीस्टोर</span>
                  <span className="text-[11px] text-slate-500">.json फ़ाइल चुनकर पूरा डेटा अपडेट करें</span>
                </div>
                <div>
                  <input
                    ref={backupFileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleBackupRestoreFile}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => backupFileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition shrink-0 cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>फ़ाइल चुनें</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {onResetFactorySeeds && (
            <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="text-slate-500">
                <span className="text-rose-600 font-bold block">डेटा रीसेट विकल्प (Factory Reset):</span>
                <span>सारा डेमो/मौजूदा डेटा हटाकर प्रारंभिक फैक्ट्री डिफ़ॉल्ट स्थिति पर वापस लाएँ</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      'क्या आप सचमुच डेटाबेस को प्रारंभिक फैक्ट्री स्थिति पर रीसेट करना चाहते हैं?'
                    )
                  ) {
                    onResetFactorySeeds();
                    showToast('फैक्ट्री डेटा सफलतापूर्वक रीसेट कर दिया गया!');
                  }
                }}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl font-bold transition shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>डेटा रीसेट करें</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal: Add or Edit Atta Type / Custom Item */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm sm:text-base">
                  {editingProductId
                    ? 'आटा / आइटम विवरण एडिट करें'
                    : 'नया आटा या अन्य आइटम जोड़ें'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const cleanHindi = prodNameHindi.trim();
                if (!cleanHindi) return;
                const cleanEn = prodNameEn.trim() || cleanHindi;
                const productObj: ProductMaster = {
                  id: editingProductId || `prod-${Date.now()}`,
                  nameHindi: cleanHindi,
                  nameEn: cleanEn,
                  brand: prodBrand.trim() || 'Tejstha Special',
                  hsnCode: prodHsn.trim() || '1101',
                  description: prodDesc.trim(),
                  rates: {
                    5: Number(prodRates[5]) || 0,
                    10: Number(prodRates[10]) || 0,
                    25: Number(prodRates[25]) || 0,
                    50: Number(prodRates[50]) || 0,
                  },
                  costRates: {
                    5: Number(prodCostRates[5]) || Math.round((Number(prodRates[5]) || 0) * 0.8),
                    10: Number(prodCostRates[10]) || Math.round((Number(prodRates[10]) || 0) * 0.8),
                    25: Number(prodCostRates[25]) || Math.round((Number(prodRates[25]) || 0) * 0.8),
                    50: Number(prodCostRates[50]) || Math.round((Number(prodRates[50]) || 0) * 0.8),
                  },
                };

                if (editingProductId && onUpdateProduct) {
                  onUpdateProduct(productObj);
                  showToast(`"${cleanHindi}" आइटम सफलतापूर्वक अपडेट हो गया!`);
                } else if (onAddProduct) {
                  onAddProduct(productObj);
                  showToast(`नया आइटम "${cleanHindi}" सफलतापूर्वक जोड़ दिया गया!`);
                }
                setShowProductModal(false);
              }}
              className="p-5 space-y-4 text-xs text-slate-800 max-h-[80vh] overflow-y-auto"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    आटा / आइटम नाम (हिंदी में) *
                  </label>
                  <input
                    type="text"
                    required
                    value={prodNameHindi}
                    onChange={(e) => setProdNameHindi(e.target.value)}
                    placeholder="जैसे: शरबती आटा, सूजी, बेसन, मैदा"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    अंग्रेजी नाम (English Name)
                  </label>
                  <input
                    type="text"
                    value={prodNameEn}
                    onChange={(e) => setProdNameEn(e.target.value)}
                    placeholder="e.g. Sharbati Atta / Suji / Besan"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">ब्रांड / श्रेणी</label>
                  <input
                    type="text"
                    value={prodBrand}
                    onChange={(e) => setProdBrand(e.target.value)}
                    placeholder="जैसे: Tejstha Gold"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">HSN कोड (GST हेतु)</label>
                  <input
                    type="text"
                    value={prodHsn}
                    onChange={(e) => setProdHsn(e.target.value)}
                    placeholder="1101"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">विवरण (Description)</label>
                  <input
                    type="text"
                    value={prodDesc}
                    onChange={(e) => setProdDesc(e.target.value)}
                    placeholder="क्वालिटी या पैकिंग विवरण (वैकल्पिक)"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Selling Rates */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 space-y-2.5">
                <span className="font-bold text-amber-900 block">
                  विक्रय दरें — प्रति बैग (Selling Rates ₹) *
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {([5, 10, 25, 50] as BagSize[]).map((size) => (
                    <div key={size}>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        {size} KG (₹)
                      </label>
                      <input
                        type="number"
                        min={0}
                        required
                        value={prodRates[size]}
                        onChange={(e) =>
                          setProdRates((prev) => ({
                            ...prev,
                            [size]: Number(e.target.value) || 0,
                          }))
                        }
                        className="w-full px-2.5 py-2 bg-white border border-amber-300 rounded-lg font-mono font-bold text-center focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Cost Rates */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                <span className="font-bold text-slate-700 block">
                  लागत दरें — प्रति बैग (Cost Rates ₹ — मुनाफा गणना हेतु)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {([5, 10, 25, 50] as BagSize[]).map((size) => (
                    <div key={size}>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        {size} KG लागत (₹)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={prodCostRates[size]}
                        onChange={(e) =>
                          setProdCostRates((prev) => ({
                            ...prev,
                            [size]: Number(e.target.value) || 0,
                          }))
                        }
                        className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg font-mono text-center focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black shadow-md transition cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingProductId ? 'बदलाव सुरक्षित करें' : 'आइटम जोड़ें'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
