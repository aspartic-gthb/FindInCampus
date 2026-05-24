import mongoose, { Document, Schema } from 'mongoose';

export interface IItem extends Document {
  type: 'LOST' | 'FOUND';
  status: 'OPEN' | 'PENDING_CLAIM' | 'RESOLVED';
  category: string;
  title: string;
  description: string;
  location: string;
  visualTags: string[];
  imageUrl?: string;
  embedding?: number[];
  timeFound?: string;
  hiddenNotes?: string;
  reporterId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const ItemSchema: Schema = new Schema({
  type: { type: String, enum: ['LOST', 'FOUND'], required: true },
  status: { type: String, enum: ['OPEN', 'PENDING_CLAIM', 'RESOLVED'], default: 'OPEN' },
  category: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  location: { type: String, required: true },
  visualTags: [{ type: String }],
  imageUrl: { type: String },
  embedding: [{ type: Number }],
  timeFound: { type: String },
  hiddenNotes: { type: String },
  reporterId: { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IItem>('Item', ItemSchema);
