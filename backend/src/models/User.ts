import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  trustScore: number;
  createdAt: Date;
  matchPassword(enteredPassword: string): Promise<boolean>;
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  trustScore: { type: Number, default: 95 },
  createdAt: { type: Date, default: Date.now },
});

UserSchema.pre('save', async function () {
  const user = this as any;
  if (!user.isModified('password')) {
    return;
  }
  if (user.password) {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password as string, salt);
  }
});

UserSchema.methods.matchPassword = async function (enteredPassword: string) {
  const user = this as any;
  if (!user.password) return false;
  return await bcrypt.compare(enteredPassword, user.password as string);
};

export default mongoose.model<IUser>('User', UserSchema);
