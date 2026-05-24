import mongoose, { Document, Schema } from 'mongoose';

export interface IClaim extends Document {
  itemId: mongoose.Types.ObjectId;
  claimantId: mongoose.Types.ObjectId;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedBy?: mongoose.Types.ObjectId;
  verificationNotes?: string;
  lostLocation?: string;
  lostTime?: string;
  route?: string;
  lastAction?: string;
  uniqueFeatures?: string;
  confidenceScore?: number;
  aiReasoning?: string;
  createdAt: Date;
}

const ClaimSchema: Schema = new Schema({
  itemId: { type: Schema.Types.ObjectId, ref: 'Item', required: true },
  claimantId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  verificationNotes: { type: String },
  lostLocation: { type: String },
  lostTime: { type: String },
  route: { type: String },
  lastAction: { type: String },
  uniqueFeatures: { type: String },
  confidenceScore: { type: Number },
  aiReasoning: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IClaim>('Claim', ClaimSchema);
