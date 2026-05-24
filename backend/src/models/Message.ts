import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  claimId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  text: string;
  createdAt: Date;
}

const MessageSchema: Schema = new Schema({
  claimId: { type: Schema.Types.ObjectId, ref: 'Claim', required: true },
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IMessage>('Message', MessageSchema);
