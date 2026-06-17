const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = './uploads/chat';
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage, limits: { fileSize: 10 * 1024 * 1024 } });

// Store sessions
const sessions = new Map();

// ==========================================
// CONVERSATIONS
// ==========================================

// Get all conversations for staff
router.get('/staff/conversations', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });
    
    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT 
                c.*,
                CASE 
                    WHEN c.participant1_type = 'customer' THEN c.participant1_id
                    WHEN c.participant2_type = 'customer' THEN c.participant2_id
                END as customer_id,
                CASE 
                    WHEN c.participant1_type = 'customer' THEN (SELECT name FROM customers WHERE id = c.participant1_id)
                    WHEN c.participant2_type = 'customer' THEN (SELECT name FROM customers WHERE id = c.participant2_id)
                END as customer_name,
                CASE 
                    WHEN c.participant1_type = 'customer' THEN (SELECT email FROM customers WHERE id = c.participant1_id)
                    WHEN c.participant2_type = 'customer' THEN (SELECT email FROM customers WHERE id = c.participant2_id)
                END as customer_email
            FROM chat_conversations c
            WHERE c.is_active = true
            AND (c.participant1_type = 'staff' OR c.participant2_type = 'staff')
            ORDER BY c.last_message_at DESC NULLS LAST
        `);
        
        const conversations = result.rows.map(row => ({
            ...row,
            unread_count: row.unread_count_p2 || 0
        }));
        
        res.json({ success: true, conversations });
    } catch (err) {
        console.error('Staff conversations error:', err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        client.release();
    }
});

// Get messages for a conversation
router.get('/messages/:conversationId', async (req, res) => {
    const { conversationId } = req.params;
    const client = await pool.connect();
    try {
        // Simple query without is_deleted check (in case column doesn't exist)
        const result = await client.query(`
            SELECT * FROM chat_messages 
            WHERE conversation_id = $1
            ORDER BY created_at ASC
        `, [conversationId]);
        
        // Mark messages as read for staff
        await client.query(`
            UPDATE chat_conversations 
            SET unread_count_p2 = 0 
            WHERE id = $1
        `, [conversationId]);
        
        res.json({ success: true, messages: result.rows });
    } catch (err) {
        console.error('Get messages error:', err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        client.release();
    }
});

// Send a message
router.post('/messages', upload.single('file'), async (req, res) => {
    const { conversation_id, sender_type, sender_id, message, message_type } = req.body;
    const fileUrl = req.file ? `/uploads/chat/${req.file.filename}` : null;
    const fileName = req.file ? req.file.originalname : null;
    const fileSize = req.file ? req.file.size : null;
    
    const client = await pool.connect();
    try {
        const result = await client.query(`
            INSERT INTO chat_messages (conversation_id, sender_type, sender_id, message, message_type, file_url, file_name, file_size)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [conversation_id, sender_type, sender_id, message, message_type || 'text', fileUrl, fileName, fileSize]);
        
        const displayMessage = message || (message_type === 'image' ? '📷 Image' : message_type === 'file' ? '📎 File' : '');
        await client.query(`
            UPDATE chat_conversations 
            SET last_message = $1, last_message_at = NOW(), updated_at = NOW()
            WHERE id = $2
        `, [displayMessage, conversation_id]);
        
        if (sender_type === 'customer') {
            await client.query(`UPDATE chat_conversations SET unread_count_p2 = unread_count_p2 + 1 WHERE id = $1`, [conversation_id]);
        } else {
            await client.query(`UPDATE chat_conversations SET unread_count_p1 = unread_count_p1 + 1 WHERE id = $1`, [conversation_id]);
        }
        
        res.json({ success: true, message: result.rows[0] });
    } catch (err) {
        console.error('Send message error:', err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        client.release();
    }
});

// Create a new conversation
router.post('/conversations', async (req, res) => {
    const { customer_id, staff_id, order_id, product_name } = req.body;
    const client = await pool.connect();
    try {
        const existing = await client.query(`
            SELECT * FROM chat_conversations 
            WHERE participant1_id = $1 AND participant1_type = 'customer'
            AND participant2_id = $2 AND participant2_type = 'staff'
            AND is_active = true
            LIMIT 1
        `, [customer_id, staff_id || 1]);
        
        if (existing.rows.length > 0) {
            return res.json({ success: true, conversation: existing.rows[0] });
        }
        
        const result = await client.query(`
            INSERT INTO chat_conversations (
                participant1_type, participant1_id, 
                participant2_type, participant2_id,
                order_id, last_message
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [
            'customer', customer_id,
            'staff', staff_id || 1,
            order_id || null,
            'Conversation started'
        ]);
        
        res.json({ success: true, conversation: result.rows[0] });
    } catch (err) {
        console.error('Create conversation error:', err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        client.release();
    }
});

// ==========================================
// TEMPLATES
// ==========================================

router.get('/templates', async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT * FROM chat_templates WHERE is_active = true ORDER BY category, title
        `);
        res.json({ success: true, templates: result.rows });
    } catch (err) {
        console.error('Get templates error:', err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        client.release();
    }
});

router.post('/templates', async (req, res) => {
    const { title, message, category, created_by } = req.body;
    const client = await pool.connect();
    try {
        const result = await client.query(`
            INSERT INTO chat_templates (title, message, category, created_by)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [title, message, category, created_by]);
        res.json({ success: true, template: result.rows[0] });
    } catch (err) {
        console.error('Create template error:', err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        client.release();
    }
});

router.put('/templates/:id', async (req, res) => {
    const { id } = req.params;
    const { title, message, category, is_active } = req.body;
    const client = await pool.connect();
    try {
        await client.query(`
            UPDATE chat_templates 
            SET title = $1, message = $2, category = $3, is_active = $4, updated_at = NOW()
            WHERE id = $5
        `, [title, message, category, is_active, id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Update template error:', err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        client.release();
    }
});

router.delete('/templates/:id', async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('DELETE FROM chat_templates WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Delete template error:', err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        client.release();
    }
});

module.exports = router;
