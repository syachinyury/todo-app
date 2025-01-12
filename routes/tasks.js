import express from 'express';
import { Task } from '../models/Task.js';
import { User } from '../models/User.js';

const router = express.Router();

// Middleware to verify auth token
async function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    
    console.log('Received token:', token); // Debug log
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const user = await User.findOne({
            'sessions.token': token,
            'sessions.expiresAt': { $gt: new Date() }
        });

        console.log('Found user:', user ? user.email : 'none'); // Debug log

        if (!user) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        req.userId = user._id;
        next();
    } catch (error) {
        console.error('Auth error:', error); // Debug log
        res.status(500).json({ error: 'Authentication failed' });
    }
}

// Get all tasks
router.get('/', authMiddleware, async (req, res) => {
    try {
        const tasks = await Task.find({ userId: req.userId });
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
});

// Create task
router.post('/', authMiddleware, async (req, res) => {
    try {
        const task = new Task({
            ...req.body,
            userId: req.userId
        });
        await task.save();
        res.status(201).json(task);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create task' });
    }
});

// Toggle task completion
router.put('/:taskId/toggle', authMiddleware, async (req, res) => {
    try {
        const task = await Task.findOne({ _id: req.params.taskId, userId: req.userId });
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        task.completed = !task.completed;
        await task.save();
        res.json(task);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update task' });
    }
});

// Delete task
router.delete('/:taskId', authMiddleware, async (req, res) => {
    try {
        const task = await Task.findOneAndDelete({ _id: req.params.taskId, userId: req.userId });
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json({ message: 'Task deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete task' });
    }
});

// Add subtask
router.post('/:taskId/subtasks', authMiddleware, async (req, res) => {
    try {
        const task = await Task.findOne({ _id: req.params.taskId, userId: req.userId });
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        task.subtasks.push({
            text: req.body.text,
            completed: false
        });
        await task.save();
        res.json(task);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add subtask' });
    }
});

// Toggle subtask completion
router.put('/:taskId/subtasks/:subtaskId/toggle', authMiddleware, async (req, res) => {
    try {
        const task = await Task.findOne({ _id: req.params.taskId, userId: req.userId });
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        const subtask = task.subtasks.id(req.params.subtaskId);
        if (!subtask) {
            return res.status(404).json({ error: 'Subtask not found' });
        }

        subtask.completed = !subtask.completed;
        await task.save();
        res.json(task);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update subtask' });
    }
});

export { router }; 