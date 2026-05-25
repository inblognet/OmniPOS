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

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// ==========================================
// CONVERSATION MANAGEMENT
// ==========================================

// Get or create conversation
router.post('/conversations', async (req, res) => {
    const { customer_id, staff_id, product_id, product_name, product_price, product_image } = req.body;
    
    const client = await pool.connect();
    try {
        // Check if conversation exists
        let query = `
            SELECT * FROM mobile_chat_conversations 
            WHERE customer_id = $1 
        `;
        let params = [customer_id];
        
        if (staff_id) {
            query += ` AND staff_id = $2`;
            params.push(staff_id);
        }
        
        if (product_id) {
            query += ` AND product_id = $3`;
            params.push(product_id);
        }
        
        query += ` ORDER BY id DESC LIMIT 1`;
        
        let existing = await client.query(query, params);
        
        if (existing.rows.length > 0) {
            return res.json({ success: true, conversation: existing.rows[0] });
        }
        
        // Create new conversation
        const result = await client.query(`
            INSERT INTO mobile_chat_conversations (customer_id, staff_id, product_id, product_name, product_price, product_image)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [customer_id, staff_id || null, product_id || null, product_name || null, product_price || null, product_image || null]);
        
        res.json({ success: true, conversation: result.rows[0] });
    } catch (err) {
        console.error('Conversation error:', err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        client.release();
    }
});

// Get all conversations for staff
router.get('/staff/conversations', async (req, res) => {
    const client = await pool.connect();
    
    try {
        const result = await client.query(`
            SELECT 
                c.*,
                cust.name as customer_name,
                cust.email as customer_email,
                COALESCE(cust.total_spend, 0) as customer_total_spend,
                (SELECT COUNT(*) FROM mobile_chat_messages WHERE conversation_id = c.id AND sender_type = 'customer' AND is_read = false) as unread_count
            FROM mobile_chat_conversations c
            JOIN customers cust ON c.customer_id = cust.id
            ORDER BY c.last_message_at DESC NULLS LAST
        `);
        
        res.json({ success: true, conversations: result.rows });
    } catch (err) {
        console.error('Staff conversations error:', err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        client.release();
    }
});

// Get conversations for customer
router.get('/customer/conversations/:customerId', async (req, res) => {
    const { customerId } = req.params;
    const client = await pool.connect();
    
    try {
        const result = await client.query(`
            SELECT 
                c.*,
                u.name as staff_name,
                (SELECT COUNT(*) FROM mobile_chat_messages WHERE conversation_id = c.id AND sender_type = 'staff' AND is_read = false) as unread_count
            FROM mobile_chat_conversations c
            LEFT JOIN users u ON c.staff_id = u.id
            WHERE c.customer_id = $1
            ORDER BY c.last_message_at DESC NULLS LAST
        `, [customerId]);
        
        res.json({ success: true, conversations: result.rows });
    } catch (err) {
        console.error('Customer conversations error:', err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        client.release();
    }
});

// ==========================================
// MESSAGES
// ==========================================

// Send message with file upload
router.post('/messages', upload.single('file'), async (req, res) => {
    const { conversation_id, sender_type, sender_id, message, message_type, reply_to_id } = req.body;
    const client = await pool.connect();
    
    try {
        const fileUrl = req.file ? `/uploads/chat/${req.file.filename}` : null;
        const fileName = req.file ? req.file.originalname : null;
        const fileSize = req.file ? req.file.size : null;
        
        const result = await client.query(`
            INSERT INTO mobile_chat_messages (conversation_id, sender_type, sender_id, message, message_type, file_url, file_name, file_size, reply_to_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `, [conversation_id, sender_type, sender_id, message, message_type || 'text', fileUrl, fileName, fileSize, reply_to_id || null]);
        
        // Update conversation last message
        await client.query(`
            UPDATE mobile_chat_conversations 
            SET last_message = $1, last_message_at = NOW(), updated_at = NOW()
            WHERE id = $2
        `, [message || (message_type === 'image' ? '📷 Image' : message_type === 'file' ? '📎 File' : '🎤 Voice message'), conversation_id]);
        
        // Increment unread count for other party
        if (sender_type === 'customer') {
            await client.query(`UPDATE mobile_chat_conversations SET staff_unread = staff_unread + 1 WHERE id = $1`, [conversation_id]);
        } else {
            await client.query(`UPDATE mobile_chat_conversations SET customer_unread = customer_unread + 1 WHERE id = $1`, [conversation_id]);
        }
        
        res.json({ success: true, message: result.rows[0] });
    } catch (err) {
        console.error('Send message error:', err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        client.release();
    }
});

// Get messages for conversation
router.get('/messages/:conversationId', async (req, res) => {
    const { conversationId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    const client = await pool.connect();
    
    try {
        const result = await client.query(`
            SELECT * FROM mobile_chat_messages 
            WHERE conversation_id = $1 AND is_deleted = false
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        `, [conversationId, limit, offset]);
        
        // Mark messages as read
        await client.query(`
            UPDATE mobile_chat_messages 
            SET is_read = true, read_at = NOW()
            WHERE conversation_id = $1 AND is_read = false
        `, [conversationId]);
        
        // Reset unread counts
        await client.query(`
            UPDATE mobile_chat_conversations 
            SET customer_unread = 0, staff_unread = 0
            WHERE id = $1
        `, [conversationId]);
        
        res.json({ success: true, messages: result.rows.reverse() });
    } catch (err) {
        console.error('Get messages error:', err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        client.release();
    }
});

// Delete message (admin only)
router.delete('/messages/:messageId', async (req, res) => {
    const { messageId } = req.params;
    const { deleted_by } = req.body;
    const client = await pool.connect();
    
    try {
        await client.query(`
            UPDATE mobile_chat_messages 
            SET is_deleted = true, deleted_by = $1
            WHERE id = $2
        `, [deleted_by, messageId]);
        
        res.json({ success: true });
    } catch (err) {
        console.error('Delete message error:', err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        client.release();
    }
});

// ==========================================
// TEMPLATES (Pre-defined messages)
// ==========================================

// Get all templates
router.get('/templates', async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT * FROM mobile_chat_templates WHERE is_active = true ORDER BY category, title
        `);
        res.json({ success: true, templates: result.rows });
    } catch (err) {
        console.error('Get templates error:', err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        client.release();
    }
});

// Create template
router.post('/templates', async (req, res) => {
    const { title, message, category, created_by } = req.body;
    const client = await pool.connect();
    
    try {
        const result = await client.query(`
            INSERT INTO mobile_chat_templates (title, message, category, created_by)
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

// Update template
router.put('/templates/:id', async (req, res) => {
    const { id } = req.params;
    const { title, message, category, is_active } = req.body;
    const client = await pool.connect();
    
    try {
        await client.query(`
            UPDATE mobile_chat_templates 
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

// Delete template
router.delete('/templates/:id', async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('DELETE FROM mobile_chat_templates WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Delete template error:', err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        client.release();
    }
});

// ==========================================
// SCHEDULED MESSAGES
// ==========================================

// Create scheduled message
router.post('/scheduled-messages', async (req, res) => {
    const { title, message, send_to, scheduled_for, created_by } = req.body;
    const client = await pool.connect();
    
    try {
        const result = await client.query(`
            INSERT INTO mobile_chat_scheduled_messages (title, message, send_to, scheduled_for, created_by)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [title, message, send_to, scheduled_for, created_by]);
        
        res.json({ success: true, scheduled: result.rows[0] });
    } catch (err) {
        console.error('Create scheduled message error:', err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        client.release();
    }
});

// Get scheduled messages
router.get('/scheduled-messages', async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT * FROM mobile_chat_scheduled_messages 
            ORDER BY scheduled_for DESC
        `);
        res.json({ success: true, scheduled: result.rows });
    } catch (err) {
        console.error('Get scheduled messages error:', err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        client.release();
    }
});

// ==========================================
// CUSTOMER SEGMENTS
// ==========================================

// Get customer segments
router.get('/customer-segments', async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT * FROM mobile_chat_customer_segments ORDER BY name
        `);
        
        // Update customer counts
        for (const segment of result.rows) {
            const conditions = segment.conditions;
            let query = 'SELECT COUNT(*) FROM customers WHERE 1=1';
            
            if (conditions?.total_spend) {
                query += ` AND total_spend >= ${conditions.total_spend.replace('>', '')}`;
            }
            if (conditions?.loyalty_points) {
                query += ` AND loyalty_points >= ${conditions.loyalty_points.replace('>', '')}`;
            }
            
            const count = await client.query(query);
            await client.query('UPDATE mobile_chat_customer_segments SET customer_count = $1 WHERE id = $2', [parseInt(count.rows[0].count), segment.id]);
        }
        
        res.json({ success: true, segments: result.rows });
    } catch (err) {
        console.error('Get segments error:', err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        client.release();
    }
});

module.exports = router;
