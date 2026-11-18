import React, { useState, useMemo, useEffect } from 'react';
import {
  CommissionType,
  CompanySettings,
  Customer,
  Order,
  UserProfile,
  UserRole,
} from '../types/erp';
import {
  formatCommissionRuleHindi,
  resolveOrderCommission,
} from '../../shared/commission';
import {
  Briefcase,
  Calendar,
  Users,
  ShoppingCart,
  Package,
  IndianRupee,
  FileText,
  Share2,
  Search,
  UserPlus,
  Plus,
  CheckCircle2,
  Clock,
  Phone,
  MapPin,
  Award,
  Wallet,
  Sliders,
  Save,
  X,
  UserCheck,
} from 'lucide-react';

interface SalesmanLedgerViewProps {
  staffList: UserProfile[];
  customers: Customer[];
  orders: Order[];
  settings: CompanySettings;
  currentRole: UserRole;
  activeStaffMember?: UserProfile;
  canManageStaff?: boolean;
  initialSelectedSalesmanId?: string;
  onSelectOrder: (order: Order) => void;
  onUpdateStaff?: (staff: UserProfile) => void;
  onOpenNewOrderForCustomer?: (customerId: string) => void;
  onOpenNewCustomer?: () => void;
  onOpenReceivePayment?: (customerId: string) => void;
}

function getPreviousMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, '0')}`;
}

function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('hi-IN', { month: 'long', year: 'numeric' });
}

export const SalesmanLedgerView: React.FC<SalesmanLedgerViewProps> = ({
  staffList,
  customers,
  orders,
  settings,
  currentRole,
  activeStaffMember,
  canManageStaff = false,
  initialSelectedSalesmanId,
  onSelectOrder,
  onUpdateStaff,
  onOpenNewOrderForCustomer,
  onOpenNewCustomer,
  onOpenReceivePayment,
}) => {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const previousMonth = getPreviousMonth(currentMonth);

  const canViewAllSalesmen =
    currentRole === 'admin' ||
    currentRole === 'manager' ||
    currentRole === 'accountant';

  const salesmanProfiles = useMemo(() => {
    const list = staffList.filter((s) => s.role === 'salesman');
    const knownIds = new Set(list.map((s) => s.id));

    const extraEntries: UserProfile[] = [];
    for (const c of customers) {
      if (c.salesmanId && !knownIds.has(c.salesmanId)) {
        const matchedStaff = staffList.find((s) => s.id === c.salesmanId);
        knownIds.add(c.salesmanId);
        extraEntries.push(
          matchedStaff || {
            id: c.salesmanId,
            name: c.salesmanName || c.salesmanId,
            phone: '',
            role: 'salesman',
            roleHindi: 'सेल्समैन (फील्ड)',
            active: true,
            joinedDate: '',
          }
        );
      }
    }
    return [...list, ...extraEntries];
  }, [staffList, customers]);

  const visibleSalesmen = useMemo(() => {
    if (!canViewAllSalesmen && activeStaffMember?.role === 'salesman') {
      const own = salesmanProfiles.find((s) => s.id === activeStaffMember.id);
      return own ? [own] : [activeStaffMember];
    }
    return salesmanProfiles;
  }, [canViewAllSalesmen, activeStaffMember, salesmanProfiles]);

  const [selectedSalesmanId, setSelectedSalesmanId] = useState<string>(() => {
    if (initialSelectedSalesmanId) return initialSelectedSalesmanId;
    if (!canViewAllSalesmen && activeStaffMember?.role === 'salesman') {
      return activeStaffMember.id;
    }
    return visibleSalesmen[0]?.id || '';
  });

  useEffect(() => {
    if (initialSelectedSalesmanId) {
      setSelectedSalesmanId(initialSelectedSalesmanId);
    }
  }, [initialSelectedSalesmanId]);

  useEffect(() => {
    if (!visibleSalesmen.some((s) => s.id === selectedSalesmanId)) {
      setSelectedSalesmanId(visibleSalesmen[0]?.id || '');
    }
  }, [visibleSalesmen, selectedSalesmanId]);

  const [monthMode, setMonthMode] = useState<'single' | 'all'>('single');
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);
  const [detailTab, setDetailTab] = useState<'customers' | 'orders'>('customers');
  const [searchQuery, setSearchQuery] = useState('');

  // Custom Commission Editor Modal
  const [editingCommissionFor, setEditingCommissionFor] = useState<UserProfile | null>(null);
  const [commSalary, setCommSalary] = useState<number>(15000);
  const [commType, setCommType] = useState<CommissionType>('percent');
  const [commRate, setCommRate] = useState<number>(2);

  const openCommissionModal = (sm: UserProfile) => {
    setEditingCommissionFor(sm);
    setCommSalary(sm.baseSalary ?? 15000);
    setCommType(sm.commissionType || 'percent');
    setCommRate(sm.commissionRate ?? 2);
  };

  const handleSaveCommissionRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCommissionFor || !onUpdateStaff) return;
    onUpdateStaff({
      ...editingCommissionFor,
      baseSalary: Math.max(0, Number(commSalary) || 0),
      commissionType: commType,
      commissionRate: Math.max(0, Number(commRate) || 0),
    });
    setEditingCommissionFor(null);
  };

  const customerById = useMemo(() => {
    const map = new Map<string, Customer>();
    customers.forEach((c) => map.set(c.id, c));
    return map;
  }, [customers]);

  const getEffectiveOrderSalesmanId = (order: Order): string => {
    if (order.salesmanId) return order.salesmanId;
    return customerById.get(order.customerId)?.salesmanId || '';
  };

  // Compute summary + Delivered Commission per visible salesman
  const salesmanStatsMap = useMemo(() => {
    const stats = new Map<
      string,
      {
        customersAdded: Customer[];
        periodOrders: Order[];
        orderCount: number;
        deliveredOrderCount: number;
        totalBags: number;
        totalKg: number;
        totalAmount: number;
        paidAmount: number;
        dueAmount: number;
        activeCustomerCount: number;
        deliveredCommissionTotal: number;
        pendingCommissionTotal: number;
      }
    >();

    for (const sm of visibleSalesmen) {
      const addedCustomers = customers.filter((c) => c.salesmanId === sm.id);
      const periodOrders = orders.filter((o) => {
        if (o.status === 'cancelled') return false;
        const smId = getEffectiveOrderSalesmanId(o);
        if (smId !== sm.id) return false;
        if (monthMode === 'single' && !o.date.startsWith(selectedMonth)) return false;
        return true;
      });

      const activeSet = new Set<string>();
      let totalBags = 0;
      let totalKg = 0;
      let totalAmount = 0;
      let paidAmount = 0;
      let dueAmount = 0;
      let deliveredOrderCount = 0;
      let deliveredCommissionTotal = 0;
      let pendingCommissionTotal = 0;

      for (const ord of periodOrders) {
        activeSet.add(ord.customerId);
        totalAmount += ord.totalAmount || 0;
        paidAmount += ord.paidAmount || 0;
        dueAmount += ord.dueAmount || 0;
        for (const item of ord.items) {
          totalBags += item.quantity || 0;
          totalKg += (item.quantity || 0) * (item.bagSize || 0);
        }

        const commInfo = resolveOrderCommission(ord, sm);
        if (commInfo.isDelivered) {
          deliveredOrderCount += 1;
          deliveredCommissionTotal += commInfo.creditedAmount;
        } else {
          pendingCommissionTotal += commInfo.projectedAmount;
        }
      }

      stats.set(sm.id, {
        customersAdded: addedCustomers,
        periodOrders,
        orderCount: periodOrders.length,
        deliveredOrderCount,
        totalBags,
        totalKg,
        totalAmount,
        paidAmount,
        dueAmount,
        activeCustomerCount: activeSet.size,
        deliveredCommissionTotal: Math.round(deliveredCommissionTotal * 100) / 100,
        pendingCommissionTotal: Math.round(pendingCommissionTotal * 100) / 100,
      });
    }

    return stats;
  }, [visibleSalesmen, customers, orders, monthMode, selectedMonth, customerById]);

  // Combined totals across all visible salesmen
  const overallPeriodTotals = useMemo(() => {
    let totalCustomers = 0;
    let totalOrders = 0;
    let totalBags = 0;
    let totalKg = 0;
    let totalAmount = 0;
    let totalPaid = 0;
    let totalDue = 0;
    let totalDeliveredCommission = 0;

    salesmanStatsMap.forEach((st) => {
      totalCustomers += st.customersAdded.length;
      totalOrders += st.orderCount;
      totalBags += st.totalBags;
      totalKg += st.totalKg;
      totalAmount += st.totalAmount;
      totalPaid += st.paidAmount;
      totalDue += st.dueAmount;
      totalDeliveredCommission += st.deliveredCommissionTotal;
    });

    return {
      totalCustomers,
      totalOrders,
      totalBags,
      totalKg,
      totalAmount,
      totalPaid,
      totalDue,
      totalDeliveredCommission: Math.round(totalDeliveredCommission * 100) / 100,
    };
  }, [salesmanStatsMap]);

  const selectedSalesman =
    visibleSalesmen.find((s) => s.id === selectedSalesmanId) || visibleSalesmen[0];
  const selectedStats = selectedSalesman
    ? salesmanStatsMap.get(selectedSalesman.id)
    : undefined;

  const selectedBaseSalary = selectedSalesman?.baseSalary || 0;
  const selectedTotalPayableSalary =
    selectedBaseSalary + (selectedStats?.deliveredCommissionTotal || 0);

  // Build customer-wise monthly breakdown for selected salesman
  const customerBreakdownRows = useMemo(() => {
    if (!selectedSalesman || !selectedStats) return [];

    const customerMapForSm = new Map<string, Customer>();
    selectedStats.customersAdded.forEach((c) => customerMapForSm.set(c.id, c));
    selectedStats.periodOrders.forEach((o) => {
      const c = customerById.get(o.customerId);
      if (c && !customerMapForSm.has(c.id)) {
        customerMapForSm.set(c.id, c);
      }
    });

    const rows = Array.from(customerMapForSm.values()).map((cust) => {
      const custOrders = selectedStats.periodOrders.filter(
        (o) => o.customerId === cust.id
      );
      const orderCount = custOrders.length;
      const bagsCount = custOrders.reduce(
        (s, o) => s + o.items.reduce((isum, i) => isum + i.quantity, 0),
        0
      );
      const weightKg = custOrders.reduce(
        (s, o) =>
          s + o.items.reduce((isum, i) => isum + i.quantity * i.bagSize, 0),
        0
      );
      const orderAmount = custOrders.reduce((s, o) => s + o.totalAmount, 0);
      const paidAmount = custOrders.reduce((s, o) => s + o.paidAmount, 0);
      const dueInPeriod = custOrders.reduce((s, o) => s + o.dueAmount, 0);
      const deliveredComm = custOrders.reduce(
        (s, o) => s + resolveOrderCommission(o, selectedSalesman).creditedAmount,
        0
      );
      const latestDate =
        custOrders.length > 0
          ? custOrders.map((o) => o.date).sort().reverse()[0]
          : cust.lastOrderDate || '';

      return {
        customer: cust,
        isAddedByThisSalesman: cust.salesmanId === selectedSalesman.id,
        orderCount,
        bagsCount,
        weightKg,
        orderAmount,
        paidAmount,
        dueInPeriod,
        deliveredComm: Math.round(deliveredComm * 100) / 100,
        latestDate,
      };
    });

    const q = searchQuery.trim().toLowerCase();
    const filtered = q
      ? rows.filter(
          (r) =>
            r.customer.firmName.toLowerCase().includes(q) ||
            r.customer.name.toLowerCase().includes(q) ||
            r.customer.phone.includes(q) ||
            r.customer.city.toLowerCase().includes(q)
        )
      : rows;

    return filtered.sort((a, b) => b.orderAmount - a.orderAmount);
  }, [selectedSalesman, selectedStats, customerById, searchQuery]);

  const filteredPeriodOrders = useMemo(() => {
    if (!selectedStats) return [];
    const q = searchQuery.trim().toLowerCase();
    const list = q
      ? selectedStats.periodOrders.filter(
          (o) =>
            o.invoiceNumber.toLowerCase().includes(q) ||
            o.customerFirm.toLowerCase().includes(q) ||
            o.customerName.toLowerCase().includes(q)
        )
      : selectedStats.periodOrders;

    return [...list].sort((a, b) => b.date.localeCompare(a.date));
  }, [selectedStats, searchQuery]);

  const periodLabel =
    monthMode === 'all' ? 'सभी महीने (All Time)' : formatMonthLabel(selectedMonth);

  const handleShareSalesmanReport = () => {
    if (!selectedSalesman || !selectedStats) return;
    const topCustLines = customerBreakdownRows
      .filter((r) => r.orderCount > 0)
      .slice(0, 8)
      .map(
        (r, i) =>
          `${i + 1}. ${r.customer.firmName}: ${r.orderCount} ऑर्डर (${r.bagsCount} बैग) = ₹${r.orderAmount.toLocaleString('en-IN')}`
      )
      .join('%0A');

    const msg =
      `*${settings.companyName}* - ${settings.brandName} आटा%0A` +
      `📊 *सेल्समैन फील्ड, सैलरी व कमीशन रिपोर्ट*%0A` +
      `👤 *सेल्समैन*: ${selectedSalesman.name}%0A` +
      `📅 *अवधि*: ${periodLabel}%0A` +
      `--------------------------------%0A` +
      `🏪 *जोड़े गए कुल ग्राहक/डीलर*: ${selectedStats.customersAdded.length} (${selectedStats.activeCustomerCount} सक्रिय)%0A` +
      `📦 *कुल ऑर्डर्स*: ${selectedStats.orderCount} ऑर्डर (${selectedStats.totalBags} बैग • डिलीवर्ड: ${selectedStats.deliveredOrderCount})%0A` +
      `💰 *कुल ऑर्डर राशि*: ₹${selectedStats.totalAmount.toLocaleString('en-IN')}%0A` +
      `💵 *मूल सैलरी*: ₹${selectedBaseSalary.toLocaleString('en-IN')}%0A` +
      `🏅 *डिलीवर्ड कमीशन*: +₹${selectedStats.deliveredCommissionTotal.toLocaleString('en-IN')} (${formatCommissionRuleHindi(selectedSalesman)})%0A` +
      `💳 *कुल देय सैलरी*: ₹${selectedTotalPayableSalary.toLocaleString('en-IN')}%0A` +
      (topCustLines ? `--------------------------------%0A*ग्राहक-वार ऑर्डर:*%0A${topCustLines}%0A` : '') +
      `--------------------------------%0ATEJ FOOD PRODUCTS ERP`;

    window.open(`https://api.whatsapp.com/send?text=${msg}`, '_blank');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header & Month Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-amber-600" />
            <span>सेल्समैन फील्ड, सैलरी व कमीशन लेखा-जोखा (Salesman Ledger)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            सेल्समैन द्वारा जोड़े गए होलसेल डीलर/रिटेल कस्टमर, मासिक ऑर्डर एवं डिलीवरी के बाद जुड़ा कस्टमाइज कमीशन
          </p>
        </div>

        {/* Month Filter Bar */}
        <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs text-xs">
          <button
            type="button"
            onClick={() => {
              setMonthMode('single');
              setSelectedMonth(currentMonth);
            }}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              monthMode === 'single' && selectedMonth === currentMonth
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            इस महीने ({formatMonthLabel(currentMonth)})
          </button>

          <button
            type="button"
            onClick={() => {
              setMonthMode('single');
              setSelectedMonth(previousMonth);
            }}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              monthMode === 'single' && selectedMonth === previousMonth
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            पिछला महीना
          </button>

          <button
            type="button"
            onClick={() => setMonthMode('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              monthMode === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            सभी महीने
          </button>

          <div className="flex items-center gap-1.5 pl-1 border-l border-slate-200">
            <Calendar className="w-3.5 h-3.5 text-amber-600" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => {
                if (e.target.value) {
                  setMonthMode('single');
                  setSelectedMonth(e.target.value);
                }
              }}
              className="px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* Team Overview KPIs (for selected period) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase">
            {monthMode === 'single' ? 'इस महीने कुल सेल्समैन ऑर्डर' : 'कुल सेल्समैन ऑर्डर राशि'}
          </span>
          <span className="font-mono font-black text-2xl text-slate-950 block mt-1">
            ₹{overallPeriodTotals.totalAmount.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-amber-700 font-semibold block mt-0.5">
            {overallPeriodTotals.totalOrders} ऑर्डर • {overallPeriodTotals.totalBags} बैग
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase">
            डिलीवर्ड ऑर्डर्स पर कुल कमीशन
          </span>
          <span className="font-mono font-black text-2xl text-emerald-700 block mt-1">
            ₹{overallPeriodTotals.totalDeliveredCommission.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-slate-500 block mt-0.5">
            केवल डिलीवर हुए ऑर्डर का कमीशन जुड़ा
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase">
            सेल्समैन द्वारा जोड़े खाते
          </span>
          <span className="font-mono font-black text-2xl text-blue-700 block mt-1">
            {overallPeriodTotals.totalCustomers} खाते
          </span>
          <span className="text-[11px] text-slate-500 block mt-0.5">
            {visibleSalesmen.length} सक्रिय सेल्समैन फील्ड टीम
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase">
            ऑर्डर वसूली बनाम बकाया
          </span>
          <span className="font-mono font-black text-xl text-emerald-700 block mt-1">
            जमा: ₹{overallPeriodTotals.totalPaid.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] font-mono font-bold text-rose-600 block mt-0.5">
            बकाया: ₹{overallPeriodTotals.totalDue.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* No Salesman Found State */}
      {visibleSalesmen.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
          <Briefcase className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">कोई सेल्समैन खाता नहीं मिला</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            पहले &quot;स्टाफ मैनेजमेंट&quot; में जाकर किसी कर्मचारी का पद <strong>सेल्समैन (Salesman)</strong> चुनें, फिर उसके जोड़े गए ग्राहकों व ऑर्डर का मासिक लेखा-जोखा यहाँ स्वतः दिखेगा।
          </p>
        </div>
      ) : (
        <>
          {/* Salesman Selector Cards */}
          {canViewAllSalesmen && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-600" />
                  <span>सेल्समैन चुनें ({visibleSalesmen.length}) — {periodLabel}</span>
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {visibleSalesmen.map((sm) => {
                  const st = salesmanStatsMap.get(sm.id);
                  const isSelected = selectedSalesman?.id === sm.id;
                  const smPayable = (sm.baseSalary || 0) + (st?.deliveredCommissionTotal || 0);
                  return (
                    <button
                      key={sm.id}
                      type="button"
                      onClick={() => setSelectedSalesmanId(sm.id)}
                      className={`text-left p-4 rounded-2xl border-2 transition cursor-pointer ${
                        isSelected
                          ? 'bg-slate-950 text-white border-amber-500 shadow-lg'
                          : 'bg-white text-slate-900 border-slate-200 hover:border-amber-400'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isSelected
                                ? 'bg-amber-500 text-slate-950'
                                : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            सेल्समैन फील्ड
                          </span>
                          <h3 className="font-black text-sm mt-1.5">{sm.name}</h3>
                          <p
                            className={`text-[10px] mt-0.5 ${
                              isSelected ? 'text-amber-300' : 'text-amber-800'
                            }`}
                          >
                            कमीशन: {formatCommissionRuleHindi(sm)}
                          </p>
                        </div>

                        <div className="text-right">
                          <span
                            className={`text-[10px] block ${
                              isSelected ? 'text-emerald-300' : 'text-slate-500'
                            }`}
                          >
                            सैलरी + डिलीवर कमीशन
                          </span>
                          <span className="font-mono font-black text-lg block">
                            ₹{smPayable.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      <div
                        className={`mt-3 pt-2.5 border-t grid grid-cols-3 gap-2 text-[11px] ${
                          isSelected ? 'border-slate-800 text-slate-300' : 'border-slate-100 text-slate-600'
                        }`}
                      >
                        <div>
                          <span className="block text-[10px] opacity-75">ग्राहक/डीलर</span>
                          <strong className={isSelected ? 'text-white' : 'text-slate-900'}>
                            {st?.customersAdded.length || 0} खाता
                          </strong>
                        </div>
                        <div>
                          <span className="block text-[10px] opacity-75">ऑर्डर्स</span>
                          <strong className={isSelected ? 'text-amber-300' : 'text-amber-700'}>
                            {st?.orderCount || 0} ऑर्डर
                          </strong>
                        </div>
                        <div>
                          <span className="block text-[10px] opacity-75">डिलीवर्ड कमीशन</span>
                          <strong className={isSelected ? 'text-emerald-300' : 'text-emerald-700'}>
                            +₹{(st?.deliveredCommissionTotal || 0).toLocaleString('en-IN')}
                          </strong>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Selected Salesman Field Ledger + Salary & Commission Panel */}
          {selectedSalesman && selectedStats && (
            <div className="bg-white rounded-2xl border-2 border-amber-400/70 shadow-sm overflow-hidden">
              {/* Banner */}
              <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950 text-white p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black uppercase">
                      सेल्समैन फील्ड व वेतन खाता
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-amber-200 text-[10px] font-bold">
                      अवधि: {periodLabel}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-[10px] font-bold">
                      {formatCommissionRuleHindi(selectedSalesman)}
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-black mt-1.5">
                    {selectedSalesman.name} — ऑर्डर, सैलरी व डिलीवरी कमीशन लेखा-जोखा
                  </h2>
                  <p className="text-xs text-slate-300 mt-0.5">
                    जोड़े गए खाते: <strong>{selectedStats.customersAdded.length}</strong> • {periodLabel} में{' '}
                    <strong>{selectedStats.orderCount} ऑर्डर</strong> ({selectedStats.deliveredOrderCount} डिलीवर्ड •{' '}
                    <strong className="text-amber-300">
                      ₹{selectedStats.totalAmount.toLocaleString('en-IN')}
                    </strong>
                    )
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {canManageStaff && onUpdateStaff && (
                    <button
                      type="button"
                      onClick={() => openCommissionModal(selectedSalesman)}
                      className="px-3 py-2 bg-white text-slate-950 hover:bg-amber-100 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                    >
                      <Sliders className="w-3.5 h-3.5 text-amber-700" />
                      <span>कमीशन / सैलरी सेट करें</span>
                    </button>
                  )}

                  {onOpenNewCustomer && (
                    <button
                      type="button"
                      onClick={onOpenNewCustomer}
                      className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>+ नया खाता जोड़ें</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleShareSalesmanReport}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>WhatsApp रिपोर्ट</span>
                  </button>
                </div>
              </div>

              {/* Salary & Commission Breakdown Strip */}
              <div className="p-4 bg-gradient-to-r from-emerald-50 via-white to-amber-50 border-b border-slate-200 grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                    <Wallet className="w-3.5 h-3.5 text-slate-500" />
                    <span>मूल मासिक सैलरी (Base Salary)</span>
                  </span>
                  <span className="font-mono font-black text-lg text-slate-900 block mt-1">
                    ₹{selectedBaseSalary.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-emerald-300">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>डिलीवर्ड कमीशन ({selectedStats.deliveredOrderCount} ऑर्डर)</span>
                  </span>
                  <span className="font-mono font-black text-lg text-emerald-700 block mt-1">
                    +₹{selectedStats.deliveredCommissionTotal.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="bg-slate-900 text-white p-3 rounded-xl border border-amber-400">
                  <span className="text-[10px] font-bold text-amber-300 uppercase block">
                    कुल देय सैलरी (Salary + Commission)
                  </span>
                  <span className="font-mono font-black text-xl text-white block mt-1">
                    ₹{selectedTotalPayableSalary.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-amber-200">
                  <span className="text-[10px] font-bold text-amber-800 uppercase flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>पेंडिंग डिलीवरी कमीशन</span>
                  </span>
                  <span className="font-mono font-black text-lg text-amber-700 block mt-1">
                    ₹{selectedStats.pendingCommissionTotal.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    ऑर्डर Delivered होने पर सैलरी में जुड़ेगा
                  </span>
                </div>
              </div>

              {/* Sub-navigation & Search */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDetailTab('customers')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                      detailTab === 'customers'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>ग्राहक/डीलर-वार हिसाब ({customerBreakdownRows.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDetailTab('orders')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                      detailTab === 'orders'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>इस अवधि के सभी ऑर्डर ({filteredPeriodOrders.length})</span>
                  </button>
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ग्राहक, डीलर या बिल नं. खोजें..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Detail Tab 1: Customer-wise Monthly Ledger */}
              {detailTab === 'customers' && (
                <div className="overflow-x-auto">
                  {customerBreakdownRows.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500 space-y-2">
                      <Users className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-bold text-slate-700">
                        इस सेल्समैन के अंतर्गत अभी कोई डीलर/ग्राहक खाता लिंक नहीं है।
                      </p>
                      <p>
                        नया होलसेल डीलर या रिटेल कस्टमर जोड़ते समय सेल्समैन चुनें — उसके सभी ऑर्डर और कमीशन यहाँ अपने-आप दिखेंगे।
                      </p>
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4">डीलर / ग्राहक विवरण</th>
                          <th className="py-3 px-3 text-center">
                            {monthMode === 'single' ? 'इस माह ऑर्डर' : 'कुल ऑर्डर'}
                          </th>
                          <th className="py-3 px-3 text-center">कुल बैग / वजन</th>
                          <th className="py-3 px-3 text-right">कुल ऑर्डर राशि</th>
                          <th className="py-3 px-3 text-right">डिलीवर कमीशन</th>
                          <th className="py-3 px-3 text-right">कुल वर्तमान बकाया</th>
                          <th className="py-3 px-4 text-center">कार्रवाई</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {customerBreakdownRows.map((row) => {
                          const { customer } = row;
                          return (
                            <tr key={customer.id} className="hover:bg-amber-50/40 transition">
                              <td className="py-3 px-4">
                                <div className="flex items-start gap-2.5">
                                  <div
                                    className={`w-8 h-8 rounded-xl font-black flex items-center justify-center shrink-0 ${
                                      customer.type === 'wholesaler'
                                        ? 'bg-blue-100 text-blue-900'
                                        : 'bg-amber-100 text-amber-900'
                                    }`}
                                  >
                                    {customer.firmName.charAt(0)}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-bold text-slate-900 text-sm">
                                        {customer.firmName}
                                      </span>
                                      <span
                                        className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                                          customer.type === 'wholesaler'
                                            ? 'bg-blue-100 text-blue-800'
                                            : 'bg-amber-100 text-amber-800'
                                        }`}
                                      >
                                        {customer.type === 'wholesaler' ? 'होलसेल' : 'रिटेल'}
                                      </span>
                                      {customer.entryByName && (
                                        <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full font-bold">
                                          <UserCheck className="w-2.5 h-2.5" />
                                          Entry By: {customer.entryByName}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                                      <span>श्री {customer.name}</span>
                                      <span className="inline-flex items-center gap-0.5 font-mono">
                                        <Phone className="w-3 h-3 text-slate-400" />
                                        {customer.phone}
                                      </span>
                                      <span className="inline-flex items-center gap-0.5">
                                        <MapPin className="w-3 h-3 text-slate-400" />
                                        {customer.city}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3 px-3 text-center">
                                {row.orderCount > 0 ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 font-black">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                                    <span>{row.orderCount} ऑर्डर</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-semibold">
                                    <Clock className="w-3 h-3" />
                                    <span>0 ऑर्डर</span>
                                  </span>
                                )}
                                {row.latestDate && (
                                  <span className="block text-[10px] text-slate-500 mt-0.5 font-mono">
                                    अंतिम: {row.latestDate}
                                  </span>
                                )}
                              </td>

                              <td className="py-3 px-3 text-center font-mono">
                                <span className="font-bold text-slate-900 block">
                                  {row.bagsCount} बैग
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  {row.weightKg} KG
                                </span>
                              </td>

                              <td className="py-3 px-3 text-right font-mono">
                                <span className="font-black text-sm text-slate-950 block">
                                  ₹{row.orderAmount.toLocaleString('en-IN')}
                                </span>
                              </td>

                              <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                                +₹{row.deliveredComm.toLocaleString('en-IN')}
                              </td>

                              <td className="py-3 px-3 text-right font-mono">
                                <span
                                  className={`font-black ${
                                    customer.currentDue > 0 ? 'text-rose-600' : 'text-slate-400'
                                  }`}
                                >
                                  ₹{customer.currentDue.toLocaleString('en-IN')}
                                </span>
                              </td>

                              <td className="py-3 px-4 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  {onOpenNewOrderForCustomer && (
                                    <button
                                      type="button"
                                      onClick={() => onOpenNewOrderForCustomer(customer.id)}
                                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                                    >
                                      <Plus className="w-3 h-3" />
                                      <span>ऑर्डर</span>
                                    </button>
                                  )}
                                  {onOpenReceivePayment && customer.currentDue > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => onOpenReceivePayment(customer.id)}
                                      className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                                    >
                                      <IndianRupee className="w-3 h-3" />
                                      <span>वसूली</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Detail Tab 2: Orders History List for Selected Period */}
              {detailTab === 'orders' && (
                <div className="overflow-x-auto">
                  {filteredPeriodOrders.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500 space-y-2">
                      <Package className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-bold text-slate-700">
                        {periodLabel} में इस सेल्समैन के ग्राहकों का कोई ऑर्डर दर्ज नहीं है।
                      </p>
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4">इनवॉइस व तारीख</th>
                          <th className="py-3 px-3">ग्राहक / डीलर</th>
                          <th className="py-3 px-3">सामान व बैग</th>
                          <th className="py-3 px-3 text-right">कुल राशि</th>
                          <th className="py-3 px-3 text-right">कमीशन स्थिति</th>
                          <th className="py-3 px-3 text-center">स्थिति</th>
                          <th className="py-3 px-4 text-center">बिल</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredPeriodOrders.map((ord) => {
                          const totalBags = ord.items.reduce((s, i) => s + i.quantity, 0);
                          const comm = resolveOrderCommission(ord, selectedSalesman);
                          return (
                            <tr key={ord.id} className="hover:bg-slate-50 transition">
                              <td className="py-3 px-4">
                                <span className="font-mono font-bold text-slate-900 block">
                                  {ord.invoiceNumber}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  📅 {ord.date}
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                <span className="font-bold text-slate-900 block">
                                  {ord.customerFirm}
                                </span>
                                <span className="text-[11px] text-slate-600">
                                  श्री {ord.customerName}
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                {ord.items.map((item, idx) => (
                                  <div key={idx} className="text-[11px] text-slate-700">
                                    • {item.productName} ({item.bagSize}KG × {item.quantity})
                                  </div>
                                ))}
                                <span className="text-[10px] font-bold text-amber-800 block mt-0.5">
                                  कुल {totalBags} बैग
                                </span>
                              </td>
                              <td className="py-3 px-3 text-right font-mono font-black text-slate-900">
                                ₹{ord.totalAmount.toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-3 text-right font-mono">
                                {comm.isDelivered ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold text-[11px]">
                                    +₹{comm.creditedAmount.toLocaleString('en-IN')} ✓ जुड़ा
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-semibold text-[10px]">
                                    डिलीवरी पर: ₹{comm.projectedAmount.toLocaleString('en-IN')}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                    ord.status === 'delivered'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-slate-100 text-slate-800'
                                  }`}
                                >
                                  {ord.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <button
                                  type="button"
                                  onClick={() => onSelectOrder(ord)}
                                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <FileText className="w-3 h-3" />
                                  <span>देखें</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Customize Salesman Salary & Commission Modal */}
      {editingCommissionFor && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 text-xs text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-600" />
                  <span>सेल्समैन सैलरी व कमीशन कस्टमाइज़ करें</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  सेल्समैन: <strong>{editingCommissionFor.name}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingCommissionFor(null)}
                className="p-1 text-slate-400 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCommissionRule} className="space-y-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  मूल मासिक सैलरी / Base Salary (₹) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={commSalary}
                  onChange={(e) => setCommSalary(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  कमीशन गणना तरीका (Commission Mode) *
                </label>
                <select
                  value={commType}
                  onChange={(e) => setCommType(e.target.value as CommissionType)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                >
                  <option value="percent">बिल राशि का प्रतिशत (% of Order Total)</option>
                  <option value="per_bag">प्रति बैग निश्चित राशि (₹ per Bag)</option>
                  <option value="fixed_per_order">प्रति डिलीवर ऑर्डर निश्चित राशि (₹ per Order)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {commType === 'percent'
                    ? 'कमीशन प्रतिशत (%)*'
                    : commType === 'per_bag'
                    ? 'प्रति बैग कमीशन (₹)*'
                    : 'प्रति डिलीवर ऑर्डर कमीशन (₹)*'}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  required
                  value={commRate}
                  onChange={(e) => setCommRate(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-emerald-50 border border-emerald-300 rounded-xl font-mono font-black text-emerald-800 text-sm"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900">
                ऑर्डर की स्थिति <strong>Delivered</strong> होने पर यह कमीशन स्वतः सेल्समैन की कुल देय सैलरी में जुड़ जाएगा।
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingCommissionFor(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>कमीशन नियम सेव करें</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
