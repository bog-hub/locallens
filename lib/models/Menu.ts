// lib/models/Menu.ts
import { Schema, model, models, type Document } from 'mongoose';

export interface IMenuItem {
  _id?:         string;
  name:         string;
  description?: string;
  price?:       number;       // in MAD, optional
  photos:       string[];     // max 3 Cloudinary URLs
  available:    boolean;
}

export interface IMenuSection {
  _id?:  string;
  name:  string;
  items: IMenuItem[];
}

export interface IMenu extends Document {
  business: Schema.Types.ObjectId;
  sections: IMenuSection[];
  updatedAt: Date;
}

const MenuItemSchema = new Schema<IMenuItem>({
  name:        { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 400 },
  price:       { type: Number, min: 0 },   // undefined = price not listed
  photos:      { type: [String], validate: [(v: string[]) => v.length <= 3, 'Max 3 photos per item'] },
  available:   { type: Boolean, default: true },
}, { _id: true });

const MenuSectionSchema = new Schema<IMenuSection>({
  name:  { type: String, required: true, trim: true, maxlength: 80 },
  items: { type: [MenuItemSchema], default: [] },
}, { _id: true });

const MenuSchema = new Schema<IMenu>({
  business: { type: Schema.Types.ObjectId, ref: 'Business', required: true, unique: true, index: true },
  sections: { type: [MenuSectionSchema], default: [] },
}, { timestamps: true });

export const Menu = models.Menu || model<IMenu>('Menu', MenuSchema);