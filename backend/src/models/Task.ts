import { Schema, model, type InferSchemaType } from 'mongoose';

export const TASK_STATUSES = ['todo', 'in_progress', 'done'] as const;
export const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

const taskSchema = new Schema(
  {
    // `owner` is denormalised onto every task so ownership checks are a single indexed predicate.
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    title: { type: String, required: true, trim: true, minlength: 1, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 5000, default: '' },
    status: { type: String, enum: TASK_STATUSES, default: 'todo', required: true },
    priority: { type: String, enum: TASK_PRIORITIES, default: 'medium', required: true },
    dueDate: { type: Date, default: null },
    // Sort key within a (project, status) column. Floats allow cheap inserts between neighbours.
    position: { type: Number, required: true, default: 0 },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

taskSchema.index({ owner: 1, project: 1, status: 1, position: 1 });
taskSchema.index({ owner: 1, status: 1, dueDate: 1 });
taskSchema.index({ owner: 1, updatedAt: -1 });

export type TaskDoc = InferSchemaType<typeof taskSchema>;
export const Task = model('Task', taskSchema);
