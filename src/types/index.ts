// ============================================================================
// Data Model & Entity Type Definitions
// ============================================================================

export type UserRole = 'CUSTOMER' | 'ADMIN' | 'TECHNICIAN';

export type ServiceType = 'onsite' | 'workshop';

export type OrderStatusType =
  | 'SUBMITTED'
  | 'PENDING'
  | 'DIAGNOSING'
  | 'QUOTED'
  | 'WAITING_APPROVAL'
  | 'IN_PROGRESS'
  | 'IN_REPAIR'
  | 'READY_FOR_PICKUP'
  | 'COMPLETED'
  | 'DELIVERED'
  | 'CANCELLED';

export type QuotationStatusType = 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export type PaymentStatusType = 'UNPAID' | 'PENDING_VERIFICATION' | 'PAID' | 'REFUNDED';

export type NotificationType =
  | 'ORDER_STATUS'
  | 'QUOTATION_READY'
  | 'PAYMENT_CONFIRMED'
  | 'SYSTEM';

// ----------------------------------------------------------------------------
// Entity Interfaces
// ----------------------------------------------------------------------------

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  password?: string | null;
  address?: string | null;
  role: UserRole;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  category: string;
  priceFrom: number;
  estimatedDuration: string;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ServiceOrder {
  id: string;
  ticketNumber: string;
  customerId: string;
  customer?: User;
  serviceId?: string | null;
  service?: Service | null;
  problemDescription: string;
  deviceType: string;
  deviceBrand: string;
  deviceModel: string;
  attachment?: string | null;
  serviceType: ServiceType;
  address?: string | null;
  preferredSchedule?: Date | string | null;
  status: OrderStatusType;
  createdAt: Date | string;
  updatedAt: Date | string;
  diagnosis?: Diagnosis | null;
  quotation?: Quotation | null;
  payments?: Payment[];
}

export interface Diagnosis {
  id: string;
  serviceOrderId: string;
  serviceOrder?: ServiceOrder;
  diagnosis: string;
  recommendation: string;
  estimatedCost: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Quotation {
  id: string;
  serviceOrderId: string;
  serviceOrder?: ServiceOrder;
  quotationNumber: string;
  subtotal: number;
  discount: number;
  total: number;
  notes?: string | null;
  status: QuotationStatusType;
  approvedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  items?: QuotationItem[];
}

export interface QuotationItem {
  id: string;
  quotationId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Payment {
  id: string;
  serviceOrderId: string;
  serviceOrder?: ServiceOrder;
  amount: number;
  paymentMethod: string;
  paymentStatus: PaymentStatusType;
  paymentDate?: Date | string | null;
  proofAttachment?: string | null;
  notes?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: Date | string;
}

export type KnowledgeCategoryType = 'FAQ' | 'POLICY' | 'SOP' | 'PRICING' | 'TROUBLESHOOTING';

export interface KnowledgeBase {
  id: string;
  category: KnowledgeCategoryType | string;
  title: string;
  content: string;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// ----------------------------------------------------------------------------
// Session & Helper Interfaces
// ----------------------------------------------------------------------------

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  avatarUrl?: string;
}

export interface NavItem {
  label: string;
  href: string;
  iconName: string;
  badge?: string | number;
}
