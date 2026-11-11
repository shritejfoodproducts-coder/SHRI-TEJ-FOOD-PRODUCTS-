import React, { useState } from 'react';
import { Order, OrderStatus, BillType, OrderItem, BagSize } from '../types/erp';
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
  FileText,
  Edit3,
  Trash2,
  X,
  Save,
  AlertTriangle,
  IndianRupee,
  Layers
} from 'lucide-react';

interface OrderViewProps {
  orders: Order[];
  onOpenNewOrder: () => void;
  onSelectOrder: (order: Order) => void;
  onUpdateOrderStatus: (orderId: string, newStatus: OrderStatus) => void;
  onUpdateOrder?: (updatedOrder: Order, originalOrder: Order) => void;
  onDeleteOrder?: (orderId: string) => void;
}

export const OrderView: React.FC<OrderViewProps> = ({
  orders,
  onOpenNewOrder,
  onSelectOrder,
  onUpdateOrderStatus,
  onUpdateOrder,
  onDeleteOrder,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [billTypeFilter, setBillTypeFilter] = useState<string>('all');

  // Edit order state
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editItems, setEditItems] = useState<OrderItem[]>([]);
  const [editBillType, setEditBillType] = useState<BillType>('gst');
  const [editDiscount, setEditDiscount] = useState<number>(0);
  const [editFreight, setEditFreight] = useState<number>(0);
  const [editPaidAmount, setEditPaidAmount] = useState<number>(0);
  const [editPaymentMode, setEditPaymentMode] = useState<'cash' | 'bank' | 'upi' | 'credit' | 'partial'>('cash');
  const [editStatus, setEditStatus] = useState<OrderStatus>('pending');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editVehicleNumber, setEditVehicleNumber] = useState<string>('');

  // Delete order state
  const [deleteConfirmOrder, setDeleteConfirmOrder] = useState<Order | null>(null);

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
            <Truck className="w-3 h-3 text-blue-700" />
            <span>डिस्पैच तैयार</span>
          </span>
        );
      case 'dispatched':
        return (
          <span className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-900 px-2.5 py-1 rounded-full text-xs font-bold">
            <Truck className="w-3 h-3 text-indigo-700" />
            <span>रवाना (गाड़ी में)</span>
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-900 px-2.5 py-1 rounded-full text-xs font-bold">
            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
            <span>डिलीवर्ड ✓</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-900 px-2.5 py-1 rounded-full text-xs font-bold">
            <span>रद्द (Cancelled)</span>
          </span>
        );
      default:
        return null;
    }
  };

  const getNextStatusAction = (st: OrderStatus) => {
    switch (st) {
      case 'pending':
        return { label: 'प्रोडक्शन भेजें', next: 'in_production' as OrderStatus, color: 'bg-orange-600 hover:bg-orange-700' };
      case 'in_production':
        return { label: 'डिस्पैच तैयार', next: 'ready_dispatch' as OrderStatus, color: 'bg-blue-600 hover:bg-blue-700' };
      case 'ready_dispatch':
        return { label: 'गाड़ी में रवाना', next: 'dispatched' as OrderStatus, color: 'bg-indigo-600 hover:bg-indigo-700' };
      case 'dispatched':
        return { label: 'डिलीवर हुआ', next: 'delivered' as OrderStatus, color: 'bg-emerald-600 hover:bg-emerald-700' };
      default:
        return null;
    }
  };

  // Start editing order
  const startEditOrder = (order: Order) => {
    setEditingOrder(order);
    setEditItems(order.items.map(i => ({ ...i })));
    setEditBillType(order.billType);
    setEditDiscount(order.discount || 0);
    setEditFreight(order.freightCharges || 0);
    setEditPaidAmount(order.paidAmount || 0);
    setEditPaymentMode(order.paymentMode || 'cash');
    setEditStatus(order.status);
    setEditNotes(order.notes || '');
    setEditVehicleNumber(order.vehicleNumber || '');
  };

  // Update item line in edit modal
  const handleItemChange = (index: number, field: 'quantity' | 'ratePerBag', val: number) => {
    const updated = [...editItems];
    const item = { ...updated[index], [field]: val };
    item.totalAmount = (item.quantity || 0) * (item.ratePerBag || 0);
    updated[index] = item;
    setEditItems(updated);
  };

  // Calculations for edit order
  const editSubtotal = editItems.reduce((s, i) => s + (i.quantity * i.ratePerBag), 0);
  const editTaxable = Math.max(0, editSubtotal - editDiscount);
  const editTaxAmount = editBillType === 'gst' ? Math.round(editTaxable * 0.05) : 0;
  const editTotalAmount = editTaxable + editTaxAmount + editFreight;
  const editDueAmount = Math.max(0, editTotalAmount - editPaidAmount);

  // Save edited order
  const handleSaveEditOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder || !onUpdateOrder) return;

    const updatedOrder: Order = {
      ...editingOrder,
      billType: editBillType,
      items: editItems,
      subtotal: editSubtotal,
      discount: editDiscount,
      taxAmount: editTaxAmount,
      freightCharges: editFreight,
      totalAmount: editTotalAmount,
      paidAmount: editPaidAmount,
      dueAmount: editDueAmount,
      paymentMode: editPaymentMode,
      status: editStatus,
      notes: editNotes.trim(),
      vehicleNumber: editVehicleNumber.trim() || editingOrder.vehicleNumber,
    };

    onUpdateOrder(updatedOrder, editingOrder);
    setEditingOrder(null);
  };

  const handleConfirmDeleteOrder = () => {
    if (!deleteConfirmOrder || !onDeleteOrder) return;
    onDeleteOrder(deleteConfirmOrder.id);
    setDeleteConfirmOrder(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-amber-600" />
            <span>ऑर्डर एवं बिलिंग प्रबंधन (Orders & Invoicing)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            GST टैक्स इनवॉइस (HSN 1101), चालान बिलिंग, ऑर्डर संशोधन (Edit), ट्रैकिंग एवं डिलीवरी स्थिति
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

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="इनवॉइस नंबर, ग्राहक या फर्म खोजें..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Status filter pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {(['all', 'pending', 'in_production', 'ready_dispatch', 'dispatched', 'delivered'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === 'all' ? 'सभी स्टेटस' : st === 'pending' ? 'पेंडिंग' : st === 'in_production' ? 'प्रोडक्शन' : st === 'ready_dispatch' ? 'तैयार' : st === 'dispatched' ? 'रवाना' : 'डिलीवर्ड'}
              </button>
            ))}
          </div>

          {/* Bill type filter */}
          <select
            value={billTypeFilter}
            onChange={(e) => setBillTypeFilter(e.target.value)}
            className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium"
          >
            <option value="all">सभी बिल (GST + Non-GST)</option>
            <option value="gst">केवल GST इनवॉइस</option>
            <option value="non_gst">केवल चालान</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
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
                <th className="py-3 px-4 text-center">कार्रवाई व स्टेटस</th>
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
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        {/* View Invoice */}
                        <button
                          onClick={() => onSelectOrder(order)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition flex items-center gap-1"
                          title="इनवॉइस देखें / प्रिंट करें"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>बिल</span>
                        </button>

                        {/* Edit Order Button */}
                        <button
                          onClick={() => startEditOrder(order)}
                          className="p-1.5 bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 rounded-lg text-xs font-bold transition"
                          title="ऑर्डर में मात्रा, दर या राशि बदलें (Edit Order)"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                        </button>

                        {/* Delete Order Button */}
                        <button
                          onClick={() => setDeleteConfirmOrder(order)}
                          className="p-1.5 bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-700 rounded-lg text-xs font-bold transition"
                          title="ऑर्डर हटाएँ (Delete Order)"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        </button>

                        {/* Next status advance */}
                        {nextAction && (
                          <button
                            onClick={() => onUpdateOrderStatus(order.id, nextAction.next)}
                            className={`px-2 py-1 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs ${nextAction.color}`}
                          >
                            <span>{nextAction.label}</span>
                            <ArrowRight className="w-3 h-3" />
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

      {/* Edit Order Modal */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl border border-slate-200 text-xs text-slate-800 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-amber-600" />
                  <span>ऑर्डर एवं बिलिंग संशोधित करें (Edit Order #{editingOrder.invoiceNumber})</span>
                </h3>
                <span className="text-[11px] text-slate-500">
                  ग्राहक: <strong>{editingOrder.customerFirm}</strong> (श्री {editingOrder.customerName})
                </span>
              </div>
              <button onClick={() => setEditingOrder(null)} className="p-1 text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditOrder} className="overflow-y-auto p-1 space-y-4 my-3">
              {/* Order Meta Header */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">बिल प्रकार (Bill Type) *</label>
                  <select
                    value={editBillType}
                    onChange={(e) => setEditBillType(e.target.value as BillType)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold"
                  >
                    <option value="gst">GST टैक्स इनवॉइस (5% GST)</option>
                    <option value="non_gst">डिलीवरी चालान (Non-GST)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">ऑर्डर स्थिति (Status) *</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as OrderStatus)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold"
                  >
                    <option value="pending">पेंडिंग (Pending)</option>
                    <option value="in_production">प्रोडक्शन में (In Production)</option>
                    <option value="ready_dispatch">डिस्पैच तैयार (Ready)</option>
                    <option value="dispatched">गाड़ी में रवाना (Dispatched)</option>
                    <option value="delivered">डिलीवर हुआ (Delivered)</option>
                    <option value="cancelled">रद्द (Cancelled)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">गाड़ी नंबर (Vehicle)</label>
                  <input
                    type="text"
                    value={editVehicleNumber}
                    onChange={(e) => setEditVehicleNumber(e.target.value.toUpperCase())}
                    placeholder="RJ-14-GA-4521"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono uppercase font-bold"
                  />
                </div>
              </div>

              {/* Order Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-100 px-3 py-2 font-bold text-slate-800 flex justify-between items-center">
                  <span>ऑर्डर सामान लाइनें (Product Items & Bags Count)</span>
                  <span className="text-[11px] text-slate-500">मात्रा (बैग) व सेलिंग रेट बदलें</span>
                </div>

                <div className="divide-y divide-slate-100 p-2 space-y-2">
                  {editItems.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <div className="col-span-12 sm:col-span-5">
                        <strong className="block text-slate-900 text-xs">{item.productName}</strong>
                        <span className="text-[10px] text-slate-500">{item.bagSize} KG बैग</span>
                      </div>

                      <div className="col-span-6 sm:col-span-3">
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">बैग्स (Bags) *</label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value) || 0)}
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg font-mono font-bold text-center"
                        />
                      </div>

                      <div className="col-span-6 sm:col-span-4 flex items-center justify-between gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">रेट / बैग (₹) *</label>
                          <input
                            type="number"
                            min="1"
                            required
                            value={item.ratePerBag}
                            onChange={(e) => handleItemChange(idx, 'ratePerBag', Number(e.target.value) || 0)}
                            className="w-24 px-2 py-1 bg-white border border-slate-300 rounded-lg font-mono font-bold text-right"
                          />
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 block">कुल (₹)</span>
                          <span className="font-mono font-bold text-slate-900 block">
                            ₹{(item.quantity * item.ratePerBag).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Calculation summary */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">छूट (Discount ₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={editDiscount}
                      onChange={(e) => setEditDiscount(Number(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">भाड़ा (Freight ₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={editFreight}
                      onChange={(e) => setEditFreight(Number(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-emerald-800 mb-1">जमा राशि (Paid ₹) *</label>
                    <input
                      type="number"
                      min="0"
                      max={editTotalAmount}
                      value={editPaidAmount}
                      onChange={(e) => setEditPaidAmount(Number(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-emerald-50 border border-emerald-300 rounded-lg font-mono font-bold text-emerald-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">भुगतान माध्यम</label>
                    <select
                      value={editPaymentMode}
                      onChange={(e) => setEditPaymentMode(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                    >
                      <option value="cash">नकद (Cash)</option>
                      <option value="bank">बैंक ट्रांसफर (Bank/NEFT)</option>
                      <option value="upi">UPI (PhonePe/GPay)</option>
                      <option value="credit">पूर्ण उधारी (Credit)</option>
                      <option value="partial">आंशिक भुगतान</option>
                    </select>
                  </div>
                </div>

                {/* Totals Summary Line */}
                <div className="pt-2 border-t border-slate-200 flex flex-wrap justify-between items-center text-xs">
                  <div>
                    <span className="text-slate-600">सामान सबटोटल: <strong>₹{editSubtotal.toLocaleString('en-IN')}</strong></span>
                    {editTaxAmount > 0 && (
                      <span className="text-amber-800 ml-3">5% GST: <strong>₹{editTaxAmount.toLocaleString('en-IN')}</strong></span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-slate-900">
                      कुल बिल: <strong className="font-mono text-base text-slate-950">₹{editTotalAmount.toLocaleString('en-IN')}</strong>
                    </span>
                    <span className="text-sm font-bold text-rose-600">
                      शेष बकाया: <strong className="font-mono text-base text-rose-700">₹{editDueAmount.toLocaleString('en-IN')}</strong>
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">रिमार्क / डिलीवरी निर्देश</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="उदा. शाम 5 बजे तक दुकान पर अनलोड करवाएं"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="px-4 py-2 border rounded-xl font-semibold hover:bg-slate-50"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>संशोधित ऑर्डर सुरक्षित करें</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Order Confirmation Modal */}
      {deleteConfirmOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 text-xs text-slate-800">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-center text-slate-900">
              ऑर्डर डिलीट करना चाहते हैं?
            </h3>
            
            <p className="text-xs text-slate-600 text-center mt-2 leading-relaxed">
              क्या आप सचमुच इनवॉइस <strong>#{deleteConfirmOrder.invoiceNumber}</strong> ({deleteConfirmOrder.customerFirm}) को हटाना चाहते हैं?
            </p>

            <div className="pt-4 mt-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmOrder(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl font-semibold hover:bg-slate-50"
              >
                रद्द करें
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteOrder}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs"
              >
                हाँ, ऑर्डर हटाएँ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
