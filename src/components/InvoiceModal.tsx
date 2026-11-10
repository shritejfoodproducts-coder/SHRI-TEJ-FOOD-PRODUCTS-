import React, { useState, useEffect, useRef } from 'react';
import { Order, CompanySettings } from '../types/erp';
import { 
  Printer, 
  Share2, 
  X, 
  Phone, 
  MapPin, 
  QrCode, 
  Upload, 
  Image as ImageIcon, 
  Check, 
  RotateCcw, 
  Sliders, 
  Save, 
  Sparkles,
  Info
} from 'lucide-react';
import QRCode from 'qrcode';

interface InvoiceModalProps {
  order: Order | null;
  settings: CompanySettings;
  onSaveSettings?: (settings: CompanySettings) => void;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ 
  order, 
  settings, 
  onSaveSettings, 
  onClose 
}) => {
  if (!order) return null;

  const isGst = order.billType === 'gst';
  const fileInputRef = useRef<HTMLInputElement>(null);

  // QR Code configuration states (supports qrCodeBase64 stored in settings)
  const savedBase64 = settings.qrCodeBase64 || settings.customQrCodeUrl || '';
  const [qrMode, setQrMode] = useState<'dynamic_upi' | 'custom_image'>(
    settings.qrCodeType || (savedBase64 ? 'custom_image' : 'dynamic_upi')
  );
  const [customQrImage, setCustomQrImage] = useState<string>(savedBase64);
  const [includeAmountInQr, setIncludeAmountInQr] = useState<boolean>(true);
  const [dynamicQrDataUrl, setDynamicQrDataUrl] = useState<string>('');
  const [showQrControls, setShowQrControls] = useState<boolean>(false);
  const [savedSettingsSuccess, setSavedSettingsSuccess] = useState<boolean>(false);

  // Determine payable amount for QR
  const payableAmount = order.dueAmount > 0 ? order.dueAmount : order.totalAmount;

  // Generate dynamic QR whenever bank details, UPI ID or order amount changes
  useEffect(() => {
    const generateUpiQr = async () => {
      try {
        const upiId = (settings.upiId || 'shritejfood@sbi').trim();
        const payeeName = settings.companyName || 'Shri Tej Food Products';
        const note = `Invoice ${order.invoiceNumber}`;

        let upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&cu=INR&tn=${encodeURIComponent(note)}`;
        if (includeAmountInQr && payableAmount > 0) {
          upiUrl += `&am=${payableAmount.toFixed(2)}`;
        }

        const dataUrl = await QRCode.toDataURL(upiUrl, {
          width: 300,
          margin: 1,
          color: {
            dark: '#0f172a', // Slate 900
            light: '#ffffff',
          },
          errorCorrectionLevel: 'M',
        });
        setDynamicQrDataUrl(dataUrl);
      } catch (err) {
        console.error('Error generating UPI QR code:', err);
      }
    };

    generateUpiQr();
  }, [settings.upiId, settings.companyName, order.invoiceNumber, payableAmount, includeAmountInQr]);

  // Handle uploading custom QR code image
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('कृपया केवल इमेज (JPG, PNG, WebP) फ़ाइल चुनें।');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setCustomQrImage(result);
        setQrMode('custom_image');
      }
    };
    reader.readAsDataURL(file);
  };

  // Save custom QR image to company settings so it reflects across all invoices
  const handleSaveQrToSettings = () => {
    if (!onSaveSettings) return;
    const updated: CompanySettings = {
      ...settings,
      qrCodeBase64: customQrImage,
      customQrCodeUrl: customQrImage,
      qrCodeType: qrMode,
    };
    onSaveSettings(updated);
    setSavedSettingsSuccess(true);
    setTimeout(() => setSavedSettingsSuccess(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const totalBags = order.items.reduce((s, i) => s + i.quantity, 0);
    const itemListText = order.items
      .map(i => `• ${i.productName} (${i.bagSize} KG) x ${i.quantity} बैग = ₹${i.totalAmount}`)
      .join('%0A');

    const upiLink = `upi://pay?pa=${settings.upiId}&pn=${encodeURIComponent(settings.companyName)}&am=${payableAmount}&cu=INR`;

    const msg = `*${settings.companyName}* - ${settings.brandName}%0A` +
      `🧾 *${isGst ? 'टैक्स इनवॉइस' : 'डिलीवरी चालान'}*: ${order.invoiceNumber}%0A` +
      `📅 *तारीख*: ${order.date}%0A` +
      `👤 *ग्राहक*: ${order.customerFirm} (${order.customerName})%0A` +
      `--------------------------------%0A` +
      `📦 *सामान विवरण (कुल ${totalBags} बैग)*:%0A${itemListText}%0A` +
      `--------------------------------%0A` +
      `💰 *कुल बिल*: ₹${order.totalAmount}%0A` +
      `✅ *प्राप्त राशि*: ₹${order.paidAmount}%0A` +
      `⚠️ *शेष बकाया राशि*: ₹${order.dueAmount}%0A` +
      `--------------------------------%0A` +
      `🏦 *बैंक खाता विवरण (Bank Details)*:%0A` +
      `बैंक: ${settings.bankName}%0A` +
      `A/C: ${settings.accountNumber} | IFSC: ${settings.ifscCode}%0A` +
      `📱 *UPI ID*: ${settings.upiId}%0A` +
      `🔗 *UPI भुगतान लिंक*: ${upiLink}%0A%0A` +
      `धन्यवाद! 🙏 *${settings.companyName}*`;

    const cleanPhone = order.customerPhone.replace(/[^0-9]/g, '');
    const phoneParam = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    window.open(`https://api.whatsapp.com/send?phone=${phoneParam}&text=${msg}`, '_blank');
  };

  // The active QR image to display in invoice
  const activeQrSrc = qrMode === 'custom_image' && customQrImage ? customQrImage : dynamicQrDataUrl;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden print:shadow-none print:rounded-none">
        
        {/* Modal Action Bar (Hidden in Print) */}
        <div className="bg-slate-900 text-white px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-2 no-print border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
              isGst ? 'bg-amber-500 text-slate-900 font-bold' : 'bg-emerald-600 text-white font-bold'
            }`}>
              {isGst ? 'GST TAX INVOICE' : 'DELIVERY CHALLAN / NON-GST'}
            </span>
            <span className="text-xs sm:text-sm font-mono font-medium text-slate-300">
              #{order.invoiceNumber}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowQrControls(!showQrControls)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                showQrControls 
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs' 
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30'
              }`}
              title="कस्टम QR कोड जोड़ें या बदलें"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>QR कोड सेटिंग्स</span>
            </button>

            <button
              onClick={handleShareWhatsApp}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition shadow-xs"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>प्रिंट</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* QR Code Dynamic Customizer Toolbar (Hidden in Print) */}
        {showQrControls && (
          <div className="bg-amber-50 border-b border-amber-200 p-4 no-print text-xs text-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-amber-700" />
                <span className="font-bold text-amber-900 text-sm">
                  भुगतान QR कोड कस्टमाइज़ेशन (Customer Payment QR)
                </span>
              </div>
              <span className="text-[11px] text-amber-800 font-medium">
                बैंक: {settings.bankName.split(' ')[0]} | UPI: <strong className="font-mono">{settings.upiId}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Option 1: Dynamic UPI QR */}
              <button
                type="button"
                onClick={() => setQrMode('dynamic_upi')}
                className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                  qrMode === 'dynamic_upi'
                    ? 'bg-white border-amber-500 ring-2 ring-amber-500/30 text-amber-950 font-bold'
                    : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-amber-600" />
                  <span className="font-bold text-xs">ऑटो डायनामिक UPI QR</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 font-normal">
                  सेटिंग्स के UPI ID ({settings.upiId}) व इनवॉइस राशि से स्वतः तैयार होता है।
                </p>
              </button>

              {/* Option 2: Upload Custom QR image */}
              <div
                className={`p-2.5 rounded-xl border transition flex flex-col justify-between ${
                  qrMode === 'custom_image'
                    ? 'bg-white border-amber-500 ring-2 ring-amber-500/30 text-amber-950 font-bold'
                    : 'bg-white/60 border-slate-200 text-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-purple-600" />
                    <span className="font-bold text-xs">कस्टम QR फोटो</span>
                  </div>
                  {customQrImage && (
                    <button
                      type="button"
                      onClick={() => setQrMode('custom_image')}
                      className="text-[10px] text-amber-800 bg-amber-100 hover:bg-amber-200 px-1.5 py-0.5 rounded font-bold"
                    >
                      सक्रिय करें
                    </button>
                  )}
                </div>

                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold transition"
                  >
                    <Upload className="w-3 h-3 text-amber-400" />
                    <span>{customQrImage ? 'नया QR फोटो चुनें' : 'QR फोटो अपलोड करें'}</span>
                  </button>
                </div>
              </div>

              {/* Option 3: Amount toggle and Save */}
              <div className="bg-white/80 p-2.5 rounded-xl border border-slate-200 flex flex-col justify-between space-y-1.5">
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={includeAmountInQr}
                    onChange={(e) => setIncludeAmountInQr(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                  />
                  <span>QR में राशि (₹{payableAmount}) जोड़ें</span>
                </label>

                {onSaveSettings && customQrImage && (
                  <button
                    type="button"
                    onClick={handleSaveQrToSettings}
                    className="w-full flex items-center justify-center gap-1 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition"
                  >
                    <Save className="w-3 h-3" />
                    <span>सेटिंग्स में डिफ़ॉल्ट सेव करें</span>
                  </button>
                )}

                {savedSettingsSuccess && (
                  <span className="text-[10px] text-emerald-700 font-bold text-center block">
                    ✓ सेटिंग्स में सुरक्षित!
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Printable Invoice Document */}
        <div className="p-6 sm:p-8 text-slate-800 text-sm print-area">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-5">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xl shadow-xs">
                    T
                  </div>
                  <div>
                    <h1 className="text-xl font-bold tracking-tight text-slate-950">
                      {settings.companyName}
                    </h1>
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
                      {settings.brandName} आटा एवं फूड प्रोडक्ट्स
                    </p>
                  </div>
                </div>

                <div className="mt-2.5 text-xs text-slate-600 space-y-0.5">
                  <p className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{settings.address}</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>मो: {settings.phone} | ई-मेल: {settings.email}</span>
                  </p>
                  {isGst && (
                    <p className="font-semibold text-slate-800">
                      GSTIN: <span className="font-mono">{settings.gstin}</span> | FSSAI: <span className="font-mono">{settings.fssaiNumber}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="text-right">
                <div className="inline-block bg-slate-100 border border-slate-300 rounded-lg px-4 py-2 text-center">
                  <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    {isGst ? 'टैक्स इनवॉइस / TAX INVOICE' : 'डिलीवरी चालान / DELIVERY CHALLAN'}
                  </span>
                  <span className="font-mono font-bold text-base text-slate-900">
                    {order.invoiceNumber}
                  </span>
                  <span className="block text-xs text-slate-600 mt-0.5">
                    तारीख: {order.date}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Customer / Bill To Details */}
          <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-200 text-xs">
            <div className="bg-slate-50/80 p-3 rounded-lg border border-slate-200">
              <span className="font-bold text-slate-500 uppercase tracking-wider block text-[10px] mb-1">
                क्रेता विवरण (Billed To):
              </span>
              <p className="font-bold text-sm text-slate-900">{order.customerFirm}</p>
              <p className="text-slate-700 font-medium">श्री {order.customerName}</p>
              <p className="text-slate-600 mt-1">{order.customerAddress}</p>
              <p className="text-slate-700 font-mono mt-0.5">मो: +91 {order.customerPhone}</p>
            </div>

            <div className="bg-slate-50/80 p-3 rounded-lg border border-slate-200 flex flex-col justify-between">
              <div>
                <span className="font-bold text-slate-500 uppercase tracking-wider block text-[10px] mb-1">
                  डिस्पैच व ट्रांसपोर्ट विवरण:
                </span>
                <p className="text-slate-700">गाड़ी नं: <span className="font-bold font-mono text-slate-900">{order.vehicleNumber || 'RJ-14-GA-4521'}</span></p>
                <p className="text-slate-700">ड्राइवर: <span className="font-medium text-slate-900">{order.deliveryStaffName || 'सोनू सैनी'}</span></p>
              </div>
              <div className="mt-2 text-[11px]">
                <span className="text-slate-500">स्थिति: </span>
                <span className="font-bold text-emerald-700 uppercase">{order.status}</span>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 text-xs uppercase font-bold border-y border-slate-300">
                  <th className="py-2.5 px-3 w-10 text-center">क्र.</th>
                  <th className="py-2.5 px-3">विवरण / Product Description</th>
                  {isGst && <th className="py-2.5 px-2 text-center">HSN</th>}
                  <th className="py-2.5 px-2 text-center">पैकिंग</th>
                  <th className="py-2.5 px-2 text-center">बैग (Qty)</th>
                  <th className="py-2.5 px-3 text-right">दर (₹/बैग)</th>
                  <th className="py-2.5 px-3 text-right">कुल (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {order.items.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 text-center text-slate-500 font-mono">{index + 1}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      {item.productName}
                    </td>
                    {isGst && <td className="py-2.5 px-2 text-center text-slate-500 font-mono">1101</td>}
                    <td className="py-2.5 px-2 text-center font-medium bg-amber-50/50 text-amber-900">
                      {item.bagSize} KG
                    </td>
                    <td className="py-2.5 px-2 text-center font-bold text-slate-900">
                      {item.quantity}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      ₹{item.ratePerBag.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-mono">
                      ₹{item.totalAmount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary & Calculations with Customized Dynamic QR Code */}
          <div className="mt-4 pt-3 border-t border-slate-300 grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Left Bank Details & Payment QR Code Box */}
            <div className="text-xs space-y-3">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="flex items-start justify-between gap-3">
                  {/* Bank text information */}
                  <div className="space-y-1 flex-1">
                    <p className="font-bold text-slate-900 uppercase text-[10px] tracking-wider mb-1 flex items-center gap-1">
                      <span>बैंक खाता विवरण (Bank Details)</span>
                    </p>
                    <p className="text-slate-700">
                      <span className="text-slate-500">बैंक: </span>
                      <strong className="text-slate-900">{settings.bankName}</strong>
                    </p>
                    <p className="text-slate-700 font-mono">
                      <span className="text-slate-500">A/C: </span>
                      <strong className="text-slate-900 font-bold">{settings.accountNumber}</strong>
                    </p>
                    <p className="text-slate-700 font-mono">
                      <span className="text-slate-500">IFSC: </span>
                      <strong className="text-slate-900 font-bold">{settings.ifscCode}</strong>
                    </p>
                    <p className="text-slate-800 font-mono pt-0.5">
                      <span className="text-slate-500">UPI ID: </span>
                      <strong className="text-purple-700 font-bold">{settings.upiId}</strong>
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium pt-1">
                      खाताधारक: {settings.companyName}
                    </p>
                  </div>

                  {/* Dynamic / Customized QR Code Box */}
                  <div className="flex flex-col items-center bg-white p-2 rounded-xl border border-slate-300 shadow-xs shrink-0 w-28">
                    {activeQrSrc ? (
                      <img
                        src={activeQrSrc}
                        alt="Payment QR Code"
                        className="w-24 h-24 object-contain rounded-md"
                      />
                    ) : (
                      <div className="w-24 h-24 flex items-center justify-center bg-slate-100 rounded-md text-slate-400">
                        <QrCode className="w-8 h-8" />
                      </div>
                    )}
                    <span className="text-[9px] font-black uppercase text-slate-800 text-center mt-1 leading-tight">
                      SCAN & PAY
                    </span>
                    <span className="text-[8px] font-mono text-purple-700 font-bold text-center">
                      BHIM • GPay • UPI
                    </span>
                    {payableAmount > 0 && includeAmountInQr && qrMode === 'dynamic_upi' && (
                      <span className="text-[8px] bg-emerald-100 text-emerald-800 font-bold font-mono px-1 rounded-sm mt-0.5">
                        ₹{payableAmount.toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Subtext under QR box */}
                <div className="mt-2.5 pt-2 border-t border-slate-200/80 flex items-center justify-between text-[10px] text-slate-500">
                  <span>ग्राहक किसी भी UPI ऐप (PhonePe, GPay, Paytm) से सीधे स्कैन कर सकते हैं।</span>
                  <button
                    type="button"
                    onClick={() => setShowQrControls(!showQrControls)}
                    className="no-print text-amber-700 hover:text-amber-800 font-bold underline"
                  >
                    {qrMode === 'custom_image' ? 'कस्टम QR सक्रिय' : 'QR बदलें'}
                  </button>
                </div>
              </div>

              {order.notes && (
                <p className="text-slate-500 italic text-[11px]">
                  * विशेष नोट: {order.notes}
                </p>
              )}
            </div>

            {/* Right Totals */}
            <div className="space-y-1.5 text-xs text-slate-700">
              <div className="flex justify-between py-1">
                <span>सामान सबटोटल (Subtotal):</span>
                <span className="font-mono font-semibold">₹{order.subtotal.toFixed(2)}</span>
              </div>

              {isGst && (
                <>
                  <div className="flex justify-between py-1 text-slate-600">
                    <span>CGST @ 2.5%:</span>
                    <span className="font-mono">₹{(order.taxAmount / 2).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-1 text-slate-600">
                    <span>SGST @ 2.5%:</span>
                    <span className="font-mono">₹{(order.taxAmount / 2).toFixed(2)}</span>
                  </div>
                </>
              )}

              {order.freightCharges > 0 && (
                <div className="flex justify-between py-1">
                  <span>ट्रांसपोर्ट भाड़ा (Freight):</span>
                  <span className="font-mono">₹{order.freightCharges.toFixed(2)}</span>
                </div>
              )}

              {order.discount > 0 && (
                <div className="flex justify-between py-1 text-emerald-700">
                  <span>व्यापारिक छूट (Discount):</span>
                  <span className="font-mono">-₹{order.discount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between py-2 border-t-2 border-slate-900 text-sm font-bold text-slate-950">
                <span>कुल बिल राशि (Grand Total):</span>
                <span className="font-mono text-base text-amber-700">₹{order.totalAmount.toFixed(2)}</span>
              </div>

              <div className="flex justify-between py-1 text-emerald-700 font-medium">
                <span>जमा भुगतान (Paid):</span>
                <span className="font-mono">₹{order.paidAmount.toFixed(2)}</span>
              </div>

              <div className={`flex justify-between py-1 font-bold ${
                order.dueAmount > 0 ? 'text-rose-600' : 'text-slate-500'
              }`}>
                <span>शेष बकाया राशि (Balance Due):</span>
                <span className="font-mono">₹{order.dueAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Footer Signature */}
          <div className="mt-8 pt-6 border-t border-slate-200 flex justify-between items-end text-xs text-slate-500">
            <div className="text-center w-40">
              <div className="h-10"></div>
              <p className="border-t border-slate-400 pt-1">प्राप्तकर्ता के हस्ताक्षर</p>
            </div>
            <div className="text-center w-48">
              <p className="font-semibold text-slate-800 mb-6">कृते, {settings.companyName}</p>
              <p className="border-t border-slate-400 pt-1 font-medium text-slate-700">अधिकृत हस्ताक्षरकर्ता</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
