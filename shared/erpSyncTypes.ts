import type {
  BagSize,
  BagStockItem,
  CompanySettings,
  Customer,
  CustomerPaymentRecord,
  ExpenseRecord,
  Order,
  OrderStatus,
  ProductMaster,
  ProductionBatch,
  RawMaterialStock,
  UserProfile,
  UserRole,
} from '../src/types/erp.ts';

export type SyncDeviceRole = 'master' | 'staff';

export interface SyncableErpState {
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

export interface ConnectedDevice {
  deviceId: string;
  deviceName: string;
  deviceRole: SyncDeviceRole;
  userRole: UserRole;
  connectedAt: string;
  lastSeenAt: string;
}

export interface LiveActivityEvent {
  id: string;
  seq: number;
  timestamp: string;
  actorDeviceId: string;
  actorName: string;
  actorRole: UserRole;
  category: 'order' | 'payment' | 'production' | 'customer' | 'inventory' | 'expense' | 'staff' | 'settings' | 'sync';
  title: string;
  detail: string;
}

export type ErpMutationAction =
  | { type: 'order:create'; order: Order }
  | { type: 'order:update'; updatedOrder: Order; originalOrder: Order }
  | { type: 'order:delete'; orderId: string }
  | { type: 'order:status'; orderId: string; newStatus: OrderStatus; deliveredAt?: string }
  | { type: 'payment:receive'; payment: CustomerPaymentRecord }
  | { type: 'customer:create'; customer: Customer }
  | { type: 'customer:update'; customer: Customer }
  | { type: 'customer:delete'; customerId: string }
  | { type: 'production:create'; batch: ProductionBatch }
  | { type: 'production:update'; updatedBatch: ProductionBatch; originalBatch: ProductionBatch }
  | { type: 'production:delete'; batchId: string }
  | { type: 'expense:create'; expense: ExpenseRecord }
  | { type: 'staff:create'; staffMember: UserProfile }
  | { type: 'staff:update'; staffMember: UserProfile }
  | { type: 'staff:delete'; staffId: string }
  | { type: 'stock:raw_update'; rawStock: RawMaterialStock }
  | { type: 'stock:bag_update'; productId: string; bagSize: BagSize; newCount: number }
  | { type: 'settings:update'; settings: CompanySettings }
  | { type: 'product:create'; product: ProductMaster }
  | { type: 'product:update'; product: ProductMaster }
  | { type: 'product:delete'; productId: string }
  | { type: 'product:rate_update'; productId: string; bagSize: BagSize; rate: number }
  | { type: 'master:push_full_state'; fullState: SyncableErpState }
  | { type: 'master:reset_factory'; fullState: SyncableErpState };

export interface SyncMutationEnvelope {
  mutationId: string;
  roomId: string;
  actorDeviceId: string;
  actorName: string;
  actorRole: UserRole;
  timestamp: string;
  action: ErpMutationAction;
}

export type WsClientMessage =
  | {
      type: 'join';
      roomId: string;
      deviceId: string;
      deviceName: string;
      deviceRole: SyncDeviceRole;
      userRole: UserRole;
      initialMasterState?: SyncableErpState;
    }
  | {
      type: 'mutation';
      envelope: SyncMutationEnvelope;
    }
  | {
      type: 'update_presence';
      roomId: string;
      deviceId: string;
      deviceName: string;
      deviceRole: SyncDeviceRole;
      userRole: UserRole;
    }
  | { type: 'ping' };

export type WsServerMessage =
  | {
      type: 'init';
      roomId: string;
      seq: number;
      hasMasterSeed: boolean;
      state: SyncableErpState;
      devices: ConnectedDevice[];
      recentEvents: LiveActivityEvent[];
    }
  | {
      type: 'mutation_broadcast';
      roomId: string;
      seq: number;
      envelope: SyncMutationEnvelope;
      activity: LiveActivityEvent;
      state?: SyncableErpState;
    }
  | {
      type: 'mutation_ack';
      mutationId: string;
      seq: number;
      applied: boolean;
    }
  | {
      type: 'presence_update';
      roomId: string;
      devices: ConnectedDevice[];
    }
  | { type: 'pong' };
