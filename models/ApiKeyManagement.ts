import mongoose, { Schema, Model } from 'mongoose';

export interface IApiKeyManagement {
  _id: mongoose.Types.ObjectId;
  store_id: mongoose.Types.ObjectId;
  name: string;
  status: 'Enabled' | 'Disabled';
  expired_at?: Date;
  created_at: Date;
  updated_at: Date;
}

const ApiKeyManagementSchema = new Schema<IApiKeyManagement>(
  {
    store_id: { type: Schema.Types.ObjectId, ref: 'stores', required: true },
    name: { type: String, required: true },
    status: { type: String, enum: ['Enabled', 'Disabled'], default: 'Enabled', required: true },
    expired_at: { type: Date },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'api_key_management',
  }
);

ApiKeyManagementSchema.index({ store_id: 1 });
ApiKeyManagementSchema.index({ status: 1 });

export const ApiKeyManagement: Model<IApiKeyManagement> =
  mongoose.models.api_key_management || mongoose.model<IApiKeyManagement>('api_key_management', ApiKeyManagementSchema);
