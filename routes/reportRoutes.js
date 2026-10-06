const express = require('express');
const router = express.Router();
const { createReport, getAllReports, updateReportStatus } = require('../controllers/reportController');
const { verifyToken, verifyAdmin } = require('../middlewares/authMiddleware');

router.post('/', verifyToken, createReport);
router.get('/', verifyToken, verifyAdmin, getAllReports);
router.patch('/:id/status', verifyToken, verifyAdmin, updateReportStatus);

module.exports = router;
