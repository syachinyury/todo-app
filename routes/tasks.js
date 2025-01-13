import express from 'express';
import { Task } from '../models/Task.js';
import { User } from '../models/User.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Middleware to verify auth token
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            console.log('No token provided');
            return res.status(401).json({ error: 'No token provided' });
        }

        // Add debug log
        console.log('Verifying token:', {
            tokenStart: token.substring(0, 20),
            hasSecret: !!process.env.SESSION_SECRET
        });

        const decoded = jwt.verify(token, process.env.SESSION_SECRET);
        
        // Add debug log
        console.log('Token verified, finding user:', decoded);

        const user = await User.findById(decoded.userId);
        if (!user) {
            console.log('User not found for token');
            return res.status(401).json({ error: 'User not found' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Token verification error:', {
            message: error.message,
            name: error.name
        });
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Get all tasks
router.get('/', authenticateToken, async (req, res) => {
    try {
        const tasks = await Task.find({ userId: req.user._id });
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
});

// Create task
router.post('/', authenticateToken, async (req, res) => {
    try {
        const task = new Task({
            ...req.body,
            userId: req.user._id
        });
        await task.save();
        res.status(201).json(task);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create task' });
    }
});

// Toggle task completion
router.put('/:taskId/toggle', authenticateToken, async (req, res) => {
    try {
        const task = await Task.findOne({ _id: req.params.taskId, userId: req.user._id });
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
router.delete('/:taskId', authenticateToken, async (req, res) => {
    try {
        const task = await Task.findOneAndDelete({ _id: req.params.taskId, userId: req.user._id });
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json({ message: 'Task deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete task' });
    }
});

// Add subtask
router.post('/:taskId/subtasks', authenticateToken, async (req, res) => {
    try {
        const task = await Task.findOne({ _id: req.params.taskId, userId: req.user._id });
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
router.put('/:taskId/subtasks/:subtaskId/toggle', authenticateToken, async (req, res) => {
    try {
        const task = await Task.findOne({ _id: req.params.taskId, userId: req.user._id });
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