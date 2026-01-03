import mongoose, { Schema, Model } from 'mongoose';
import { IStoreUser } from '@/types';

const StoreUserSchema = new Schema<IStoreUser>(
  {
    store_id: { type: Schema.Types.ObjectId, ref: 'stores', required: true },
    user_account_id: { type: Schema.Types.ObjectId, ref: 'user_accounts', required: false },
    full_name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    phone: { type: String, required: true },
    password_hash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'manager', 'staff'], required: true },
    permissions: [{ type: String }],
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'store_users',
  }
);

StoreUserSchema.index({ store_id: 1, email: 1 }, { unique: true });
StoreUserSchema.index({ store_id: 1, user_account_id: 1 }, { unique: true, sparse: true });
StoreUserSchema.index({ email: 1 });
StoreUserSchema.index({ store_id: 1 });
StoreUserSchema.index({ user_account_id: 1 });

export const StoreUser: Model<IStoreUser> =
  mongoose.models.store_users || mongoose.model<IStoreUser>('store_users', StoreUserSchema);
