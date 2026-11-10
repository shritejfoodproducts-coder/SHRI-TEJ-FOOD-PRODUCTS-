export type Language = 'hi' | 'en';

export type UserRole = 
  | 'admin'             // मालिक - Shri Tej (Full Access)
  | 'manager'           // मैनेजर (Staff management, stock, production, orders)
  | 'accountant'        // अकाउंटेंट (Billing, payments, expenses, ledger)
  | 'store_keeper'      // स्टोर कीपर (Raw wheat, empty bags, inventory)
  | 'production_head'   // प्रोडक्शन इंचार्ज (Milling, batch log)
  | 'packing_staff'     // पैकिंग स्टाफ (Bagging, stitch count)
  | 'delivery_staff';   // डिलीवरी स्टाफ (Dispatch, customer delivery, cash collection)

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  roleHindi: string;
  password?: string;
  active: boolean;
  shift?: string;
  assignedVehicle?: string;
  joinedDate: string;
}

export type BagSize = 5 | 10 | 25 | 50; // In KG

export interface ProductMaster {
  id: string;
  nameHindi: string;
  nameEn: string;
  brand: string;
  hsnCode: string;
  description: string;
  rates: Record<BagSize, number>; // Default selling rate per bag
  costRates: Record<BagSize, number>; // Production cost per bag
}

export interface BagStockItem {
  productId: string;
  bagSize: BagSize;
  packedCount: number; // Number of ready bags
  reservedCount: number; // In pending orders
  minThreshold: number; // Alert threshold
}

export interface RawMaterialStock {
  wheatQuintals: number; // गेहूँ का स्टॉक क्विंटल में (1 quintal = 100 kg)
  avgPurchaseRateQuintal: number; // खरीद दर प्रति क्विंटल (₹)
  emptyBags: Record<BagSize, number>; // खाली प्रिंटेड बैग स्टॉक
  stitchingThreadKg: number; // सिलाई धागा (KG)
  lastUpdated: string;
}

export type OrderStatus = 
  | 'pending'            // नया आर्डर / पेंडिंग
  | 'in_production'      // प्रोडक्शन में
  | 'ready_dispatch'     // तैयार माल / डिस्पैच हेतु तैयार
  | 'dispatched'         // रवाना (गाड़ी में)
  | 'delivered'          // ग्राहक को डिलीवर
  | 'cancelled';

export type BillType = 'gst' | 'non_gst';

export interface OrderItem {
  productId: string;
  productName: string;
  bagSize: BagSize;
  quantity: number; // Bag count
  ratePerBag: number;
  totalAmount: number;
}

export interface Order {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerFirm: string;
  customerPhone: string;
  customerAddress: string;
  date: string;
  billType: BillType;
  items: OrderItem[];
  subtotal: number;
  taxAmount: number; // 5% GST if applicable (2.5% CGST + 2.5% SGST)
  discount: number;
  freightCharges: number; // ट्रांसपोर्ट भाड़ा
  totalAmount: number;
  paidAmount: number;
  paymentMode: 'cash' | 'bank' | 'upi' | 'credit' | 'partial';
  dueAmount: number;
  status: OrderStatus;
  deliveryStaffId?: string;
  deliveryStaffName?: string;
  vehicleNumber?: string;
  deliveredAt?: string;
  notes?: string;
}

export interface Customer {
  id: string;
  name: string;
  firmName: string;
  phone: string;
  address: string;
  city: string;
  gstin?: string;
  type: 'retailer' | 'wholesaler' | 'caterer' | 'direct';
  totalOrders: number;
  totalPurchased: number;
  totalPaid: number;
  currentDue: number;
  creditLimit: number;
  lastOrderDate?: string;
}

export interface CustomerPaymentRecord {
  id: string;
  customerId: string;
  customerName: string;
  orderId?: string;
  date: string;
  amount: number;
  paymentMode: 'cash' | 'bank' | 'upi';
  referenceNo?: string;
  receivedBy: string;
  notes?: string;
}

export interface ProductionBatch {
  id: string;
  batchNumber: string;
  date: string;
  time: string;
  productId: string;
  productName: string;
  shift: 'सुबह (Morning)' | 'शाम (Evening)' | 'नाइट (Night)';
  operatorName: string;
  wheatInputKg: number; // पिसाई के लिए डाला गया गेहूं
  attaOutputKg: number; // तैयार आटा
  chokerOutputKg: number; // चोकर
  lossKg: number; // पिसाई छीजन (छानन/धूल)
  lossPercentage: number;
  packedBags: Record<BagSize, number>; // Bags packed in this batch
  electricityUnits?: number;
  status: 'completed' | 'in_progress';
  notes?: string;
}

export type ExpenseCategory = 
  | 'wheat_purchase'   // गेहूँ मंडी खरीद
  | 'electricity'      // बिजली बिल
  | 'diesel_fuel'      // गाड़ी डीजल व जनरेटर
  | 'labor_salary'     // मजदूरी व स्टाफ सैलरी
  | 'bag_purchase'     // खाली बैग खरीद
  | 'maintenance'      // मिल रिपेयर व पार्ट्स
  | 'transport'        // आवक भाड़ा
  | 'office_tea'       // चाय-नाश्ता व विविध;

export interface ExpenseRecord {
  id: string;
  date: string;
  category: ExpenseCategory;
  categoryHindi: string;
  title: string;
  amount: number;
  paymentMode: 'cash' | 'bank' | 'upi';
  paidTo: string;
  voucherNo: string;
  recordedBy: string;
  notes?: string;
}

export interface CompanySettings {
  companyName: string;
  brandName: string;
  proprietor: string;
  address: string;
  phone: string;
  email: string;
  gstin: string;
  fssaiNumber: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
  defaultGstRate: number; // 5% for Atta
  autoBackupDays: number;
  customQrCodeUrl?: string; // Custom uploaded QR code image data URL
  qrCodeBase64?: string; // Base64 string of the selected QR code image
  qrCodeType?: 'dynamic_upi' | 'custom_image'; // Preferred QR mode
}
