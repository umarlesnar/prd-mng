import mongoose, { Schema, Model } from 'mongoose';
import { ISystemAuditLog } from '@/types';

const SystemAuditLogSchema = new Schema<ISystemAuditLog>(
  {
    user_id: { type: Schema.Types.ObjectId },
    store_id: { type: Schema.Types.ObjectId, ref: 'stores' },
    entity: { type: String, required: true },
    entity_id: { type: Schema.Types.ObjectId, required: true },
    action: { type: String, enum: ['create', 'update', 'delete'], required: true },
    old_value: { type: Schema.Types.Mixed },
    new_value: { type: Schema.Types.Mixed },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
    collection: 'system_audit_logs',
  }
);

SystemAuditLogSchema.index({ entity: 1, entity_id: 1 });
SystemAuditLogSchema.index({ user_id: 1 });
SystemAuditLogSchema.index({ store_id: 1 });
SystemAuditLogSchema.index({ created_at: -1 });

export const SystemAuditLog: Model<ISystemAuditLog> =
  mongoose.models.system_audit_logs || mongoose.model<ISystemAuditLog>('system_audit_logs', SystemAuditLogSchema);
