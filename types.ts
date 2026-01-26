
export enum DriverStatus {
  OFFLINE = 'OFFLINE',
  ONLINE = 'ONLINE',
  ALERTING = 'ALERTING',
  GOING_TO_STORE = 'GOING_TO_STORE',
  ARRIVED_AT_STORE = 'ARRIVED_AT_STORE',
  PICKING_UP = 'PICKING_UP',
  GOING_TO_CUSTOMER = 'GOING_TO_CUSTOMER',
  ARRIVED_AT_CUSTOMER = 'ARRIVED_AT_CUSTOMER'
}

export interface DeliveryMission {
  id: string;
  storeName: string;
  storeAddress: string;
  customerName: string;
  customerAddress: string;
  customerPhoneSuffix: string;
  distanceToStore: number; // Km até a loja
  deliveryDistance: number; // Km da loja ao cliente (Base da taxa)
  totalDistance: number;
  earnings: number;
  timeLimit: number;
  collectionCode: string;
  items: string[];
}

export interface DailySummary {
  totalEarnings: number;
  completedDeliveries: number;
  onlineHours: number;
}

export interface TimelineEvent {
  time: string;
  description: string;
  status: 'done' | 'pending';
}

export interface Transaction {
  id: string;
  type: string;
  amount: number;
  time: string;
  date: string; // Adicionado para filtro
  weekId: string; // Adicionado para filtro
  status: 'COMPLETED' | 'PENDING';
  details?: {
    duration: string;
    stops: number;
    timeline: TimelineEvent[];
  };
}

export enum NotificationType {
  FINANCIAL = 'FINANCIAL',
  URGENT = 'URGENT',
  PROMOTION = 'PROMOTION',
  SYSTEM = 'SYSTEM'
}

export interface NotificationModel {
  id: string;
  title: string;
  body: string;
  date: string;
  type: NotificationType;
  read: boolean;
}
