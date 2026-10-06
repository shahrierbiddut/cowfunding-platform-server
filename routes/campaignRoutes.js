const express = require('express');
const router = express.Router();
const { getAllCampaigns, getCampaignById, createCampaign, getMyCampaigns, updateCampaignStatus, updateCampaign, deleteCampaign } = require('../controllers/campaignController');
const { verifyToken, verifyCreator, verifyAdmin } = require('../middlewares/authMiddleware');

router.get('/', getAllCampaigns);
router.get('/my', verifyToken, verifyCreator, getMyCampaigns);
router.get('/:id', getCampaignById);
router.post('/', verifyToken, verifyCreator, createCampaign);
router.put('/:id', verifyToken, verifyCreator, updateCampaign);
router.delete('/:id', verifyToken, verifyCreator, deleteCampaign);
router.patch('/:id/status', verifyToken, verifyAdmin, updateCampaignStatus);

module.exports = router;
