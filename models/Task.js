import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  text: {
    type: String,
    required: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  deadline: Date,
  subtasks: [{
    text: String,
    completed: Boolean
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const Task = mongoose.model('Task', taskSchema); 