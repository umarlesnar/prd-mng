import mongoose, { Schema, Model } from 'mongoose';
import { ICustomer } from '@/types';

const CustomerSchema = new Schema<ICustomer>(
  {
    store_id: { type: Schema.Types.ObjectId, ref: 'stores', required: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'user_accounts', required: true }, // Added
    customer_name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, lowercase: true },
    address: { type: String },
    gst_number: { type: String },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'customers',
  }
);

// Index for efficient fetching of a specific user's customers within a store
CustomerSchema.index({ store_id: 1, user_id: 1, phone: 1 });
CustomerSchema.index({ email: 1 });

export const Customer: Model<ICustomer> =
  mongoose.models.customers || mongoose.model<ICustomer>('customers', CustomerSchema);