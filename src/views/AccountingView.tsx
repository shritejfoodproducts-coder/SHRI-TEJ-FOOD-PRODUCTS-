import React from 'react';
import { Order, ExpenseRecord, Customer, ProductMaster } from '../types/erp';
import { 
  TrendingUp, 
  IndianRupee, 
  ArrowUpRight, 
  ArrowDownRight, 
  PieChart, 
  DollarSign, 
  Wallet, 
  Building2,
  Calendar,
  Layers
} from 'lucide-react';

interface AccountingViewProps {
  orders: Order[];
  expenses: ExpenseRecord[];
  customers: Customer[];
  products: ProductMaster[];
}

export const AccountingView: React.FC<AccountingViewProps> = ({
  orders,
  expenses,
  customers,
  products,
}) => {
  // Aggregate Metrics
  const totalSales = orders.reduce((s, o) => s + o.totalAmount, 0);
  const totalPaidRevenue = orders.reduce((s, o) => s + o.paidAmount, 0);
  const totalMarketReceivables = customers.reduce((s, c) => s + c.currentDue, 0);

  // Revenue payment channels
  const cashSales = orders.filter(o => o.paymentMode === 'cash').reduce((s, o) => s + o.paidAmount, 0);
  const bankSales = orders.filter(o => o.paymentMode === 'bank').reduce((s, o) => s + o.paidAmount, 0);
  const upiSales = orders.filter(o => o.paymentMode === 'upi').reduce((s, o) => s + o.paidAmount, 0);

  // COGS (Cost of goods sold)
  const totalCOGS = orders.reduce((sum, order) => {
    return sum + order.items.reduce((itemSum, item) => {
      const prod = products.find(p => p.id === item.productId);
      const unitCost = prod?.costRates[item.bagSize] || (item.ratePerBag * 0.82);
      return itemSum + (unitCost * item.quantity);
    }, 0);
  }, 0);

  const grossProfit = Math.max(0, totalSales - totalCOGS);

  // Operating Expenses (excluding bulk wheat purchase which is part of inventory asset)
  const routineOperatingExpenses = expenses
    .filter(e => e.category !== 'wheat_purchase' && e.category !== 'bag_purchase')
    .reduce((s, e) => s + e.amount, 0);

  const netProfit = Math.max(0, grossProfit - routineOperatingExpenses);
  const profitMarginPercent = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

  // Total factory cash outflow
  const totalExpensesAll = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-emerald-600" />
          <span>लाभ-हानि एवं लेखा-जोखा (Accounting & Net Profit ERP)</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          कुल बिक्री, कच्चा माल लागत (COGS), संचालन खर्चे, शुद्ध मुनाफा एवं मार्केट उधारी P&L पत्रक
        </p>
      </div>

      {/* Top 4 Financial Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500 uppercase">कुल बिज़नेस टर्नओवर</span>
            <div className="p-2 bg-amber-50 text-amber-700 rounded-xl">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <span className="font-mono font-black text-2xl text-slate-900 block mt-2">
            ₹{totalSales.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-slate-500 block mt-1">
            कुल {orders.length} ऑर्डर्स की बिलिंग
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border-2 border-emerald-300 bg-emerald-50/20 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-emerald-900 uppercase">शुद्ध लाभ (Net Profit)</span>
            <div className="p-2 bg-emerald-500 text-white rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <span className="font-mono font-black text-2xl text-emerald-700 block mt-2">
            ₹{netProfit.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-emerald-800 font-bold block mt-1">
            शुद्ध लाभ मार्जिन: {profitMarginPercent.toFixed(1)}%
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500 uppercase">माल उत्पादन लागत (COGS)</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <span className="font-mono font-black text-2xl text-rose-600 block mt-2">
            ₹{totalCOGS.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-slate-500 block mt-1">
            गेहूँ दाना, बैग पैकिंग व पिसाई विद्युत
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500 uppercase">ग्राहकों से बकाया (उधारी)</span>
            <div className="p-2 bg-purple-50 text-purple-700 rounded-xl">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <span className="font-mono font-black text-2xl text-purple-800 block mt-2">
            ₹{totalMarketReceivables.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-purple-700 block mt-1">
            Accounts Receivable
          </span>
        </div>
      </div>

      {/* Complete Profit & Loss (P&L) Statement Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="bg-slate-900 text-white px-5 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <PieChart className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="font-bold text-base">
                फैक्ट्री लाभ-हानि पत्रक (Profit & Loss Statement)
              </h2>
              <p className="text-xs text-slate-400">
                Shri Tej Food Products • Tejstha आटा
              </p>
            </div>
          </div>
          <span className="text-xs font-mono bg-slate-800 px-3 py-1 rounded-lg text-emerald-400 font-bold">
            शुद्ध लाभ: ₹{netProfit.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="p-6 text-xs text-slate-800">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 font-bold text-slate-700 border-b border-slate-300">
                <th className="py-2.5 px-3">लेखा मद (Particulars)</th>
                <th className="py-2.5 px-3 text-right">राशि (₹)</th>
                <th className="py-2.5 px-3 text-right">% टर्नओवर</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Sales Section */}
              <tr className="font-bold bg-slate-50/70 text-slate-900">
                <td className="py-2.5 px-3">(A) कुल बिक्री आय (Gross Revenue)</td>
                <td className="py-2.5 px-3 text-right font-mono font-bold">₹{totalSales.toLocaleString('en-IN')}</td>
                <td className="py-2.5 px-3 text-right font-mono">100.0%</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-slate-600 pl-8">• प्राप्त राशि (नकद, बैंक, UPI)</td>
                <td className="py-2 px-3 text-right font-mono text-emerald-700">₹{totalPaidRevenue.toLocaleString('en-IN')}</td>
                <td className="py-2 px-3 text-right font-mono text-slate-500">
                  {totalSales > 0 ? ((totalPaidRevenue / totalSales) * 100).toFixed(1) : 0}%
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-slate-600 pl-8">• वर्तमान शेष मार्केट उधारी (Credit)</td>
                <td className="py-2 px-3 text-right font-mono text-rose-600">₹{totalMarketReceivables.toLocaleString('en-IN')}</td>
                <td className="py-2 px-3 text-right font-mono text-slate-500">
                  {totalSales > 0 ? ((totalMarketReceivables / totalSales) * 100).toFixed(1) : 0}%
                </td>
              </tr>

              {/* COGS Section */}
              <tr className="font-bold bg-slate-50/70 text-rose-800">
                <td className="py-2.5 px-3">(B) तैयार माल वास्तविक लागत (COGS)</td>
                <td className="py-2.5 px-3 text-right font-mono font-bold">₹{totalCOGS.toLocaleString('en-IN')}</td>
                <td className="py-2.5 px-3 text-right font-mono">
                  {totalSales > 0 ? ((totalCOGS / totalSales) * 100).toFixed(1) : 0}%
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-slate-600 pl-8">• गेहूँ कच्चा माल लागत (Mandi Grain)</td>
                <td className="py-2 px-3 text-right font-mono">₹{Math.round(totalCOGS * 0.85).toLocaleString('en-IN')}</td>
                <td className="py-2 px-3 text-right font-mono text-slate-500">~68%</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-slate-600 pl-8">• बैग प्रिंटिंग व सिलाई लागत</td>
                <td className="py-2 px-3 text-right font-mono">₹{Math.round(totalCOGS * 0.09).toLocaleString('en-IN')}</td>
                <td className="py-2 px-3 text-right font-mono text-slate-500">~7%</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-slate-600 pl-8">• चक्की पिसाई विद्युत व घिसाई</td>
                <td className="py-2 px-3 text-right font-mono">₹{Math.round(totalCOGS * 0.06).toLocaleString('en-IN')}</td>
                <td className="py-2 px-3 text-right font-mono text-slate-500">~5%</td>
              </tr>

              {/* Gross Profit */}
              <tr className="font-bold bg-amber-50/80 text-amber-950">
                <td className="py-2.5 px-3">(C) सकल लाभ (Gross Profit = A - B)</td>
                <td className="py-2.5 px-3 text-right font-mono text-sm">₹{grossProfit.toLocaleString('en-IN')}</td>
                <td className="py-2.5 px-3 text-right font-mono">
                  {totalSales > 0 ? ((grossProfit / totalSales) * 100).toFixed(1) : 0}%
                </td>
              </tr>

              {/* Routine Operating Expenses */}
              <tr className="font-bold bg-slate-50/70 text-rose-800">
                <td className="py-2.5 px-3">(D) दैनिक संचालन खर्चे (Operating Overheads)</td>
                <td className="py-2.5 px-3 text-right font-mono font-bold">₹{routineOperatingExpenses.toLocaleString('en-IN')}</td>
                <td className="py-2.5 px-3 text-right font-mono">
                  {totalSales > 0 ? ((routineOperatingExpenses / totalSales) * 100).toFixed(1) : 0}%
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-slate-600 pl-8">• पिकअप गाड़ी डीजल व परिवहन</td>
                <td className="py-2 px-3 text-right font-mono">
                  ₹{expenses.filter(e => e.category === 'diesel_fuel').reduce((s, e) => s + e.amount, 0).toLocaleString('en-IN')}
                </td>
                <td className="py-2 px-3 text-right font-mono text-slate-500">-</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-slate-600 pl-8">• हमाली व स्टाफ मजदूरी</td>
                <td className="py-2 px-3 text-right font-mono">
                  ₹{expenses.filter(e => e.category === 'labor_salary').reduce((s, e) => s + e.amount, 0).toLocaleString('en-IN')}
                </td>
                <td className="py-2 px-3 text-right font-mono text-slate-500">-</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-slate-600 pl-8">• चाय, नाश्ता एवं विविध मिल खर्चे</td>
                <td className="py-2 px-3 text-right font-mono">
                  ₹{expenses.filter(e => e.category === 'office_tea').reduce((s, e) => s + e.amount, 0).toLocaleString('en-IN')}
                </td>
                <td className="py-2 px-3 text-right font-mono text-slate-500">-</td>
              </tr>

              {/* Net Profit Final */}
              <tr className="font-black bg-emerald-100/90 text-emerald-950 text-sm border-t-2 border-emerald-500">
                <td className="py-3 px-3">★ वास्तविक शुद्ध मुनाफा (Net Bottomline Profit = C - D)</td>
                <td className="py-3 px-3 text-right font-mono text-base text-emerald-800">₹{netProfit.toLocaleString('en-IN')}</td>
                <td className="py-3 px-3 text-right font-mono font-black">{profitMarginPercent.toFixed(1)}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
