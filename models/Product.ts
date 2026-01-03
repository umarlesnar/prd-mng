import mongoose, { Schema, Model } from 'mongoose';
import { IProduct } from '@/types';
import '@/models/Store';

const ProductSchema = new Schema<IProduct>(
  {
    store_id: { type: Schema.Types.ObjectId, ref: 'stores', required: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'user_accounts', required: true },
    product_model: { type: String, required: true },
    category: { type: String, required: true },
    brand: { type: String, required: true },
    serial_number: { type: String, required: true, unique: true },
    serial_prefix_used: { type: String, required: true },
    serial_suffix_used: { type: String },
    manufacturing_date: { type: Date, required: true }, 
    base_warranty_months: { type: Number, required: true, default: 12 },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'products',
  }
);

ProductSchema.index({ store_id: 1, user_id: 1 });
ProductSchema.index({ brand: 1, category: 1 });

export const Product: Model<IProduct> =
  mongoose.models.products || mongoose.model<IProduct>('products', ProductSchema);