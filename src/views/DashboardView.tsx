import React from 'react';
import { 
  Order, 
  BagStockItem, 
  ProductMaster, 
  RawMaterialStock, 
  Customer, 
  ProductionBatch, 
  ExpenseRecord, 
  UserProfile, 
  CompanySettings,
  UserRole
} from '../types/erp';
import { 
  IndianRupee, 
  TrendingUp, 
  Users, 
  Package, 
  Factory, 
  Truck, 
  Clock, 
  AlertTriangle,
  Share2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ArrowUpRight,
  FileSpreadsheet
} from 'lucide-react';
import { ActiveTab } from '../components/Sidebar';

interface DashboardViewProps {
  orders: Order[];
  customers: Customer[];
  rawStock: RawMaterialStock;
  bagStock: BagStockItem[];
  products: ProductMaster[];
  production: ProductionBatch[];
  expenses: ExpenseRecord[];
  staff: UserProfile[];
  settings: CompanySettings;
  currentRole: UserRole;
  onNavigate: (tab: ActiveTab) => void;
  onOpenNewOrder: () => void;
  onOpenNewProduction: () => void;
  onOpenReceivePayment: () => void;
  onSelectOrder: (order: Order) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  orders,
  customers,
  rawStock,
  bagStock,
  products,
  production,
  expenses,
  staff,
  settings,
  currentRole,
  onNavigate,
  onOpenNewOrder,
  onOpenNewProduction,
  onOpenReceivePayment,
  onSelectOrder,
}) => {
  const todayStr = new Date().toISOString().slice(0, 10);

  // Today's Orders
  const todayOrders = orders.filter(o => o.date === todayStr);
  const todaySales = todayOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const todayPaid = todayOrders.reduce((sum, o) => sum + o.paidAmount, 0);

  // Payment Mode breakdown today
  const cashReceived = todayOrders
    .filter(o => o.paymentMode === 'cash')
    .reduce((s, o) => s + o.paidAmount, 0);
  const bankReceived = todayOrders
    .filter(o => o.paymentMode === 'bank')
    .reduce((s, o) => s + o.paidAmount, 0);
  const upiReceived = todayOrders
    .filter(o => o.paymentMode === 'upi')
    .reduce((s, o) => s + o.paidAmount, 0);

  // Today's Expenses
  const todayExpensesList = expenses.filter(e => e.date === todayStr);
  const todayExpensesTotal = todayExpensesList.reduce((s, e) => s + e.amount, 0);

  // Today's Production
  const todayBatches = production.filter(b => b.date === todayStr);
  const todayAttaKg = todayBatches.reduce((s, b) => s + b.attaOutputKg, 0);
  const todayWheatMilledKg = todayBatches.reduce((s, b) => s + b.wheatInputKg, 0);
  const todayBagsPacked = todayBatches.reduce((s, b) => {
    return s + (b.packedBags[5] || 0) + (b.packedBags[10] || 0) + (b.packedBags[25] || 0) + (b.packedBags[50] || 0);
  }, 0);

  // Total Market Dues
  const totalMarketDues = customers.reduce((s, c) => s + c.currentDue, 0);

  // Ready Bags in Stock
  const totalReadyBags = bagStock.reduce((s, b) => s + b.packedCount, 0);
  const totalReadyFlourWeightKg = bagStock.reduce((s, b) => s + (b.packedCount * b.bagSize), 0);

  // Today Bags Sold
  const todayBagsSold = todayOrders.reduce((sum, o) => {
    return sum + o.items.reduce((itemSum, i) => itemSum + i.quantity, 0);
  }, 0);

  // Profit Calculation (COGS + Operating expenses)
  // For today's orders: revenue - estimated cost of goods
  const todayCostOfGoods = todayOrders.reduce((sum, order) => {
    return sum + order.items.reduce((itemCostSum, item) => {
      const prod = products.find(p => p.id === item.productId);
      const unitCost = prod?.costRates[item.bagSize] || (item.ratePerBag * 0.82);
      return itemCostSum + (unitCost * item.quantity);
    }, 0);
  }, 0);

  // Estimated gross profit on sales
  const grossProfit = Math.max(0, todaySales - todayCostOfGoods);
  // Net profit = Gross profit minus routine factory daily operating expenses (fuel, labor, tea, etc.)
  const routineExpensesToday = todayExpensesList
    .filter(e => e.category !== 'wheat_purchase' && e.category !== 'bag_purchase')
    .reduce((s, e) => s + e.amount, 0);
  const estimatedNetProfit = Math.max(0, grossProfit - routineExpensesToday);

  // Pending & Delivery statuses
  const pendingOrders = orders.filter(o => o.status === 'pending');
  const inProductionOrders = orders.filter(o => o.status === 'in_production');
  const readyDispatchOrders = orders.filter(o => o.status === 'ready_dispatch');
  const dispatchedOrders = orders.filter(o => o.status === 'dispatched');

  // Low stock items count
  const lowStockItems = bagStock.filter(b => b.packedCount <= b.minThreshold);

  // WhatsApp daily report share
  const handleShareDailyReport = () => {
    const text = `*${settings.companyName}* - ${settings.brandName} आटा%0A` +
      `📊 *दैनिक बिज़नेस रिपोर्ट (DAILY REPORT)*%0A` +
      `📅 *तारीख*: ${todayStr}%0A` +
      `--------------------------------%0A` +
      `💰 *आज की कुल बिक्री*: ₹${todaySales.toLocaleString('en-IN')}%0A` +
      `💵 *नकद प्राप्ति (Cash)*: ₹${cashReceived.toLocaleString('en-IN')}%0A` +
      `🏦 *बैंक प्राप्ति (Bank)*: ₹${bankReceived.toLocaleString('en-IN')}%0A` +
      `📱 *UPI प्राप्ति*: ₹${upiReceived.toLocaleString('en-IN')}%0A` +
      `📉 *आज का कुल खर्च*: ₹${todayExpensesTotal.toLocaleString('en-IN')}%0A` +
      `📈 *अनुमानित शुद्ध मुनाफा*: ₹${estimatedNetProfit.toLocaleString('en-IN')}%0A` +
      `⚠️ *ग्राहकों से कुल बकाया*: ₹${totalMarketDues.toLocaleString('en-IN')}%0A` +
      `--------------------------------%0A` +
      `🏭 *आज का प्रोडक्शन*: ${todayAttaKg} KG आटा (${todayBagsPacked} बैग)%0A` +
      `📦 *गोदाम स्टॉक*: ${rawStock.wheatQuintals.toFixed(1)} क्विंटल गेहूँ | ${totalReadyBags} बैग तैयार%0A` +
      `🚚 *आज डिलीवरी स्थिति*: ${dispatchedOrders.length} रास्ते में, ${readyDispatchOrders.length} तैयार%0A` +
      `--------------------------------%0A` +
      `TEJ FOOD PRODUCTS ERP 📱`;

    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Welcome with Today Summary */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 text-white rounded-2xl p-5 sm:p-6 shadow-xl border border-slate-700/60 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-xs font-black tracking-wide uppercase">
                {settings.brandName} आटा
              </span>
              <span className="text-xs text-slate-300 font-mono">
                📅 {new Date().toLocaleDateString('hi-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
              {settings.companyName}
            </h1>
            <p className="text-xs text-amber-200/90 mt-0.5">
              फैक्ट्री संचालन, चक्की उत्पादन, स्टॉक एवं लेखा-जोखा नियंत्रण कक्ष
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleShareDailyReport}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition"
            >
              <Share2 className="w-4 h-4" />
              <span>WhatsApp दैनिक समरी</span>
            </button>
            <button
              onClick={() => onNavigate('reports')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-bold text-xs rounded-xl transition"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Excel डाउनलोड</span>
            </button>
          </div>
        </div>
      </div>

      {/* 8 Primary KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. Today Sales */}
        <div 
          onClick={() => onNavigate('orders')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-400 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">आज की बिक्री</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700 group-hover:bg-amber-500 group-hover:text-slate-950 transition">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="font-mono font-black text-xl sm:text-2xl text-slate-900 block">
              ₹{todaySales.toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {todayOrders.length} ऑर्डर्स ({todayBagsSold} बैग बिके)
            </span>
          </div>
        </div>

        {/* 2. Today Profit (Admin only sees real figure) */}
        <div 
          onClick={() => (currentRole === 'admin' ? onNavigate('accounting') : null)}
          className={`bg-white p-4 rounded-2xl border border-slate-200 shadow-xs transition ${
            currentRole === 'admin' ? 'hover:border-emerald-400 hover:shadow-md cursor-pointer' : ''
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">आज का शुद्ध लाभ</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            {currentRole === 'admin' ? (
              <>
                <span className="font-mono font-black text-xl sm:text-2xl text-emerald-700 block">
                  ₹{estimatedNetProfit.toLocaleString('en-IN')}
                </span>
                <span className="text-[11px] text-emerald-600 mt-1 block font-medium">
                  गेहूँ, बिजली, बैग व मजदूरी काटकर
                </span>
              </>
            ) : (
              <>
                <span className="text-sm font-semibold text-slate-400 block pt-1">
                  केवल Admin अधिकार
                </span>
                <span className="text-[11px] text-slate-400">मालिक का पर्सनल मोबाइल</span>
              </>
            )}
          </div>
        </div>

        {/* 3. Market Dues */}
        <div 
          onClick={() => onNavigate('customers')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-rose-400 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">ग्राहकों से बकाया</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="font-mono font-black text-xl sm:text-2xl text-rose-600 block">
              ₹{totalMarketDues.toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">
              कुल {customers.length} पंजीकृत ग्राहक
            </span>
          </div>
        </div>

        {/* 4. Today Production */}
        <div 
          onClick={() => onNavigate('production')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-400 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">आज का उत्पादन</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700 group-hover:bg-amber-600 group-hover:text-white transition">
              <Factory className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="font-mono font-black text-xl sm:text-2xl text-slate-900 block">
              {todayAttaKg} KG
            </span>
            <span className="text-[11px] text-amber-700 font-medium mt-1 block">
              {todayBagsPacked} बैग पैक ({todayBatches.length} बैच पिसाई)
            </span>
          </div>
        </div>

        {/* 5. Raw Wheat Stock */}
        <div 
          onClick={() => onNavigate('inventory')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-400 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">कच्चा गेहूँ स्टॉक</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-800">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="font-mono font-black text-xl sm:text-2xl text-slate-900 block">
              {rawStock.wheatQuintals.toFixed(1)} <span className="text-sm font-normal text-slate-600">क्विंटल</span>
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">
              = {(rawStock.wheatQuintals * 100).toLocaleString('en-IN')} KG गेहूँ
            </span>
          </div>
        </div>

        {/* 6. Ready Atta Stock */}
        <div 
          onClick={() => onNavigate('inventory')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-400 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">तैयार माल (Ready)</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="font-mono font-black text-xl sm:text-2xl text-slate-900 block">
              {totalReadyBags} <span className="text-sm font-normal text-slate-600">बैग्स</span>
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">
              = {totalReadyFlourWeightKg.toLocaleString('en-IN')} KG तैयार आटा
            </span>
          </div>
        </div>

        {/* 7. Pending Orders */}
        <div 
          onClick={() => onNavigate('orders')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-400 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">पेंडिंग ऑर्डर</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="font-mono font-black text-xl sm:text-2xl text-amber-600 block">
              {pendingOrders.length + inProductionOrders.length}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {pendingOrders.length} नए, {inProductionOrders.length} पिसाई में
            </span>
          </div>
        </div>

        {/* 8. Delivery Status */}
        <div 
          onClick={() => onNavigate('delivery')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-400 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">डिलीवरी स्थिति</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="font-mono font-black text-xl sm:text-2xl text-indigo-700 block">
              {dispatchedOrders.length + readyDispatchOrders.length}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {dispatchedOrders.length} गाड़ी में, {readyDispatchOrders.length} तैयार
            </span>
          </div>
        </div>
      </div>

      {/* Daily Business Summary Table Card (Requested explicitly in prompt) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-400" />
            <h2 className="font-bold text-sm">
              TEJ FOOD PRODUCTS – DAILY BUSINESS REPORT (दैनिक समरी)
            </h2>
          </div>
          <span className="text-xs font-mono text-amber-300">
            {todayStr}
          </span>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-800">
          {/* Financial Breakdown Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200">
                  <th className="py-2.5 px-3">विवरण (Description)</th>
                  <th className="py-2.5 px-3 text-right">राशि (Amount)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-2 px-3 font-semibold text-slate-900">आज की कुल बिक्री (Total Sales)</td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">₹{todaySales.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-slate-600 pl-6">• नकद प्राप्ति (Cash in Hand)</td>
                  <td className="py-2 px-3 text-right font-mono text-emerald-700">₹{cashReceived.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-slate-600 pl-6">• बैंक प्राप्ति (SBI A/C)</td>
                  <td className="py-2 px-3 text-right font-mono text-blue-700">₹{bankReceived.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-slate-600 pl-6">• UPI प्राप्ति (PhonePe/GPay)</td>
                  <td className="py-2 px-3 text-right font-mono text-purple-700">₹{upiReceived.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-semibold text-rose-600">आज का कुल खर्च (Expenses)</td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-rose-600">₹{todayExpensesTotal.toLocaleString('en-IN')}</td>
                </tr>
                {currentRole === 'admin' && (
                  <tr className="bg-emerald-50/70 font-bold">
                    <td className="py-2.5 px-3 text-emerald-900">आज का अनुमानित शुद्ध मुनाफा (Net Profit)</td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-800 text-sm">₹{estimatedNetProfit.toLocaleString('en-IN')}</td>
                  </tr>
                )}
                <tr className="bg-amber-50/50">
                  <td className="py-2 px-3 text-slate-700">ग्राहकों से कुल बकाया (Market Dues)</td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-amber-900">₹{totalMarketDues.toLocaleString('en-IN')}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Operational Metrics */}
          <div className="space-y-3">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-700 block mb-2 uppercase text-[11px] tracking-wider">
                उत्पादन व स्टॉक स्थिति (Milling & Bags)
              </span>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block">आज पिसा गया गेहूँ:</span>
                  <span className="font-mono font-bold text-slate-900">{todayWheatMilledKg} KG</span>
                </div>
                <div>
                  <span className="text-slate-500 block">आज तैयार आटा:</span>
                  <span className="font-mono font-bold text-emerald-700">{todayAttaKg} KG</span>
                </div>
                <div>
                  <span className="text-slate-500 block">आज पैक किए बैग:</span>
                  <span className="font-mono font-bold text-slate-900">{todayBagsPacked} बैग्स</span>
                </div>
                <div>
                  <span className="text-slate-500 block">आज बिके बैग:</span>
                  <span className="font-mono font-bold text-amber-700">{todayBagsSold} बैग्स</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-700 block mb-2 uppercase text-[11px] tracking-wider">
                डिलीवरी व ऑर्डर फ्लो
              </span>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">पेंडिंग</span>
                  <span className="font-mono font-bold text-amber-600 text-sm">{pendingOrders.length}</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">डिस्पैच तैयार</span>
                  <span className="font-mono font-bold text-blue-600 text-sm">{readyDispatchOrders.length}</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">रास्ते में (गाड़ी)</span>
                  <span className="font-mono font-bold text-emerald-600 text-sm">{dispatchedOrders.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column: Recent Orders & Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 cols: Recent Orders */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-bold text-sm text-slate-900">
              हाल के ऑर्डर्स एवं बिलिंग (Recent Orders)
            </h3>
            <button
              onClick={() => onNavigate('orders')}
              className="text-xs text-amber-700 hover:text-amber-800 font-bold flex items-center gap-0.5"
            >
              <span>सभी देखें</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">इनवॉइस नं.</th>
                  <th className="py-2.5 px-3">ग्राहक / फर्म</th>
                  <th className="py-2.5 px-3 text-center">बैग</th>
                  <th className="py-2.5 px-3 text-right">कुल बिल</th>
                  <th className="py-2.5 px-3 text-center">स्थिति</th>
                  <th className="py-2.5 px-3 text-center">कार्रवाई</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.slice(0, 5).map((order) => {
                  const bagCount = order.items.reduce((s, i) => s + i.quantity, 0);

                  const getStatusBadge = (st: string) => {
                    switch (st) {
                      case 'pending':
                        return <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[10px] font-bold">पेंडिंग</span>;
                      case 'in_production':
                        return <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full text-[10px] font-bold">प्रोडक्शन में</span>;
                      case 'ready_dispatch':
                        return <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-[10px] font-bold">डिस्पैच तैयार</span>;
                      case 'dispatched':
                        return <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full text-[10px] font-bold">गाड़ी रवाना</span>;
                      case 'delivered':
                        return <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-bold">डिलीवर ✓</span>;
                      default:
                        return <span>{st}</span>;
                    }
                  };

                  return (
                    <tr key={order.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                        {order.invoiceNumber}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900 block">{order.customerFirm}</span>
                        <span className="text-[11px] text-slate-500">{order.customerName}</span>
                      </td>
                      <td className="py-3 px-3 text-center font-bold font-mono">
                        {bagCount}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        ₹{order.totalAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => onSelectOrder(order)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[11px] font-semibold transition"
                        >
                          बिल देखें
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right col: Packing Bag Stock & Alerts */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-sm text-slate-900">
                तैयार बैग साइज स्टॉक (Bag Counts)
              </h3>
              <span className="text-xs text-amber-700 font-bold">
                कुल {totalReadyBags} बैग
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200">
                <span className="block text-[11px] font-bold text-amber-900">5 KG पैक</span>
                <span className="font-mono font-black text-lg text-amber-950">
                  {bagStock.filter(b => b.bagSize === 5).reduce((s, b) => s + b.packedCount, 0)}
                </span>
                <span className="text-[10px] text-amber-700 block">छोटा पैक</span>
              </div>

              <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200">
                <span className="block text-[11px] font-bold text-amber-900">10 KG पैक</span>
                <span className="font-mono font-black text-lg text-amber-950">
                  {bagStock.filter(b => b.bagSize === 10).reduce((s, b) => s + b.packedCount, 0)}
                </span>
                <span className="text-[10px] text-amber-700 block">मीडियम पैक</span>
              </div>

              <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200">
                <span className="block text-[11px] font-bold text-amber-900">25 KG पैक</span>
                <span className="font-mono font-black text-lg text-amber-950">
                  {bagStock.filter(b => b.bagSize === 25).reduce((s, b) => s + b.packedCount, 0)}
                </span>
                <span className="text-[10px] text-amber-700 block">बड़ा पैक</span>
              </div>

              <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200">
                <span className="block text-[11px] font-bold text-amber-900">50 KG बोरी</span>
                <span className="font-mono font-black text-lg text-amber-950">
                  {bagStock.filter(b => b.bagSize === 50).reduce((s, b) => s + b.packedCount, 0)}
                </span>
                <span className="text-[10px] text-amber-700 block">होलसेल बोरी</span>
              </div>
            </div>

            {/* Empty bags status */}
            <div className="mt-4 pt-3 border-t border-slate-200 text-xs text-slate-600">
              <span className="font-bold text-slate-800 block mb-1">खाली प्रिंटेड बैग स्टॉक:</span>
              <div className="flex justify-between text-[11px]">
                <span>5k: <strong>{rawStock.emptyBags[5]}</strong></span>
                <span>10k: <strong>{rawStock.emptyBags[10]}</strong></span>
                <span>25k: <strong>{rawStock.emptyBags[25]}</strong></span>
                <span>50k: <strong>{rawStock.emptyBags[50]}</strong></span>
              </div>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="bg-gradient-to-br from-amber-600 to-amber-700 text-white rounded-2xl p-5 shadow-sm space-y-2.5">
            <h4 className="font-bold text-sm">त्वरित शॉर्टकट (Quick Actions)</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={onOpenNewOrder}
                className="p-2.5 bg-white text-slate-900 rounded-xl font-bold hover:bg-amber-50 transition text-center"
              >
                + नया ऑर्डर
              </button>
              <button
                onClick={onOpenNewProduction}
                className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition text-center"
              >
                + पिसाई बैच
              </button>
              <button
                onClick={onOpenReceivePayment}
                className="p-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl font-bold transition text-center"
              >
                + भुगतान वसूली
              </button>
              <button
                onClick={() => onNavigate('inventory')}
                className="p-2.5 bg-amber-900/60 hover:bg-amber-900 text-white rounded-xl font-bold transition text-center"
              >
                गोदाम स्टॉक देखें
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
