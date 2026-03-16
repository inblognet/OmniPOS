const bcrypt = require('bcryptjs');
const db = require('../config/db');

exports.getAllUsers = async (req, res, next) => {
  try {
    // ✅ Fetch all users but DO NOT return their passwords!
    const result = await db.query('SELECT id, name, email, role FROM users ORDER BY id ASC');
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching users:", error);
    next(error); // ✅ Passed to global error handler
  }
};

exports.createUser = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const userCheck = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert new user
    const newUser = await db.query(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
      [name, email, hashedPassword, role]
    );

    res.status(201).json(newUser.rows[0]);
  } catch (error) {
    console.error("Error creating user:", error);
    next(error); // ✅ Passed to global error handler
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // ✅ Prevent the admin from deleting themselves!
    if (req.user.id === parseInt(id)) {
      return res.status(400).json({ message: 'You cannot delete your own account.' });
    }

    await db.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error("Error deleting user:", error);
    next(error); // ✅ Passed to global error handler
  }
};