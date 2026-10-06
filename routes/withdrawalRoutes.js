const express = require('express');
const router = express.Router();
const { createWithdrawalRequest, getMyWithdrawals, getAllWithdrawals, updateWithdrawalStatus } = require('../controllers/withdrawalController');
const { verifyToken, verifyCreator, verifyAdmin } = require('../middlewares/authMiddleware');

router.post('/', verifyToken, verifyCreator, createWithdrawalRequest);
router.get('/my', verifyToken, verifyCreator, getMyWithdrawals);
router.get('/', verifyToken, verifyAdmin, getAllWithdrawals);
router.patch('/:id/status', verifyToken, verifyAdmin, updateWithdrawalStatus);

module.exports = router;
