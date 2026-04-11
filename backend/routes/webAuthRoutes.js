const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt'); // <-- Added bcrypt to handle hashed passwords!
const { pool } = require('../config/db');

// POST /api/web/auth/register
router.post('/register', async (req, res) => {
    const { name, email, phone, password } = req.body;
    const client = await pool.connect();

    try {
        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: "Name, email, and password are required." });
        }

        const existingUser = await client.query('SELECT * FROM customers WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
             return res.status(400).json({ success: false, message: "Email already registered." });
        }

        // Note: For production, we will add bcrypt hashing later.
        const result = await client.query(
            `INSERT INTO customers (name, email, phone, password_hash, points)
             VALUES ($1, $2, $3, $4, 0) RETURNING id, name, email, points`,
            [name, email, phone || null, password]
        );

        res.json({ success: true, user: result.rows[0], message: "Registration successful!" });
    } catch (error) {
        console.error("Registration Error:", error);
        res.status(500).json({ success: false, message: "Registration failed." });
    } finally {
        client.release();
    }
});

// ==========================================
// DUAL LOGIN SYSTEM
// ==========================================

// POST /api/web/auth/login/customer
router.post('/login/customer', async (req, res) => {
    const { email, password } = req.body;
    const client = await pool.connect();

    try {
        const result = await client.query('SELECT * FROM customers WHERE email = $1', [email]);

        if (result.rows.length === 0) {
             return res.status(401).json({ success: false, message: "Invalid email or password." });
        }

        const user = result.rows[0];

        // Customers are currently using plaintext password_hash column based on previous code
        if (user.password_hash !== password) {
             return res.status(401).json({ success: false, message: "Invalid email or password." });
        }

        res.json({
            success: true,
            user: { id: user.id, name: user.name, email: user.email, points: user.points },
            message: "Login successful!"
        });

    } catch (error) {
        console.error("Customer Login Error:", error);
        res.status(500).json({ success: false, message: "Login failed." });
    } finally {
        client.release();
    }
});

// POST /api/web/auth/login/employee
router.post('/login/employee', async (req, res) => {
    const { email, password } = req.body;
    const client = await pool.connect();

    try {
        // 1. Find the admin by email FIRST (Don't check password in SQL)
        const result = await client.query('SELECT * FROM users WHERE email = $1', [email]);

        if (result.rows.length > 0) {
            const adminUser = result.rows[0];

            // 2. Use bcrypt to compare the typed password with the hashed password in the DB
            const isMatch = await bcrypt.compare(password, adminUser.password);

            if (isMatch) {
                res.json({
                    success: true,
                    user: { id: adminUser.id, name: adminUser.name, email: adminUser.email, role: adminUser.role },
                    message: "Admin access granted"
                });
            } else {
                res.status(401).json({ success: false, message: "Invalid admin credentials." });
            }
        } else {
            res.status(401).json({ success: false, message: "Invalid admin credentials." });
        }
    } catch (error) {
        console.error("Employee Login Error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    } finally {
        client.release();
    }
});

// Fallback for older code just in case it's still looking for /login exactly
router.post('/login', async (req, res) => {
    req.url = '/login/customer';
    router.handle(req, res);
});

module.exports = router;