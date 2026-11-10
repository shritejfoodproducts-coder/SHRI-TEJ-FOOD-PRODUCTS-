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

export interface AppDatabaseState {
  version: string;
  timestamp: string;
  settings: CompanySettings;
  products: ProductMaster[];
  rawStock: RawMaterialStock;
  bagStock: BagStockItem[];
  customers: Customer[];
  orders: Order[];
  production: ProductionBatch[];
  expenses: ExpenseRecord[];
  staff: UserProfile[];
}

const STORAGE_KEY = 'tej_food_products_erp_db_v1';

export function saveStateToStorage(state: AppDatabaseState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save state to localStorage:', err);
  }
}

export function loadStateFromStorage(): AppDatabaseState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse state from localStorage:', err);
    return null;
  }
}

export function exportDatabaseBackup(state: AppDatabaseState): void {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  const dateStr = new Date().toISOString().slice(0, 10);
  downloadAnchor.setAttribute('download', `TEJ_FOOD_ERP_Cloud_Backup_${dateStr}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export function importDatabaseBackup(file: File): Promise<AppDatabaseState> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.products || !parsed.rawStock || !parsed.orders) {
          throw new Error('अमान्य बैकअप फ़ाइल प्रारूप (Invalid backup file format)');
        }
        resolve(parsed);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(new Error('फ़ाइल पढ़ने में त्रुटि हुई (Failed to read file)'));
    reader.readAsText(file);
  });
}
