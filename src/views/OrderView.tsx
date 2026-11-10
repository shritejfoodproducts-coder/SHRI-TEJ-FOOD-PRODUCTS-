import React, { useState } from 'react';
import { Order, OrderStatus } from '../types/erp';
import { 
  ClipboardList, 
  Plus, 
  Search, 
  Filter, 
  Printer, 
  Share2, 
  Clock, 
  Factory, 
  Truck, 
  CheckCircle2, 
  ArrowRight,
  FileText
} from 'lucide-react';

interface OrderViewProps {
  orders: Order[];
  onOpenNewOrder: () => void;
  onSelectOrder: (order: Order) => void;
  onUpdateOrderStatus: (orderId: string, newStatus: OrderStatus) => void;
}

export const OrderView: React.FC<OrderViewProps> = ({
  orders,
  onOpenNewOrder,
  onSelectOrder,
  onUpdateOrderStatus,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [billTypeFilter, setBillTypeFilter] = useState<string>('all');

  const filteredOrders = orders.filter((o) => {
    const matchesSearch = 
      o.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerFirm.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerPhone.includes(searchQuery);

    if (!matchesSearch) return false;
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (billTypeFilter !== 'all' && o.billType !== billTypeFilter) return false;

    return true;
  });

  const getStatusBadge = (st: OrderStatus) => {
    switch (st) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 px-2.5 py-1 rounded-full text-xs font-bold">
            <Clock className="w-3 h-3 text-amber-700" />
            <span>पेंडिंग (Pending)</span>
          </span>
        );
      case 'in_production':
        return (
          <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-900 px-2.5 py-1 rounded-full text-xs font-bold">
            <Factory className="w-3 h-3 text-orange-700" />
            <span>प्रोडक्शन में</span>
          </span>
        );
      case 'ready_dispatch':
        return (
          <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-900 px-2.5 py-1 rounded-full text-xs font-bold">
            <CheckCircle2 className="w-3 h-3 text-blue-700" />
            <span>डिस्पैच तैयार</span>
          </span>
        );
      case 'dispatched':
        return (
          <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-900 px-2.5 py-1 rounded-full text-xs font-bold">
            <Truck className="w-3 h-3 text-purple-700" />
            <span>गाड़ी रवाना</span>
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-900 px-2.5 py-1 rounded-full text-xs font-bold">
            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
            <span>डिलीवर पूर्ण ✓</span>
          </span>
        );
      default:
        return <span>{st}</span>;
    }
  };

  const getNextStatusAction = (currentStatus: OrderStatus) => {
    switch (currentStatus) {
      case 'pending':
        return { label: 'प्रोडक्शन में भेजें', next: 'in_production' as OrderStatus, color: 'bg-orange-600 hover:bg-orange-700' };
      case 'in_production':
        return { label: 'डिस्पैच तैयार करें', next: 'ready_dispatch' as OrderStatus, color: 'bg-blue-600 hover:bg-blue-700' };
      case 'ready_dispatch':
        return { label: 'गाड़ी रवाना करें', next: 'dispatched' as OrderStatus, color: 'bg-purple-600 hover:bg-purple-700' };
      case 'dispatched':
        return { label: 'डिलीवर मार्क करें', next: 'delivered' as OrderStatus, color: 'bg-emerald-600 hover:bg-emerald-700' };
      case 'delivered':
        return null;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-amber-600" />
            <span>ऑर्डर एवं बिलिंग प्रबंधन (Order & Billing Management)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            GST टैक्स इनवॉइस, चालान, ऑर्डर ट्रैकिंग (Pending ➔ Production ➔ Dispatch ➔ Delivered)
          </p>
        </div>

        <button
          onClick={onOpenNewOrder}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>+ नया ऑर्डर / बिल बनाएँ</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="इनवॉइस नं, ग्राहक, फर्म या फोन खोजें..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              statusFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            सभी ऑर्डर्स ({orders.length})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              statusFilter === 'pending' ? 'bg-amber-500 text-slate-950' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            पेंडिंग ({orders.filter(o => o.status === 'pending').length})
          </button>
          <button
            onClick={() => setStatusFilter('in_production')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              statusFilter === 'in_production' ? 'bg-orange-600 text-white' : 'bg-orange-50 text-orange-800 hover:bg-orange-100'
            }`}
          >
            प्रोडक्शन में ({orders.filter(o => o.status === 'in_production').length})
          </button>
          <button
            onClick={() => setStatusFilter('ready_dispatch')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              statusFilter === 'ready_dispatch' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
            }`}
          >
            तैयार माल ({orders.filter(o => o.status === 'ready_dispatch').length})
          </button>
          <button
            onClick={() => setStatusFilter('dispatched')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              statusFilter === 'dispatched' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
            }`}
          >
            रवाना ({orders.filter(o => o.status === 'dispatched').length})
          </button>
          <button
            onClick={() => setStatusFilter('delivered')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              statusFilter === 'delivered' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            डिलीवर ({orders.filter(o => o.status === 'delivered').length})
          </button>
        </div>
      </div>

      {/* Orders List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">इनवॉइस व तारीख</th>
                <th className="py-3 px-3">ग्राहक / फर्म विवरण</th>
                <th className="py-3 px-3">सामान (Items & Bags)</th>
                <th className="py-3 px-3 text-right">कुल बिल राशि</th>
                <th className="py-3 px-3 text-right">भुगतान स्थिति</th>
                <th className="py-3 px-3 text-center">लाइव स्थिति</th>
                <th className="py-3 px-4 text-center">कार्रवाई / स्टेटस आगे बढ़ाएँ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map((order) => {
                const totalBags = order.items.reduce((s, i) => s + i.quantity, 0);
                const nextAction = getNextStatusAction(order.status);

                return (
                  <tr key={order.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          {order.invoiceNumber}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded-sm font-bold uppercase ${
                          order.billType === 'gst' ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {order.billType}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                        📅 {order.date}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-900 block text-xs">
                        {order.customerFirm}
                      </span>
                      <span className="text-[11px] text-slate-600 block">
                        श्री {order.customerName} (मो: {order.customerPhone})
                      </span>
                      <span className="text-[10px] text-slate-500 truncate max-w-xs block">
                        {order.customerAddress}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <div className="space-y-0.5">
                        {order.items.map((i, idx) => (
                          <div key={idx} className="text-[11px] text-slate-700">
                            • {i.productName} <strong>({i.bagSize} KG x {i.quantity})</strong>
                          </div>
                        ))}
                        <span className="text-[10px] text-amber-800 font-bold block pt-0.5">
                          कुल: {totalBags} बैग
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-right font-mono">
                      <span className="font-black text-sm text-slate-900 block">
                        ₹{order.totalAmount.toLocaleString('en-IN')}
                      </span>
                      {order.taxAmount > 0 && (
                        <span className="text-[10px] text-slate-500 block">
                          (GST: ₹{order.taxAmount})
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right font-mono">
                      <span className="text-emerald-700 font-bold block">
                        जमा: ₹{order.paidAmount.toLocaleString('en-IN')}
                      </span>
                      {order.dueAmount > 0 ? (
                        <span className="text-rose-600 font-bold text-[11px] block">
                          बकाया: ₹{order.dueAmount.toLocaleString('en-IN')}
                        </span>
                      ) : (
                        <span className="text-emerald-600 text-[10px] block">
                          पूर्ण चुकता ✓
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-center">
                      {getStatusBadge(order.status)}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5">
                        <button
                          onClick={() => onSelectOrder(order)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition flex items-center gap-1"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>बिल देखें</span>
                        </button>

                        {nextAction && (
                          <button
                            onClick={() => onUpdateOrderStatus(order.id, nextAction.next)}
                            className={`px-2.5 py-1.5 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs ${nextAction.color}`}
                          >
                            <span>{nextAction.label}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
