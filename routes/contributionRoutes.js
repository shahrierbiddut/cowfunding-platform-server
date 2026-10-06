const express = require('express');
const router = express.Router();
const { createContribution, getMyContributions, getCreatorContributions, updateContributionStatus } = require('../controllers/contributionController');
const { verifyToken, verifySupporter, verifyCreator } = require('../middlewares/authMiddleware');

router.post('/', verifyToken, verifySupporter, createContribution);
router.get('/my', verifyToken, verifySupporter, getMyContributions);
router.get('/creator', verifyToken, verifyCreator, getCreatorContributions);
router.patch('/:id/status', verifyToken, verifyCreator, updateContributionStatus);

module.exports = router;
