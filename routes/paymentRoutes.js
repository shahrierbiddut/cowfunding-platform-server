const express = require('express');
const router = express.Router();
const { createCheckoutSession, verifyPayment, getMyPayments } = require('../controllers/paymentController');
const { verifyToken, verifySupporter } = require('../middlewares/authMiddleware');

router.post('/create-checkout-session', verifyToken, verifySupporter, createCheckoutSession);
router.post('/verify', verifyToken, verifySupporter, verifyPayment);
router.get('/my', verifyToken, verifySupporter, getMyPayments);

module.exports = router;
