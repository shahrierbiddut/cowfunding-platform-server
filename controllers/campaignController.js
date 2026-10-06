const Campaign = require('../models/Campaign');
const User = require('../models/User');
const Contribution = require('../models/Contribution');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');

exports.getAllCampaigns = async (req, res) => {
  try {
    const { status } = req.query;
    let query = {};
    if (status) query.status = status;
    
    // If fetching approved campaigns (for explore), only show active ones
    if (status === 'approved') {
      query.deadline = { $gt: new Date() };
    }
    
    const campaigns = await Campaign.find(query).sort({ createdAt: -1 });
    res.status(200).json(campaigns);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.getCampaignById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Invalid Campaign ID format' });
    }
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    res.status(200).json(campaign);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.createCampaign = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    const campaignData = {
      ...req.body,
      creator: user._id,
      creatorEmail: user.email,
      creatorName: user.name,
      status: 'pending' // Admin must approve
    };

    const newCampaign = new Campaign(campaignData);
    await newCampaign.save();
    
    res.status(201).json({ success: true, data: newCampaign, message: 'Campaign submitted for approval' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.getMyCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find({ creator: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json(campaigns);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.updateCampaignStatus = async (req, res) => {
  try {
    const campaign = await Campaign.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    
    // Log the activity
    const Activity = require('../models/Activity');
    await Activity.create({
      adminId: req.user.id,
      adminEmail: req.user.email || 'admin@fundflow.com',
      adminName: 'Admin',
      action: req.body.status === 'approved' ? 'Approved Campaign' : 'Rejected Campaign',
      targetType: 'campaign',
      targetId: campaign._id.toString(),
      description: `Admin ${req.body.status} campaign "${campaign.title}"`
    });

    res.status(200).json(campaign);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.updateCampaign = async (req, res) => {
  try {
    const { title, description, rewardInfo } = req.body;
    
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    
    // Check ownership
    if (campaign.creator.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized. Only the creator can update this.' });
    }

    campaign.title = title || campaign.title;
    campaign.description = description || campaign.description;
    campaign.rewardInfo = rewardInfo || campaign.rewardInfo;

    await campaign.save();

    res.status(200).json({ success: true, data: campaign, message: 'Campaign updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.deleteCampaign = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const campaign = await Campaign.findById(req.params.id).session(session);
    if (!campaign) throw new Error('Campaign not found');

    // Check ownership or if user is admin
    if (campaign.creator.toString() !== req.user.id && req.user.role !== 'admin') {
      throw new Error('Unauthorized. Only the creator or admin can delete this.');
    }

    if (req.user.role === 'admin') {
       const Activity = require('../models/Activity');
       await Activity.create({
         adminId: req.user.id,
         adminEmail: req.user.email || 'admin@fundflow.com',
         adminName: 'Admin',
         action: 'Deleted Campaign',
         targetType: 'campaign',
         targetId: campaign._id.toString(),
         description: `Admin deleted campaign "${campaign.title}"`
       });
    }

    // Process refunds for approved contributions
    const contributions = await Contribution.find({ 
      campaign_id: campaign._id,
      status: 'approved' 
    }).session(session);

    for (const contribution of contributions) {
      // Refund the supporter
      const supporter = await User.findOne({ email: contribution.supporter_email }).session(session);
      if (supporter) {
        supporter.credits += contribution.contribution_amount;
        await supporter.save({ session });
        
        // Notify the supporter
        const note = new Notification({
          message: `The campaign "${campaign.title}" was deleted by the creator. Your contribution of ${contribution.contribution_amount}C has been refunded to your wallet.`,
          toEmail: supporter.email,
          actionRoute: '/dashboard/supporter'
        });
        await note.save({ session });
      }

      // Mark contribution as refunded
      contribution.status = 'refunded';
      await contribution.save({ session });
    }

    // Finally delete the campaign
    await Campaign.findByIdAndDelete(req.params.id).session(session);

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ success: true, message: 'Campaign deleted and all contributions refunded.' });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ message: error.message || 'Server Error' });
  }
};
