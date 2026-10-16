import { Schema, model, type InferSchemaType } from 'mongoose';

export const PROJECT_COLORS = ['#2f5d46', '#6b8f71', '#c4704f', '#8a6f3d', '#4f6d7a', '#7b5e7b', '#3d4a45', '#b08968'] as const;

const projectSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    color: { type: String, required: true, default: PROJECT_COLORS[0], match: /^#[0-9a-fA-F]{6}$/ },
    startDate: { type: Date, default: null },
    deadline: { type: Date, default: null },
    archived: { type: Boolean, default: false },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

projectSchema.index({ owner: 1, archived: 1, updatedAt: -1 });
projectSchema.index({ owner: 1, name: 1 });

export type ProjectDoc = InferSchemaType<typeof projectSchema>;
export const Project = model('Project', projectSchema);
