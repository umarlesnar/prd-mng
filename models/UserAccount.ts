import mongoose, { Schema, Model } from 'mongoose';
import { IUserAccount } from '@/types';

const UserAccountSchema = new Schema<IUserAccount>(
  {
    full_name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String, required: true },
    password_hash: { type: String, required: true },
    business_name: { type: String },
    business_whatsapp: { type: String },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'user_accounts',
  }
);

UserAccountSchema.index({ phone: 1 });

export const UserAccount: Model<IUserAccount> =
  mongoose.models.user_accounts || mongoose.model<IUserAccount>('user_accounts', UserAccountSchema);
