const express = require('express');
const router = express.Router();
const { pool } = require('../config/db'); // Adjust path if your db.js is elsewhere

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

// POST /api/web/auth/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const client = await pool.connect();

    try {
        const result = await client.query('SELECT * FROM customers WHERE email = $1', [email]);

        if (result.rows.length === 0) {
             return res.status(401).json({ success: false, message: "Invalid email or password." });
        }

        const user = result.rows[0];

        if (user.password_hash !== password) {
             return res.status(401).json({ success: false, message: "Invalid email or password." });
        }

        res.json({
            success: true,
            user: { id: user.id, name: user.name, email: user.email, points: user.points },
            message: "Login successful!"
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ success: false, message: "Login failed." });
    } finally {
        client.release();
    }
});

module.exports = router;