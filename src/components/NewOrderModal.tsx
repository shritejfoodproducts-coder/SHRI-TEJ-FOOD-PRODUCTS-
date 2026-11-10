import React, { useState } from 'react';
import { Customer, ProductMaster, Order, OrderItem, BagSize, BillType, UserProfile } from '../types/erp';
import { X, Plus, Trash2, ShoppingCart, Calculator } from 'lucide-react';

interface NewOrderModalProps {
  customers: Customer[];
  products: ProductMaster[];
  staff: UserProfile[];
  onClose: () => void;
  onSubmit: (order: Order) => void;
}

export const NewOrderModal: React.FC<NewOrderModalProps> = ({
  customers,
  products,
  staff,
  onClose,
  onSubmit,
}) => {
  const [customerId, setCustomerId] = useState<string>(customers[0]?.id || '');
  const [billType, setBillType] = useState<BillType>('gst');
  const [deliveryStaffId, setDeliveryStaffId] = useState<string>('staff-7');
  const [vehicleNumber, setVehicleNumber] = useState<string>('RJ-14-GA-4521');
  const [discount, setDiscount] = useState<number>(0);
  const [freightCharges, setFreightCharges] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'bank' | 'upi' | 'credit'>('upi');
  const [notes, setNotes] = useState<string>('');

  const [items, setItems] = useState<OrderItem[]>([
    {
      productId: products[1]?.id || products[0]?.id,
      productName: products[1]?.nameHindi || products[0]?.nameHindi,
      bagSize: 10,
      quantity: 20,
      ratePerBag: products[1]?.rates[10] || 380,
      totalAmount: (products[1]?.rates[10] || 380) * 20,
    },
  ]);

  const selectedCustomer = customers.find(c => c.id === customerId);

  // Line item modifiers
  const handleAddItem = () => {
    const defaultProd = products[0];
    const defaultSize: BagSize = 10;
    const rate = defaultProd.rates[defaultSize];
    setItems([
      ...items,
      {
        productId: defaultProd.id,
        productName: defaultProd.nameHindi,
        bagSize: defaultSize,
        quantity: 10,
        ratePerBag: rate,
        totalAmount: rate * 10,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: keyof OrderItem, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index] };

    if (field === 'productId') {
      const prod = products.find(p => p.id === value);
      if (prod) {
        item.productId = prod.id;
        item.productName = prod.nameHindi;
        item.ratePerBag = prod.rates[item.bagSize];
        item.totalAmount = item.ratePerBag * item.quantity;
      }
    } else if (field === 'bagSize') {
      const newSize = Number(value) as BagSize;
      const prod = products.find(p => p.id === item.productId);
      item.bagSize = newSize;
      if (prod) {
        item.ratePerBag = prod.rates[newSize];
        item.totalAmount = item.ratePerBag * item.quantity;
      }
    } else if (field === 'quantity') {
      item.quantity = Math.max(1, Number(value) || 1);
      item.totalAmount = item.ratePerBag * item.quantity;
    } else if (field === 'ratePerBag') {
      item.ratePerBag = Number(value) || 0;
      item.totalAmount = item.ratePerBag * item.quantity;
    }

    newItems[index] = item;
    setItems(newItems);
  };

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + item.totalAmount, 0);
  const taxAmount = billType === 'gst' ? Math.round(subtotal * 0.05 * 100) / 100 : 0;
  const totalAmount = Math.max(0, subtotal + taxAmount + Number(freightCharges) - Number(discount));
  const dueAmount = Math.max(0, totalAmount - Number(paidAmount));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    const deliveryStaffMember = staff.find(s => s.id === deliveryStaffId);
    const invoicePrefix = billType === 'gst' ? 'TEJ/26-27/' : 'TEJ/CH-';
    const randomSeq = Math.floor(1000 + Math.random() * 9000);

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      invoiceNumber: `${invoicePrefix}${randomSeq}`,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      customerFirm: selectedCustomer.firmName,
      customerPhone: selectedCustomer.phone,
      customerAddress: `${selectedCustomer.address}, ${selectedCustomer.city}`,
      date: new Date().toISOString().slice(0, 10),
      billType,
      items,
      subtotal,
      taxAmount,
      discount: Number(discount),
      freightCharges: Number(freightCharges),
      totalAmount,
      paidAmount: Number(paidAmount),
      paymentMode,
      dueAmount,
      status: 'pending',
      deliveryStaffId,
      deliveryStaffName: deliveryStaffMember?.name || 'सोनू सैनी',
      vehicleNumber: vehicleNumber || 'RJ-14-GA-4521',
      notes,
    };

    onSubmit(newOrder);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <ShoppingCart className="w-5 h-5 text-amber-100" />
            </div>
            <div>
              <h2 className="text-lg font-bold">नया ऑर्डर / बिल तैयार करें</h2>
              <p className="text-xs text-amber-100 font-medium">Shri Tej Food Products • Tejstha आटा</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto text-sm text-slate-800">
          {/* Row 1: Customer & Bill Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                ग्राहक चुनें (Select Customer) *
              </label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-medium"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firmName} - {c.name} ({c.city}) {c.currentDue > 0 ? `[बकाया: ₹${c.currentDue}]` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                बिल प्रकार (Bill Type) *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setBillType('gst')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    billType === 'gst'
                      ? 'bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-500/20'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>GST पक्का बिल (5%)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBillType('non_gst')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    billType === 'non_gst'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>कच्चा बिल / चालान</span>
                </button>
              </div>
            </div>
          </div>

          {/* Product Items Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100 px-4 py-2.5 flex items-center justify-between border-b border-slate-200">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                ऑर्डर आइटम्स (Products & Packing)
              </span>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>आइटम जोड़ें</span>
              </button>
            </div>

            <div className="p-3 space-y-3">
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <div className="col-span-12 sm:col-span-4">
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">प्रोडक्ट</label>
                    <select
                      value={item.productId}
                      onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nameHindi}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-4 sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">पैकिंग साइज</label>
                    <select
                      value={item.bagSize}
                      onChange={(e) => handleItemChange(index, 'bagSize', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-bold"
                    >
                      <option value={5}>5 KG</option>
                      <option value={10}>10 KG</option>
                      <option value={25}>25 KG</option>
                      <option value={50}>50 KG</option>
                    </select>
                  </div>

                  <div className="col-span-4 sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">बैग (संख्या)</label>
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-bold text-center"
                    />
                  </div>

                  <div className="col-span-4 sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">दर (₹/बैग)</label>
                    <input
                      type="number"
                      value={item.ratePerBag}
                      onChange={(e) => handleItemChange(index, 'ratePerBag', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-right font-mono"
                    />
                  </div>

                  <div className="col-span-10 sm:col-span-1 text-right">
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">कुल ₹</label>
                    <span className="text-xs font-bold font-mono text-slate-900 block pt-1.5">
                      ₹{item.totalAmount}
                    </span>
                  </div>

                  <div className="col-span-2 sm:col-span-1 text-center pt-3">
                    <button
                      type="button"
                      disabled={items.length <= 1}
                      onClick={() => handleRemoveItem(index)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30 rounded-md transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Row 3: Totals, Discounts, Freight */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                व्यापारिक छूट / Discount (₹)
              </label>
              <input
                type="number"
                min={0}
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                ट्रांसपोर्ट भाड़ा / Freight (₹)
              </label>
              <input
                type="number"
                min={0}
                value={freightCharges}
                onChange={(e) => setFreightCharges(Number(e.target.value) || 0)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono"
                placeholder="0"
              />
            </div>

            <div className="bg-amber-100/60 p-3 rounded-xl border border-amber-300">
              <span className="block text-[11px] font-bold text-amber-900 uppercase">कुल बिल राशि (Final)</span>
              <span className="font-mono font-bold text-xl text-amber-950">₹{totalAmount.toLocaleString('en-IN')}</span>
              {billType === 'gst' && (
                <span className="block text-[10px] text-amber-800">
                  (सबटोटल: ₹{subtotal} + 5% GST: ₹{taxAmount})
                </span>
              )}
            </div>
          </div>

          {/* Row 4: Advance Payment */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-200 pt-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                जमा राशि / Advance Paid (₹)
              </label>
              <input
                type="number"
                min={0}
                max={totalAmount}
                value={paidAmount}
                onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-emerald-700"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                शेष बकाया: <strong className="text-rose-600 font-mono">₹{dueAmount.toLocaleString('en-IN')}</strong>
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                भुगतान माध्यम (Payment Mode)
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
              >
                <option value="upi">ऑनलाइन UPI (GPay/PhonePe)</option>
                <option value="cash">नकद (Cash)</option>
                <option value="bank">बैंक खाता (NEFT/RTGS/Cheque)</option>
                <option value="credit">उधार (Full Credit)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                डिलीवरी ड्राइवर व गाड़ी
              </label>
              <select
                value={deliveryStaffId}
                onChange={(e) => setDeliveryStaffId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
              >
                {staff
                  .filter((s) => s.role === 'delivery_staff' || s.role === 'manager' || s.role === 'admin')
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.assignedVehicle || 'फैक्ट्री पिकअप'})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              ऑर्डर नोट / विशेष निर्देश (वैकल्पिक)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="उदा. दोपहर 3 बजे तक डिलीवरी, दुकान पर अनलोडिंग"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold transition"
            >
              रद्द करें
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/20 transition flex items-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>ऑर्डर कन्फर्म करें व सेव करें</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
