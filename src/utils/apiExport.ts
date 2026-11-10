import { AppDatabaseState } from './backup';

export interface ApiExportPayload {
  api_meta: {
    system: string;
    version: string;
    export_format: string;
    exported_at: string;
    company_name: string;
    brand: string;
    storage_type: string;
    base_endpoint_url: string;
  };
  endpoints: {
    [route: string]: {
      method: 'GET' | 'POST';
      description: string;
      descriptionHindi: string;
      record_count: number;
      data: any;
    };
  };
  openapi_spec: {
    openapi: string;
    info: {
      title: string;
      version: string;
      description: string;
      contact: {
        name: string;
        phone: string;
        email: string;
      };
    };
    paths: Record<string, any>;
  };
}

export function generateApiPayload(state: AppDatabaseState): ApiExportPayload {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://tejfood.app';
  const exportedAt = new Date().toISOString();

  return {
    api_meta: {
      system: 'TEJ FOOD PRODUCTS - Factory ERP & Milling Management System',
      version: state.version || '2.4.0',
      export_format: 'REST_API_V1_JSON',
      exported_at: exportedAt,
      company_name: state.settings.companyName || 'Shri Tej Food Products',
      brand: state.settings.brandName || 'Tejstha (तेजस्था)',
      storage_type: 'Local Mobile Storage (Zero Cloud Cost)',
      base_endpoint_url: `${baseUrl}/api/v1`,
    },
    endpoints: {
      '/api/v1/company': {
        method: 'GET',
        description: 'Company Profile, GSTIN, FSSAI, Bank and Payment Details',
        descriptionHindi: 'कंपनी प्रोफाइल, GST, FSSAI, बैंक खाता व UPI विवरण',
        record_count: 1,
        data: state.settings,
      },
      '/api/v1/products': {
        method: 'GET',
        description: 'Product Catalog with 5KG, 10KG, 25KG, 50KG Bag Pricing',
        descriptionHindi: 'प्रोडक्ट लिस्ट व 5/10/25/50 KG बैग सेलिंग दरें',
        record_count: state.products.length,
        data: state.products,
      },
      '/api/v1/inventory/raw-wheat': {
        method: 'GET',
        description: 'Raw Wheat Stock in Quintals and Empty Bag Inventories',
        descriptionHindi: 'कच्चा गेहूं स्टॉक (क्विंटल) एवं खाली बैग इन्वेंट्री',
        record_count: 1,
        data: state.rawStock,
      },
      '/api/v1/inventory/finished-atta': {
        method: 'GET',
        description: 'Packed Atta Bags Ready Stock and Threshold Status',
        descriptionHindi: 'तैयार आटा बैग स्टॉक व न्यूनतम स्टॉक अलर्ट',
        record_count: state.bagStock.length,
        data: state.bagStock,
      },
      '/api/v1/customers': {
        method: 'GET',
        description: 'Customer Accounts, Purchase Ledgers, and Due Payments',
        descriptionHindi: 'ग्राहक सूची, खरीद रिकॉर्ड और बकाया पेमेंट हिसाब',
        record_count: state.customers.length,
        data: state.customers,
      },
      '/api/v1/orders': {
        method: 'GET',
        description: 'Orders with GST Tax Details, Dispatch and Delivery Status',
        descriptionHindi: 'ऑर्डर लिस्ट, GST टैक्स ब्रेकअप, डिस्पैच व डिलीवरी स्थिति',
        record_count: state.orders.length,
        data: state.orders,
      },
      '/api/v1/production': {
        method: 'GET',
        description: 'Milling Batches, Grain Input, Flour Yield, and Choker Byproduct',
        descriptionHindi: 'पिसाई बैच, गेहूं इनपुट, आटा उत्पादन % व चोकर उपोत्पाद',
        record_count: state.production.length,
        data: state.production,
      },
      '/api/v1/expenses': {
        method: 'GET',
        description: 'Factory Operating Expenses, Mandi Purchases, Salaries, Vouchers',
        descriptionHindi: 'फैक्ट्री खर्चे, मंडी गेहूं खरीद, बिजली, डीजल, मजदूरी',
        record_count: state.expenses.length,
        data: state.expenses,
      },
      '/api/v1/staff': {
        method: 'GET',
        description: 'Staff Members, Role Permissions, Shifts and Mobile Logins',
        descriptionHindi: 'कर्मचारी सूची, रोल अनुमतियाँ, शिफ्ट व मोबाइल लॉगिन',
        record_count: state.staff.length,
        data: state.staff.map(s => ({
          id: s.id,
          name: s.name,
          phone: s.phone,
          role: s.role,
          roleHindi: s.roleHindi,
          active: s.active,
          shift: s.shift,
          assignedVehicle: s.assignedVehicle,
          joinedDate: s.joinedDate,
        })),
      },
    },
    openapi_spec: {
      openapi: '3.0.3',
      info: {
        title: 'TEJ FOOD PRODUCTS Factory ERP REST API',
        version: state.version || '2.4.0',
        description: 'Complete REST API Specification for Shri Tej Food Products & Tejstha Atta Mill.',
        contact: {
          name: state.settings.proprietor || 'Shri Tej Prakash',
          phone: state.settings.phone || '+91 98290 12345',
          email: state.settings.email || 'shritejfoodproducts@gmail.com',
        },
      },
      paths: {
        '/api/v1/orders': {
          get: {
            summary: 'Get all factory orders',
            responses: { '200': { description: 'Successful orders list' } },
          },
        },
        '/api/v1/inventory/finished-atta': {
          get: {
            summary: 'Get finished bag stock',
            responses: { '200': { description: 'Bag stock counts' } },
          },
        },
        '/api/v1/customers': {
          get: {
            summary: 'Get customer ledger and dues',
            responses: { '200': { description: 'Customers list' } },
          },
        },
      },
    },
  };
}

export function downloadApiVersionJson(state: AppDatabaseState): void {
  const payload = generateApiPayload(state);
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  const dateStr = new Date().toISOString().slice(0, 10);
  downloadAnchor.setAttribute('download', `TEJ_FOOD_ERP_API_Version_v${state.version || '2.4.0'}_${dateStr}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export function downloadOpenApiSpec(state: AppDatabaseState): void {
  const payload = generateApiPayload(state);
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload.openapi_spec, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `TEJ_FOOD_ERP_OpenAPI_Spec_v3.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}
