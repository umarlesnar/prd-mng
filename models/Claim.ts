import mongoose, { Schema, Model } from 'mongoose';
import { IClaim, ITimelineEvent } from '@/types';
import '@/models/Warranty';

const TimelineEventSchema = new Schema<ITimelineEvent>(
  {
    timestamp: { type: Date, required: true, default: Date.now },
    action: { type: String, required: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'user_accounts' },
    notes: { type: String },
  },
  { _id: false }
);

const ClaimSchema = new Schema<IClaim>(
  {
    warranty_id: { type: Schema.Types.ObjectId, ref: 'warranties', required: true },
    store_id: { type: Schema.Types.ObjectId, ref: 'stores', required: true },
    claim_type: { type: String, enum: ['repair', 'replacement', 'refund'], required: true },
    description: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'completed'], default: 'pending' },
    assigned_store_user_id: { type: Schema.Types.ObjectId, ref: 'store_users' },
    attachments: [{ type: String }],
    timeline_events: [TimelineEventSchema],
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'claims',
  }
);

ClaimSchema.index({ warranty_id: 1 });
ClaimSchema.index({ store_id: 1 });
ClaimSchema.index({ status: 1 });

export const Claim: Model<IClaim> =
  mongoose.models.claims || mongoose.model<IClaim>('claims', ClaimSchema);
