import * as XLSX from 'xlsx';
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

// Helper to save workbook file
function saveWorkbook(workbook: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(workbook, filename);
}

// 1. Daily Sales Report
export function exportSalesReport(orders: Order[], settings: CompanySettings) {
  const data = orders.map((ord, idx) => ({
    'क्र.सं. (S.No.)': idx + 1,
    'बिल/इनवॉइस नं.': ord.invoiceNumber,
    'तारीख (Date)': ord.date,
    'बिल प्रकार': ord.billType === 'gst' ? 'GST टैक्स बिल' : 'चालान / Non-GST',
    'ग्राहक का नाम': ord.customerName,
    'फर्म का नाम': ord.customerFirm,
    'मोबाइल नंबर': ord.customerPhone,
    'सामान विवरण': ord.items.map(i => `${i.productName} (${i.bagSize}kg x ${i.quantity})`).join(', '),
    'कुल बैग': ord.items.reduce((s, i) => s + i.quantity, 0),
    'सबटोटल (₹)': ord.subtotal,
    'GST टैक्स (₹)': ord.taxAmount,
    'छूट (₹)': ord.discount,
    'भाड़ा (₹)': ord.freightCharges,
    'कुल राशि (Net ₹)': ord.totalAmount,
    'प्राप्त राशि (Paid ₹)': ord.paidAmount,
    'बकाया (Due ₹)': ord.dueAmount,
    'भुगतान माध्यम': ord.paymentMode.toUpperCase(),
    'स्थिति (Status)': ord.status.toUpperCase(),
    'डिलीवरी स्टाफ': ord.deliveryStaffName || 'N/A',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'बिक्री रिपोर्ट (Sales)');
  saveWorkbook(workbook, `TEJ_FOOD_Daily_Sales_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// 2. Stock & Inventory Report
export function exportStockReport(
  rawStock: RawMaterialStock, 
  bagStock: BagStockItem[], 
  products: ProductMaster[]
) {
  const productMap = new Map(products.map(p => [p.id, p]));

  // Ready Atta stock
  const finishedGoods = bagStock.map((item, idx) => {
    const prod = productMap.get(item.productId);
    const totalWeightKg = item.packedCount * item.bagSize;
    const approxValue = item.packedCount * (prod?.rates[item.bagSize] || 0);

    return {
      'क्र.सं.': idx + 1,
      'प्रोडक्ट का नाम': prod?.nameHindi || 'N/A',
      'अंग्रेजी नाम': prod?.nameEn || 'N/A',
      'ब्रांड': prod?.brand || 'Tejstha',
      'HSN कोड': prod?.hsnCode || '1101',
      'बैग साइज (KG)': `${item.bagSize} KG`,
      'तैयार बैग (Packed Bags)': item.packedCount,
      'रिजर्व बैग (Orders)': item.reservedCount,
      'उपलब्ध बैग (Available)': Math.max(0, item.packedCount - item.reservedCount),
      'कुल वजन (KG)': totalWeightKg,
      'रेट प्रति बैग (₹)': prod?.rates[item.bagSize] || 0,
      'अनुमानित स्टॉक मूल्य (₹)': approxValue,
      'न्यूनतम सीमा': item.minThreshold,
      'अलर्ट': item.packedCount <= item.minThreshold ? '⚠️ कम स्टॉक' : 'पर्याप्त',
    };
  });

  // Raw Material Summary
  const rawMaterial = [
    {
      'सामग्री': 'कच्चा गेहूँ (Raw Wheat)',
      'स्टॉक मात्रा': `${rawStock.wheatQuintals.toFixed(2)} क्विंटल (${(rawStock.wheatQuintals * 100).toLocaleString('en-IN')} KG)`,
      'औसत दर (प्रति क्विंटल)': `₹${rawStock.avgPurchaseRateQuintal}`,
      'कुल अनुमानित मूल्य (₹)': Math.round(rawStock.wheatQuintals * rawStock.avgPurchaseRateQuintal),
    },
    {
      'सामग्री': 'सिलाई धागा (Stitching Thread)',
      'स्टॉक मात्रा': `${rawStock.stitchingThreadKg} KG`,
      'औसत दर (प्रति क्विंटल)': 'N/A',
      'कुल अनुमानित मूल्य (₹)': rawStock.stitchingThreadKg * 220,
    },
    {
      'सामग्री': 'खाली 5 KG प्रिंटेड बैग्स',
      'स्टॉक मात्रा': `${rawStock.emptyBags[5]} नग`,
      'औसत दर (प्रति क्विंटल)': '₹6.5/बैग',
      'कुल अनुमानित मूल्य (₹)': rawStock.emptyBags[5] * 6.5,
    },
    {
      'सामग्री': 'खाली 10 KG प्रिंटेड बैग्स',
      'स्टॉक मात्रा': `${rawStock.emptyBags[10]} नग`,
      'औसत दर (प्रति क्विंटल)': '₹9.0/बैग',
      'कुल अनुमानित मूल्य (₹)': rawStock.emptyBags[10] * 9.0,
    },
    {
      'सामग्री': 'खाली 25 KG प्रिंटेड बैग्स',
      'स्टॉक मात्रा': `${rawStock.emptyBags[25]} नग`,
      'औसत दर (प्रति क्विंटल)': '₹16.0/बैग',
      'कुल अनुमानित मूल्य (₹)': rawStock.emptyBags[25] * 16.0,
    },
    {
      'सामग्री': 'खाली 50 KG प्रिंटेड बैग्स (होलसेल बोरी)',
      'स्टॉक मात्रा': `${rawStock.emptyBags[50]} नग`,
      'औसत दर (प्रति क्विंटल)': '₹24.0/बैग',
      'कुल अनुमानित मूल्य (₹)': rawStock.emptyBags[50] * 24.0,
    },
  ];

  const workbook = XLSX.utils.book_new();
  const wsFinished = XLSX.utils.json_to_sheet(finishedGoods);
  const wsRaw = XLSX.utils.json_to_sheet(rawMaterial);

  XLSX.utils.book_append_sheet(workbook, wsFinished, 'तैयार आटा स्टॉक');
  XLSX.utils.book_append_sheet(workbook, wsRaw, 'कच्चा गेहूं व बैग्स');

  saveWorkbook(workbook, `TEJ_FOOD_Stock_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// 3. Daily Production Report
export function exportProductionReport(batches: ProductionBatch[]) {
  const data = batches.map((b, idx) => ({
    'क्र.सं.': idx + 1,
    'बैच नंबर': b.batchNumber,
    'तारीख (Date)': b.date,
    'समय': b.time,
    'शिफ्ट': b.shift,
    'ऑपरेटर/स्टाफ': b.operatorName,
    'प्रोडक्ट': b.productName,
    'गेहूँ इनपुट (KG)': b.wheatInputKg,
    'तैयार आटा (KG)': b.attaOutputKg,
    'चोकर (KG)': b.chokerOutputKg,
    'छीजन/धूल (KG)': b.lossKg,
    'छीजन (% Loss)': `${b.lossPercentage.toFixed(2)}%`,
    'तैयार 5KG बैग': b.packedBags[5] || 0,
    'तैयार 10KG बैग': b.packedBags[10] || 0,
    'तैयार 25KG बैग': b.packedBags[25] || 0,
    'तैयार 50KG बैग': b.packedBags[50] || 0,
    'बिजली यूनिट खर्च': b.electricityUnits || 0,
    'टिप्पणी': b.notes || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'प्रोडक्शन रिपोर्ट (Production)');
  saveWorkbook(workbook, `TEJ_FOOD_Production_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// 4. Daily Expenses Report
export function exportExpensesReport(expenses: ExpenseRecord[]) {
  const data = expenses.map((e, idx) => ({
    'क्र.सं.': idx + 1,
    'वाउचर नं.': e.voucherNo,
    'तारीख': e.date,
    'खर्च श्रेणी (Category)': e.categoryHindi,
    'विवरण (Description)': e.title,
    'राशि (₹)': e.amount,
    'माध्यम': e.paymentMode.toUpperCase(),
    'भुगतान प्राप्तकर्ता': e.paidTo,
    'एंट्री कर्ता': e.recordedBy,
    'टिप्पणी': e.notes || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'खर्च रिपोर्ट (Expenses)');
  saveWorkbook(workbook, `TEJ_FOOD_Expenses_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// 5. Customer Ledger & Dues Report
export function exportCustomerDuesReport(customers: Customer[]) {
  const data = customers.map((c, idx) => ({
    'क्र.सं.': idx + 1,
    'ग्राहक का नाम': c.name,
    'दुकान/फर्म का नाम': c.firmName,
    'मोबाइल नंबर': c.phone,
    'शहर / पता': `${c.address}, ${c.city}`,
    'GSTIN': c.gstin || 'बिना GST',
    'ग्राहक प्रकार': c.type.toUpperCase(),
    'कुल ऑर्डर्स': c.totalOrders,
    'कुल खरीदारी (₹)': c.totalPurchased,
    'जमा किया गया भुगतान (₹)': c.totalPaid,
    'वर्तमान बकाया (Due ₹)': c.currentDue,
    'उधार सीमा (Limit ₹)': c.creditLimit,
    'स्थिति': c.currentDue > c.creditLimit ? '⚠️ सीमा से अधिक' : (c.currentDue > 0 ? 'बकायादार' : 'खाता क्लियर'),
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'ग्राहक बकाया (Customer Dues)');
  saveWorkbook(workbook, `TEJ_FOOD_Customer_Dues_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// 6. Delivery Tracking Report
export function exportDeliveryReport(orders: Order[]) {
  const data = orders.map((o, idx) => ({
    'क्र.सं.': idx + 1,
    'इनवॉइस / चालान': o.invoiceNumber,
    'तारीख': o.date,
    'ग्राहक / फर्म': `${o.customerName} (${o.customerFirm})`,
    'पता': o.customerAddress,
    'मोबाइल': o.customerPhone,
    'गाड़ी नं.': o.vehicleNumber || 'N/A',
    'डिलीवरी स्टाफ (ड्राइवर)': o.deliveryStaffName || 'N/A',
    'कुल माल (बैग)': o.items.reduce((s, i) => s + i.quantity, 0),
    'बिल राशि (₹)': o.totalAmount,
    'वसूल करना बाकी (Due ₹)': o.dueAmount,
    'डिलीवरी स्थिति': o.status.toUpperCase(),
    'डिलीवर होने का समय': o.deliveredAt || 'पेंडिंग',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'डिलीवरी रिपोर्ट (Delivery)');
  saveWorkbook(workbook, `TEJ_FOOD_Delivery_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// 7. Staff Work Report
export function exportStaffReport(staffList: UserProfile[]) {
  const data = staffList.map((s, idx) => ({
    'क्र.सं.': idx + 1,
    'कर्मचारी का नाम': s.name,
    'मोबाइल नंबर': s.phone,
    'पद (Role)': s.roleHindi,
    'सिस्टम रोल': s.role,
    'लॉगिन पासवर्ड': s.password || '******',
    'ड्यूटी शिफ्ट': s.shift || 'जनरल',
    'आवंटित वाहन': s.assignedVehicle || 'N/A',
    'ज्वाइनिंग तारीख': s.joinedDate,
    'स्थिति': s.active ? 'सक्रिय (Active)' : 'निष्क्रिय',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'स्टाफ लिस्ट व कार्य (Staff)');
  saveWorkbook(workbook, `TEJ_FOOD_Staff_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// 8. MASTER COMPLETE EXCEL BUSINESS BOOK (7 Sheets in One Workbook)
export function exportMasterCompleteBusinessBook(params: {
  orders: Order[];
  customers: Customer[];
  rawStock: RawMaterialStock;
  bagStock: BagStockItem[];
  products: ProductMaster[];
  production: ProductionBatch[];
  expenses: ExpenseRecord[];
  staff: UserProfile[];
  settings: CompanySettings;
}) {
  const { orders, customers, rawStock, bagStock, products, production, expenses, staff, settings } = params;
  const workbook = XLSX.utils.book_new();

  // Summary Sheet
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayOrders = orders.filter(o => o.date === todayStr);
  const todaySales = todayOrders.reduce((s, o) => s + o.totalAmount, 0);
  const totalDues = customers.reduce((s, c) => s + c.currentDue, 0);
  const todayExpenses = expenses.filter(e => e.date === todayStr).reduce((s, e) => s + e.amount, 0);

  const summaryData = [
    { 'विवरण': 'कंपनी का नाम', 'मान': settings.companyName },
    { 'विवरण': 'ब्रांड', 'मान': settings.brandName },
    { 'विवरण': 'रिपोर्ट तारीख', 'मान': todayStr },
    { 'विवरण': 'आज की कुल बिक्री (₹)', 'मान': todaySales },
    { 'विवरण': 'आज के कुल खर्चे (₹)', 'मान': todayExpenses },
    { 'विवरण': 'मार्केट में कुल बकाया (Receivables ₹)', 'मान': totalDues },
    { 'विवरण': 'कच्चा गेहूं स्टॉक (क्विंटल)', 'मान': rawStock.wheatQuintals },
    { 'विवरण': 'कुल पंजीकृत ग्राहक', 'मान': customers.length },
    { 'विवरण': 'कुल स्टाफ सदस्य', 'मान': staff.length },
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryData), 'बिज़नेस समरी (Summary)');

  // Sheet: Sales
  const salesData = orders.map((ord, idx) => ({
    'क्र.सं.': idx + 1,
    'इनवॉइस नं.': ord.invoiceNumber,
    'तारीख': ord.date,
    'बिल प्रकार': ord.billType,
    'ग्राहक': ord.customerName,
    'फर्म': ord.customerFirm,
    'फोन': ord.customerPhone,
    'कुल राशि (₹)': ord.totalAmount,
    'प्राप्त (₹)': ord.paidAmount,
    'बकाया (₹)': ord.dueAmount,
    'भुगतान मोड': ord.paymentMode,
    'स्थिति': ord.status,
  }));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(salesData), 'सभी बिक्री (Sales)');

  // Sheet: Stock
  const stockData = bagStock.map((b, idx) => {
    const prod = products.find(p => p.id === b.productId);
    return {
      'क्र.सं.': idx + 1,
      'प्रोडक्ट': prod?.nameHindi || '',
      'पैकिंग (KG)': b.bagSize,
      'तैयार बैग': b.packedCount,
      'ऑर्डर में बुक': b.reservedCount,
      'उपलब्ध स्टॉक': Math.max(0, b.packedCount - b.reservedCount),
      'दर (₹)': prod?.rates[b.bagSize] || 0,
      'स्टॉक मूल्य (₹)': b.packedCount * (prod?.rates[b.bagSize] || 0),
    };
  });
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(stockData), 'तैयार आटा स्टॉक (Stock)');

  // Sheet: Customers
  const custData = customers.map((c, idx) => ({
    'क्र.सं.': idx + 1,
    'नाम': c.name,
    'फर्म': c.firmName,
    'फोन': c.phone,
    'शहर': c.city,
    'GSTIN': c.gstin || 'N/A',
    'कुल खरीद (₹)': c.totalPurchased,
    'कुल जमा (₹)': c.totalPaid,
    'वर्तमान बकाया (₹)': c.currentDue,
  }));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(custData), 'ग्राहक खाता (Customers)');

  // Sheet: Production
  const prodData = production.map((p, idx) => ({
    'क्र.सं.': idx + 1,
    'बैच नं': p.batchNumber,
    'तारीख': p.date,
    'शिफ्ट': p.shift,
    'प्रोडक्ट': p.productName,
    'गेहूं इनपुट (KG)': p.wheatInputKg,
    'आटा तैयार (KG)': p.attaOutputKg,
    'चोकर (KG)': p.chokerOutputKg,
    'छीजन (KG)': p.lossKg,
    '5KG बैग': p.packedBags[5] || 0,
    '10KG बैग': p.packedBags[10] || 0,
    '25KG बैग': p.packedBags[25] || 0,
    '50KG बैग': p.packedBags[50] || 0,
  }));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(prodData), 'उत्पादन (Production)');

  // Sheet: Expenses
  const expData = expenses.map((e, idx) => ({
    'क्र.सं.': idx + 1,
    'वाउचर': e.voucherNo,
    'तारीख': e.date,
    'कैटेगरी': e.categoryHindi,
    'विवरण': e.title,
    'राशि (₹)': e.amount,
    'माध्यम': e.paymentMode,
    'भुगतान प्राप्तकर्ता': e.paidTo,
  }));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(expData), 'फैक्ट्री खर्चे (Expenses)');

  saveWorkbook(workbook, `TEJ_FOOD_ERP_Complete_Business_Book_${todayStr}.xlsx`);
}
