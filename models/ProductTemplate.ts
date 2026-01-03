import mongoose, { Schema, Model } from 'mongoose';
import { IProductTemplate } from '@/types';
import '@/models/Store';

const ProductTemplateSchema = new Schema<IProductTemplate>(
  {
    store_id: { type: Schema.Types.ObjectId, ref: 'stores', required: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'user_accounts', required: true },
    brand: { type: String, required: true },
    product_model: { type: String, required: true },
    category: { type: String, required: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'product_templates',
  }
);

ProductTemplateSchema.index({ store_id: 1, user_id: 1 });
ProductTemplateSchema.index({ brand: 1, category: 1, product_model: 1 });

export const ProductTemplate: Model<IProductTemplate> =
  mongoose.models.product_templates || mongoose.model<IProductTemplate>('product_templates', ProductTemplateSchema);

