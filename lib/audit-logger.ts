import { SystemAuditLog } from '@/models/SystemAuditLog';
import { Types } from 'mongoose';

interface AuditLogData {
  userId?: string | Types.ObjectId;
  storeId?: string | Types.ObjectId;
  entity: string;
  entityId: string | Types.ObjectId;
  action: 'create' | 'update' | 'delete';
  oldValue?: any;
  newValue?: any;
}

export async function logAudit(data: AuditLogData) {
  try {
    await SystemAuditLog.create({
      user_id: data.userId,
      store_id: data.storeId,
      entity: data.entity,
      entity_id: data.entityId,
      action: data.action,
      old_value: data.oldValue,
      new_value: data.newValue,
    });
  } catch (error) {
    console.error('Audit log error:', error);
  }
}
