import mongoose, { Schema, Model } from 'mongoose';
import { IStore } from '@/types';

const StoreSchema = new Schema<IStore>(
  {
    store_name: { type: String, required: true },
    store_logo: { type: String },
    address: { type: String },
    contact_phone: { type: String },
    serial_prefix: { type: String, required: true, default: '' },
    serial_suffix: { type: String, default: '' },
    serial_counter: { type: Number, required: true, default: 1 },
    owner_user_id: { type: Schema.Types.ObjectId, ref: 'user_accounts', required: true },
    whatsapp_enabled: { type: Boolean, default: false },
    whatsapp_number: { type: String },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'stores',
  }
);

StoreSchema.index({ owner_user_id: 1 });
StoreSchema.index({ store_name: 1 });

export const Store: Model<IStore> =
  mongoose.models.stores || mongoose.model<IStore>('stores', StoreSchema);
