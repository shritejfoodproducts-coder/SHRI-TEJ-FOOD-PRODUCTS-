import type { StaffPermissions, UserProfile, UserRole } from '../types/erp';

export interface PermissionItemMeta {
  key: keyof StaffPermissions;
  labelHindi: string;
  description: string;
}

export interface PermissionGroupMeta {
  groupTitle: string;
  items: PermissionItemMeta[];
}

export const PERMISSION_GROUPS: PermissionGroupMeta[] = [
  {
    groupTitle: 'स्टाफ एवं मुख्य सिस्टम अधिकार (Admin Controls)',
    items: [
      {
        key: 'manageStaff',
        labelHindi: 'स्टाफ जोड़ना, एडिट करना व अधिकार देना',
        description: 'नया कर्मचारी बनाना, पासवर्ड बदलना व अनुमतियां देना',
      },
      {
        key: 'manageSettings',
        labelHindi: 'फैक्ट्री सेटिंग्स व रेट बदलना',
        description: 'कंपनी प्रोफाइल, GSTIN, QR कोड व आटा रेट बदलना',
      },
      {
        key: 'viewReports',
        labelHindi: 'Excel रिपोर्ट्स व बैकअप डाउनलोड',
        description: 'मास्टर रिपोर्ट्स, डेटा एक्सपोर्ट/रीस्टोर करना',
      },
    ],
  },
  {
    groupTitle: 'ऑर्डर, ग्राहक, डिलीवरी व वसूली अधिकार',
    items: [
      {
        key: 'viewOrders',
        labelHindi: 'ऑर्डर देखना व नया ऑर्डर बनाना',
        description: 'नया ऑर्डर बुक करना व इनवॉइस प्रिंट/शेयर करना',
      },
      {
        key: 'editOrders',
        labelHindi: 'ऑर्डर एडिट व डिलीट करना',
        description: 'पुराने ऑर्डर की मात्रा, रेट, बिल टाइप या स्टेटस बदलना',
      },
      {
        key: 'viewCustomers',
        labelHindi: 'ग्राहक खाता देखना व नया ग्राहक जोड़ना',
        description: 'दुकानदार की लिस्ट, पता, फोन व बकाया देखना',
      },
      {
        key: 'editCustomers',
        labelHindi: 'ग्राहक एडिट व डिलीट करना',
        description: 'ग्राहक का नाम, नंबर, क्रेडिट लिमिट या बकाया बदलना',
      },
      {
        key: 'receivePayment',
        labelHindi: 'ग्राहक से पेमेंट / उधारी वसूली दर्ज करना',
        description: 'नकद, बैंक या UPI से भुगतान जमा एंट्री करना',
      },
      {
        key: 'viewDelivery',
        labelHindi: 'डिलीवरी ट्रैकिंग व गाड़ी डिस्पैच',
        description: 'गाड़ी लोड करना और ऑर्डर Delivered मार्क करना',
      },
    ],
  },
  {
    groupTitle: 'स्टॉक, उत्पादन (पिसाई) व लेखा-जोखा अधिकार',
    items: [
      {
        key: 'viewInventory',
        labelHindi: 'स्टॉक व इन्वेंट्री देखना',
        description: 'कच्चा गेहूँ, खाली बैग व तैयार आटा स्टॉक देखना',
      },
      {
        key: 'editInventory',
        labelHindi: 'स्टॉक मात्रा एडिट व नया गेहूँ जोड़ना',
        description: 'गेहूँ खरीद जोड़ना व बैग स्टॉक में सीधा बदलाव करना',
      },
      {
        key: 'viewProduction',
        labelHindi: 'उत्पादन / पिसाई देखना व नया बैच जोड़ना',
        description: 'चक्की पिसाई बैच, आटा व चोकर आउटपुट दर्ज करना',
      },
      {
        key: 'editProduction',
        labelHindi: 'पिसाई बैच एडिट व डिलीट करना',
        description: 'पिसाई बैच का वजन, बैग गिनती या नोट्स बदलना',
      },
      {
        key: 'viewAccounting',
        labelHindi: 'लेखा-जोखा, मुनाफा (P&L) व बैंक देखना',
        description: 'शुद्ध मुनाफा, गल्ला व बैंक लेनदेन देखना',
      },
      {
        key: 'addExpense',
        labelHindi: 'नया खर्च वाउचर दर्ज करना',
        description: 'बिजली बिल, डीजल, मजदूरी व मिल खर्च जोड़ना',
      },
    ],
  },
];

export const ALL_TRUE_PERMISSIONS: StaffPermissions = {
  viewCustomers: true,
  editCustomers: true,
  viewOrders: true,
  editOrders: true,
  viewInventory: true,
  editInventory: true,
  viewProduction: true,
  editProduction: true,
  viewDelivery: true,
  receivePayment: true,
  viewAccounting: true,
  addExpense: true,
  viewReports: true,
  manageStaff: true,
  manageSettings: true,
};

export function getDefaultPermissionsForRole(role: UserRole): StaffPermissions {
  switch (role) {
    case 'admin':
      return { ...ALL_TRUE_PERMISSIONS };

    case 'manager':
      return {
        viewCustomers: true,
        editCustomers: true,
        viewOrders: true,
        editOrders: true,
        viewInventory: true,
        editInventory: true,
        viewProduction: true,
        editProduction: true,
        viewDelivery: true,
        receivePayment: true,
        viewAccounting: false,
        addExpense: true,
        viewReports: true,
        manageStaff: false, // Admin must explicitly grant Staff Add/Edit access
        manageSettings: false,
      };

    case 'accountant':
      return {
        viewCustomers: true,
        editCustomers: true,
        viewOrders: true,
        editOrders: true,
        viewInventory: true,
        editInventory: false,
        viewProduction: false,
        editProduction: false,
        viewDelivery: true,
        receivePayment: true,
        viewAccounting: true,
        addExpense: true,
        viewReports: true,
        manageStaff: false,
        manageSettings: false,
      };

    case 'store_keeper':
      return {
        viewCustomers: false,
        editCustomers: false,
        viewOrders: true,
        editOrders: false,
        viewInventory: true,
        editInventory: true,
        viewProduction: true,
        editProduction: false,
        viewDelivery: true,
        receivePayment: false,
        viewAccounting: false,
        addExpense: false,
        viewReports: false,
        manageStaff: false,
        manageSettings: false,
      };

    case 'production_head':
      return {
        viewCustomers: false,
        editCustomers: false,
        viewOrders: true,
        editOrders: false,
        viewInventory: true,
        editInventory: false,
        viewProduction: true,
        editProduction: true,
        viewDelivery: false,
        receivePayment: false,
        viewAccounting: false,
        addExpense: false,
        viewReports: false,
        manageStaff: false,
        manageSettings: false,
      };

    case 'packing_staff':
      return {
        viewCustomers: false,
        editCustomers: false,
        viewOrders: true,
        editOrders: false,
        viewInventory: true,
        editInventory: false,
        viewProduction: true,
        editProduction: false,
        viewDelivery: true,
        receivePayment: false,
        viewAccounting: false,
        addExpense: false,
        viewReports: false,
        manageStaff: false,
        manageSettings: false,
      };

    case 'delivery_staff':
      return {
        viewCustomers: true,
        editCustomers: false,
        viewOrders: true,
        editOrders: false,
        viewInventory: false,
        editInventory: false,
        viewProduction: false,
        editProduction: false,
        viewDelivery: true,
        receivePayment: true,
        viewAccounting: false,
        addExpense: false,
        viewReports: false,
        manageStaff: false,
        manageSettings: false,
      };

    case 'salesman':
      return {
        viewCustomers: true,
        editCustomers: false,
        viewOrders: true,
        editOrders: false,
        viewInventory: true,
        editInventory: false,
        viewProduction: false,
        editProduction: false,
        viewDelivery: true,
        receivePayment: true,
        viewAccounting: false,
        addExpense: false,
        viewReports: false,
        manageStaff: false,
        manageSettings: false,
      };

    default:
      return {
        viewCustomers: false,
        editCustomers: false,
        viewOrders: true,
        editOrders: false,
        viewInventory: true,
        editInventory: false,
        viewProduction: false,
        editProduction: false,
        viewDelivery: false,
        receivePayment: false,
        viewAccounting: false,
        addExpense: false,
        viewReports: false,
        manageStaff: false,
        manageSettings: false,
      };
  }
}

export function getEffectivePermissions(
  user: UserProfile | undefined,
  fallbackRole: UserRole
): StaffPermissions {
  const role = user?.role || fallbackRole;
  if (role === 'admin') {
    return { ...ALL_TRUE_PERMISSIONS };
  }
  const defaults = getDefaultPermissionsForRole(role);
  if (!user?.permissions) {
    return defaults;
  }
  return {
    ...defaults,
    ...user.permissions,
  };
}

export function countEnabledPermissions(perms: StaffPermissions): number {
  return Object.values(perms).filter(Boolean).length;
}
