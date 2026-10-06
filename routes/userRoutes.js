const express = require('express');
const router = express.Router();
const {
  getMe,
  updateMe,
  getAllUsers,
  updateRole,
  updateUserStatus,
  deleteUser
} = require('../controllers/userController');
const { verifyToken, verifyAdmin } = require('../middlewares/authMiddleware');

// Protected route for all logged-in users
router.get('/me', verifyToken, getMe);
router.patch('/me', verifyToken, updateMe);

// Admin-only routes
router.get('/', verifyToken, verifyAdmin, getAllUsers);
router.patch('/:id/role', verifyToken, verifyAdmin, updateRole);
router.patch('/:id/status', verifyToken, verifyAdmin, updateUserStatus);
router.delete('/:id', verifyToken, verifyAdmin, deleteUser);

module.exports = router;
