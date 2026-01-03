import { Types } from 'mongoose';

export interface IUserAccount {
  _id: Types.ObjectId;
  full_name: string;
  email: string;
  phone: string;
  password_hash: string;
  business_name?: string;
  business_whatsapp?: string;
  created_at: Date;
  updated_at: Date;
}

export interface IStore {
  _id: Types.ObjectId;
  store_name: string;
  store_logo?: string;
  address?: string;
  contact_phone?: string;
  serial_prefix: string;
  serial_suffix: string;
  serial_counter: number;
  owner_user_id: Types.ObjectId;
  whatsapp_enabled: boolean;
  whatsapp_number?: string;
  created_at: Date;
  updated_at: Date;
}

export interface IStoreUser {
  _id: Types.ObjectId;
  store_id: Types.ObjectId;
  user_account_id?: Types.ObjectId;
  full_name: string;
  email: string;
  phone: string;
  password_hash: string;
  role: 'admin' | 'manager' | 'staff';
  permissions: string[];
  created_at: Date;
  updated_at: Date;
}

export interface ICustomer {
  _id: Types.ObjectId;
  store_id: Types.ObjectId;
  user_id: Types.ObjectId;
  customer_name: string;
  phone: string;
  email?: string;
  address?: string;
  gst_number?: string;
  created_at: Date;
  updated_at: Date;
}

export interface IProduct {
  _id: Types.ObjectId;
  store_id: Types.ObjectId;
  user_id: Types.ObjectId;
  product_model: string;
  category: string;
  brand: string;
  serial_number: string;
  serial_prefix_used: string;
  serial_suffix_used: string;
  serial_number_index: number;
  manufacturing_date: Date;
  base_warranty_months: number;
  created_at: Date;
  updated_at: Date;
}

export interface IProductTemplate {
  _id: Types.ObjectId;
  store_id: Types.ObjectId;
  user_id: Types.ObjectId;
  brand: string;
  product_model: string;
  category: string;
  created_at: Date;
  updated_at: Date;
}

export interface IBatch {
  _id: Types.ObjectId;
  product_template_id: Types.ObjectId;
  store_id: Types.ObjectId;
  user_id: Types.ObjectId;
  manufacturing_date: Date;
  warranty_period_months: number;
  quantity: number;
  created_at: Date;
  updated_at: Date;
}

export interface IProductItem {
  _id: Types.ObjectId;
  batch_id: Types.ObjectId;
  product_template_id: Types.ObjectId;
  store_id: Types.ObjectId;
  user_id: Types.ObjectId;
  serial_number: string;
  serial_prefix_used: string;
  serial_suffix_used?: string;
  created_at: Date;
  updated_at: Date;
}

export interface IWarranty {
  _id: Types.ObjectId;
  product_id: Types.ObjectId;
  user_id: Types.ObjectId;
  customer_id: Types.ObjectId;
  store_id: Types.ObjectId;
  warranty_start: Date;
  warranty_end: Date;
  status: 'active' | 'expired';
  qr_code_url?: string;
  warranty_pdf_url?: string;
  created_at: Date;
  updated_at: Date;
}

export interface IClaim {
  _id: Types.ObjectId;
  warranty_id: Types.ObjectId;
  store_id: Types.ObjectId;
  claim_type: 'repair' | 'replacement' | 'refund';
  description: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  assigned_store_user_id?: Types.ObjectId;
  attachments: string[];
  timeline_events: ITimelineEvent[];
  created_at: Date;
  updated_at: Date;
}

export interface ITimelineEvent {
  timestamp: Date;
  action: string;
  user_id?: Types.ObjectId;
  notes?: string;
}

export interface ISystemAuditLog {
  _id: Types.ObjectId;
  user_id?: Types.ObjectId;
  store_id?: Types.ObjectId;
  entity: string;
  entity_id: Types.ObjectId;
  action: 'create' | 'update' | 'delete';
  old_value?: any;
  new_value?: any;
  created_at: Date;
}

export interface IWhatsAppEventLog {
  _id: Types.ObjectId;
  store_id?: Types.ObjectId;
  phone_number: string;
  message_type: 'incoming' | 'outgoing';
  message_content: string;
  event_type: string;
  metadata?: any;
  created_at: Date;
}

export interface IApiKeyManagement {
  _id: Types.ObjectId;
  store_id: Types.ObjectId;
  name: string;
  status: 'Enabled' | 'Disabled';
  expired_at?: Date;
  created_at: Date;
  updated_at: Date;
}