const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// ✅ ONLY Admins are allowed to access these routes!
router.use(protect, authorizeRoles('admin'));

// GET /api/users - Get all staff
router.get('/', userController.getAllUsers);

// POST /api/users - Add a new staff member
router.post('/', userController.createUser);

// ✅ NEW: PUT /api/users/:id - Update an existing staff member
router.put('/:id', userController.updateUser);

// DELETE /api/users/:id - Delete a staff member
router.delete('/:id', userController.deleteUser);

module.exports = router;