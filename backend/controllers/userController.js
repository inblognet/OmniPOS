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

exports.updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, password, role } = req.body;

    // ✅ 1. Check if the new email belongs to someone else
    const emailCheck = await db.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, id]);
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Another user with this email already exists.' });
    }

    let result;

    // ✅ 2. Did the admin type a new password?
    if (password) {
      // Yes: Hash the new password and update everything
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      result = await db.query(
        'UPDATE users SET name = $1, email = $2, role = $3, password = $4 WHERE id = $5 RETURNING id, name, email, role',
        [name, email, role, hashedPassword, id]
      );
    } else {
      // No: Update name, email, and role, but LEAVE THE PASSWORD ALONE
      result = await db.query(
        'UPDATE users SET name = $1, email = $2, role = $3 WHERE id = $4 RETURNING id, name, email, role',
        [name, email, role, id]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // ✅ 3. Return the updated user info to the frontend
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating user:", error);
    next(error); // ✅ Passed to your global error handler
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