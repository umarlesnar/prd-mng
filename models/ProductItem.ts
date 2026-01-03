import mongoose, { Schema, Model } from 'mongoose';
import { IProductItem } from '@/types';
import '@/models/Batch';

const ProductItemSchema = new Schema<IProductItem>(
  {
    batch_id: { type: Schema.Types.ObjectId, ref: 'batches', required: true },
    product_template_id: { type: Schema.Types.ObjectId, ref: 'product_templates', required: true },
    store_id: { type: Schema.Types.ObjectId, ref: 'stores', required: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'user_accounts', required: true },
    serial_number: { type: String, required: true, unique: true },
    serial_prefix_used: { type: String, required: true },
    serial_suffix_used: { type: String },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'product_items',
  }
);

ProductItemSchema.index({ batch_id: 1 });
ProductItemSchema.index({ product_template_id: 1 });
ProductItemSchema.index({ store_id: 1, user_id: 1 });

export const ProductItem: Model<IProductItem> =
  mongoose.models.product_items || mongoose.model<IProductItem>('product_items', ProductItemSchema);
