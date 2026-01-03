import mongoose, { Schema, Model } from 'mongoose';
import { IBatch } from '@/types';
import '@/models/ProductTemplate';

const BatchSchema = new Schema<IBatch>(
  {
    product_template_id: { type: Schema.Types.ObjectId, ref: 'product_templates', required: true },
    store_id: { type: Schema.Types.ObjectId, ref: 'stores', required: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'user_accounts', required: true },
    manufacturing_date: { type: Date, required: true },
    warranty_period_months: { type: Number, required: true, default: 12 },
    quantity: { type: Number, required: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'batches',
  }
);

BatchSchema.index({ product_template_id: 1 });
BatchSchema.index({ store_id: 1, user_id: 1 });

export const Batch: Model<IBatch> =
  mongoose.models.batches || mongoose.model<IBatch>('batches', BatchSchema);

