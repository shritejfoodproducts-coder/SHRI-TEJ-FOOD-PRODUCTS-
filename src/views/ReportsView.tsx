import React, { useRef } from 'react';
import { 
  Order, 
  BagStockItem, 
  ProductMaster, 
  RawMaterialStock, 
  Customer, 
  ProductionBatch, 
  ExpenseRecord, 
  UserProfile, 
  CompanySettings 
} from '../types/erp';
import { 
  exportSalesReport, 
  exportStockReport, 
  exportProductionReport, 
  exportExpensesReport, 
  exportCustomerDuesReport, 
  exportDeliveryReport, 
  exportStaffReport, 
  exportMasterCompleteBusinessBook 
} from '../utils/excelExport';
import { exportDatabaseBackup, importDatabaseBackup, AppDatabaseState } from '../utils/backup';
import { downloadApiVersionJson, downloadOpenApiSpec } from '../utils/apiExport';
import { 
  FileSpreadsheet, 
  Download, 
  Upload, 
  Database, 
  HardDriveDownload, 
  RotateCcw, 
  CheckCircle2, 
  FileCheck,
  ShieldAlert,
  Smartphone,
  Code,
  FileJson,
  ArrowRight
} from 'lucide-react';

interface ReportsViewProps {
  orders: Order[];
  customers: Customer[];
  rawStock: RawMaterialStock;
  bagStock: BagStockItem[];
  products: ProductMaster[];
  production: ProductionBatch[];
  expenses: ExpenseRecord[];
  staff: UserProfile[];
  settings: CompanySettings;
  onRestoreState: (state: AppDatabaseState) => void;
  onResetFactorySeeds: () => void;
  onOpenDownloadModal?: (tab?: 'apk' | 'api') => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  orders,
  customers,
  rawStock,
  bagStock,
  products,
  production,
  expenses,
  staff,
  settings,
  onRestoreState,
  onResetFactorySeeds,
  onOpenDownloadModal,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getCurrentState = (): AppDatabaseState => ({
    version: '2.4.0',
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

  const handleDownloadMasterBook = () => {
    exportMasterCompleteBusinessBook({
      orders,
      customers,
      rawStock,
      bagStock,
      products,
      production,
      expenses,
      staff,
      settings,
    });
  };

  const handleBackupJson = () => {
    exportDatabaseBackup(getCurrentState());
  };

  const handleDownloadApiJson = () => {
    downloadApiVersionJson(getCurrentState());
  };

  const handleDownloadOpenApi = () => {
    downloadOpenApiSpec(getCurrentState());
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const restored = await importDatabaseBackup(file);
      onRestoreState(restored);
      alert('डेटाबेस बैकअप सफलतापूर्वक रीस्टोर कर लिया गया है!');
    } catch (err: any) {
      alert(`बैकअप लोड करने में त्रुटि: ${err.message || 'अमान्य फाइल'}`);
    }
  };

  const reportItems = [
    {
      title: 'दैनिक बिक्री रिपोर्ट (Sales Report)',
      desc: 'सभी इनवॉइस, चालान, ग्राहक नाम, मात्रा, GST व बकाया राशि',
      filename: 'Daily_Sales_Report.xlsx',
      action: () => exportSalesReport(orders, settings),
      color: 'bg-amber-50 border-amber-300 text-amber-900',
    },
    {
      title: 'स्टॉक व इन्वेंट्री रिपोर्ट (Stock Report)',
      desc: 'कच्चा गेहूँ (क्विंटल), 5, 10, 25, 50 KG आटा बैग्स व खाली बोरियां',
      filename: 'Stock_Inventory_Report.xlsx',
      action: () => exportStockReport(rawStock, bagStock, products),
      color: 'bg-blue-50 border-blue-300 text-blue-900',
    },
    {
      title: 'दैनिक उत्पादन रिपोर्ट (Production Report)',
      desc: 'पिसाई गेहूँ (KG), तैयार आटा, चोकर, छीजन %, ऑपरेटर व शिफ्ट',
      filename: 'Daily_Production_Report.xlsx',
      action: () => exportProductionReport(production),
      color: 'bg-emerald-50 border-emerald-300 text-emerald-900',
    },
    {
      title: 'दैनिक खर्च रिपोर्ट (Expenses Report)',
      desc: 'डीजल, मजदूरी, बिजली, गेहूँ खरीद वाउचर्स व भुगतान माध्यम',
      filename: 'Daily_Expenses_Report.xlsx',
      action: () => exportExpensesReport(expenses),
      color: 'bg-rose-50 border-rose-300 text-rose-900',
    },
    {
      title: 'ग्राहक खाता व बकाया (Customer Dues Report)',
      desc: 'सभी दुकानदारों का नाम, फोन, कुल खरीद, जमा व बकाया उधारी',
      filename: 'Customer_Dues_Report.xlsx',
      action: () => exportCustomerDuesReport(customers),
      color: 'bg-purple-50 border-purple-300 text-purple-900',
    },
    {
      title: 'डिलीवरी व डिस्पैच रिपोर्ट (Delivery Report)',
      desc: 'गाड़ी नंबर RJ-14-GA-4521, ड्राइवर, डिलीवरी स्थिति व वसूली',
      filename: 'Delivery_Report.xlsx',
      action: () => exportDeliveryReport(orders),
      color: 'bg-indigo-50 border-indigo-300 text-indigo-900',
    },
    {
      title: 'स्टाफ कार्य एवं उपस्थिति (Staff Report)',
      desc: 'सभी कर्मचारियों की लिस्ट, पद, मोबाइल, ड्यूटी शिफ्ट व क्रेडेंशियल्स',
      filename: 'Staff_Work_Report.xlsx',
      action: () => exportStaffReport(staff),
      color: 'bg-teal-50 border-teal-300 text-teal-900',
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
          <span>Excel डेटाबेस एवं ऑटोमैटिक बैकअप (Excel Reports & Backup)</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          1-क्लिक में एक्सेल रिपोर्ट डाउनलोड, क्लाउड बैकअप और फोन खराब होने पर संपूर्ण डेटा रीस्टोर
        </p>
      </div>

      {/* Master 1-Click Excel Business Book Card */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-white/20 text-white px-2.5 py-0.5 rounded-full text-xs font-bold">
                MASTER COMPLETE EXCEL
              </span>
              <span className="text-xs text-emerald-200">7 शीट्स एक साथ</span>
            </div>
            <h2 className="text-xl font-black mt-2">
              TEJ_FOOD_ERP_Complete_Business_Book.xlsx
            </h2>
            <p className="text-xs text-emerald-100 mt-1 max-w-xl">
              बिक्री, स्टॉक, उत्पादन, ग्राहक बकाया, खर्चे, डिलीवरी और स्टाफ का पूरा रिकॉर्ड एक ही मास्टर एक्सेल फाइल में डाउनलोड करें।
            </p>
          </div>

          <button
            onClick={handleDownloadMasterBook}
            className="flex items-center gap-2 px-6 py-3 bg-white text-emerald-950 font-black text-sm rounded-xl hover:bg-emerald-50 transition shadow-lg shrink-0"
          >
            <Download className="w-5 h-5 text-emerald-700" />
            <span>संपूर्ण मास्टर Excel डाउनलोड करें</span>
          </button>
        </div>
      </div>

      {/* 7 Individual Excel Reports Grid */}
      <div>
        <h3 className="font-bold text-sm text-slate-900 mb-3 flex items-center gap-2">
          <FileCheck className="w-4 h-4 text-amber-600" />
          <span>अलग-अलग विभागीय Excel रिपोर्ट्स (.xlsx):</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportItems.map((item, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-2xl border-2 transition flex flex-col justify-between ${item.color}`}
            >
              <div>
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-sm text-slate-900">{item.title}</h4>
                  <FileSpreadsheet className="w-5 h-5 text-emerald-700 shrink-0" />
                </div>
                <p className="text-xs text-slate-600 mt-1.5 font-medium leading-relaxed">
                  {item.desc}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-300/60 flex justify-between items-center">
                <span className="text-[10px] font-mono text-slate-500 font-semibold">{item.filename}</span>
                <button
                  onClick={item.action}
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition shadow-xs"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>डाउनलोड</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* REST API Version & Developer Data Export Section */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-slate-950 text-white rounded-2xl p-6 shadow-xl border border-purple-800/80 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-600 text-white rounded-xl shadow-md">
              <Code className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-purple-300 uppercase tracking-wider">
                  📡 सिस्टम REST API वर्जन (API v2.4.0)
                </span>
                <span className="text-[10px] bg-purple-500/30 text-purple-200 border border-purple-400/40 px-2 py-0.5 rounded-full font-mono">
                  JSON / REST
                </span>
              </div>
              <h3 className="text-base font-black text-white mt-1">
                TEJ FOOD - फैक्ट्री API वर्जन एवं डेटाबेस एक्सपोर्ट
              </h3>
              <p className="text-xs text-slate-300 mt-1 max-w-xl">
                इस विकल्प से आप पूरा सिस्टम डेटा <strong>REST API JSON</strong> प्रारूप में डाउनलोड कर सकते हैं। इसे Tally Prime, Vyapar, Marg ERP या किसी भी अन्य अकाउंटिंग सॉफ्टवेयर से सीधे कनेक्ट किया जा सकता है।
              </p>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-2.5 shrink-0">
            <button
              onClick={handleDownloadApiJson}
              className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition"
            >
              <Download className="w-4 h-4 text-purple-200" />
              <span>API वर्जन (.JSON) डाउनलोड</span>
            </button>

            <button
              onClick={handleDownloadOpenApi}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/40 font-bold text-xs rounded-xl transition"
            >
              <FileJson className="w-4 h-4 text-amber-400" />
              <span>OpenAPI Spec</span>
            </button>

            {onOpenDownloadModal && (
              <button
                onClick={() => onOpenDownloadModal('api')}
                className="flex items-center gap-1.5 px-3 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition"
                title="एंडपॉइंट्स व टेस्ट कंसोल देखें"
              >
                <span>कंसोल</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Endpoints Quick Bar */}
        <div className="pt-3 border-t border-purple-900/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-purple-200">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 font-semibold">शामिल एंडपॉइंट्स:</span>
            <span className="font-mono bg-purple-900/50 px-2 py-0.5 rounded border border-purple-800">/api/v1/orders</span>
            <span className="font-mono bg-purple-900/50 px-2 py-0.5 rounded border border-purple-800">/api/v1/inventory</span>
            <span className="font-mono bg-purple-900/50 px-2 py-0.5 rounded border border-purple-800">/api/v1/production</span>
            <span className="font-mono bg-purple-900/50 px-2 py-0.5 rounded border border-purple-800">/api/v1/customers</span>
            <span className="font-mono bg-purple-900/50 px-2 py-0.5 rounded border border-purple-800">/api/v1/expenses</span>
          </div>

          {onOpenDownloadModal && (
            <button
              onClick={() => onOpenDownloadModal('apk')}
              className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 transition"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>📱 Android APK / मोबाइल ऐप डाउनलोड करें →</span>
            </button>
          )}
        </div>
      </div>

      {/* Cloud & Local Database Backup & Restore */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-slate-900 text-amber-400 rounded-xl">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900">
              सुरक्षा बैकअप एवं डेटा रीस्टोर (Database Safety & Restore)
            </h3>
            <p className="text-xs text-slate-500">
              मोबाइल खराब होने या बदलने पर भी आपका पूरा बिज़नेस रिकॉर्ड हमेशा सुरक्षित रहता है
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Download JSON Backup */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <span className="font-bold text-xs text-slate-900 block">1. डेटाबेस बैकअप फ़ाइल डाउनलोड</span>
              <span className="text-[11px] text-slate-500">सभी ऑर्डर्स, स्टॉक, ग्राहक व स्टाफ डेटा .json फॉर्मेट में</span>
            </div>
            <button
              onClick={handleBackupJson}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
            >
              <HardDriveDownload className="w-4 h-4 text-emerald-400" />
              <span>बैकअप लें</span>
            </button>
          </div>

          {/* Restore JSON Backup */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <span className="font-bold text-xs text-slate-900 block">2. बैकअप फ़ाइल से रीस्टोर करें</span>
              <span className="text-[11px] text-slate-500">पुरानी बैकअप फ़ाइल चुनकर तुरंत डेटा लोड करें</span>
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition"
              >
                <Upload className="w-4 h-4" />
                <span>फ़ाइल चुनें</span>
              </button>
            </div>
          </div>
        </div>

        {/* Reset Factory Seeds */}
        <div className="pt-4 border-t border-slate-200 flex justify-between items-center text-xs">
          <div className="text-slate-500">
            <span className="text-rose-600 font-bold block">डेटा रीसेट विकल्प:</span>
            <span>यदि आप डेमो डेटा हटाकर पुनः फैक्ट्री की प्रारंभिक स्थिति पर लाना चाहते हैं</span>
          </div>
          <button
            onClick={() => {
              if (window.confirm('क्या आप सचमुच डेटाबेस को प्रारंभिक फैक्ट्री स्थिति पर रीसेट करना चाहते हैं?')) {
                onResetFactorySeeds();
              }
            }}
            className="flex items-center gap-1 px-3 py-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg font-bold transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>डेटा रीसेट (Factory Reset)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
