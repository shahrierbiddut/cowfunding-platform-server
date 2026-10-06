const Contribution = require('../models/Contribution');
const Campaign = require('../models/Campaign');
const User = require('../models/User');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');

exports.createContribution = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { campaignId, amount } = req.body;

    const campaign = await Campaign.findById(campaignId).session(session);
    if (!campaign) {
      throw new Error('Campaign not found');
    }
    if (campaign.status !== 'approved') {
      throw new Error('Campaign is not approved for contributions');
    }
    if (new Date(campaign.deadline) < new Date()) {
      throw new Error('Campaign deadline has passed');
    }
    if (amount < campaign.minimumContribution) {
      throw new Error(`Minimum contribution is ${campaign.minimumContribution} credits`);
    }

    const supporter = await User.findById(req.user.id).session(session);
    if (supporter.credits < amount) {
      throw new Error('Insufficient credits');
    }

    // Deduct credits from supporter
    supporter.credits -= amount;
    await supporter.save({ session });

    // Create contribution (pending)
    const contribution = new Contribution({
      campaign_id: campaign._id,
      campaign_title: campaign.title,
      contribution_amount: amount,
      supporter_email: supporter.email,
      supporter_name: supporter.name,
      creator_email: campaign.creatorEmail,
      creator_name: campaign.creatorName,
      status: 'pending'
    });
    
    await contribution.save({ session });

    // Create notification for creator
    const notification = new Notification({
      message: `${supporter.name} has contributed ${amount} credits to your campaign "${campaign.title}". Review it in your dashboard.`,
      toEmail: campaign.creatorEmail,
      actionRoute: '/dashboard/creator/contributions'
    });
    await notification.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ success: true, message: 'Contribution submitted and is pending approval', data: contribution });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getMyContributions = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = { supporter_email: user.email };
    
    const contributions = await Contribution.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Contribution.countDocuments(query);

    res.status(200).json({
      data: contributions,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.getCreatorContributions = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const contributions = await Contribution.find({ creator_email: user.email }).sort({ createdAt: -1 });
    res.status(200).json(contributions);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.updateContributionStatus = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { status } = req.body; // 'approved' or 'rejected'

    const contribution = await Contribution.findById(id).session(session);
    if (!contribution) throw new Error('Contribution not found');
    if (contribution.status !== 'pending') throw new Error('Contribution is already processed');

    const user = await User.findById(req.user.id);
    if (contribution.creator_email !== user.email) throw new Error('Not authorized to update this contribution');

    contribution.status = status;
    await contribution.save({ session });

    if (status === 'approved') {
      // Add funds to campaign raisedAmount
      const campaign = await Campaign.findById(contribution.campaign_id).session(session);
      campaign.raisedAmount += contribution.contribution_amount;
      await campaign.save({ session });

      // Add credits to creator
      user.credits += contribution.contribution_amount;
      await user.save({ session });
    } else if (status === 'rejected') {
      // Refund credits to supporter
      const supporter = await User.findOne({ email: contribution.supporter_email }).session(session);
      if (supporter) {
        supporter.credits += contribution.contribution_amount;
        await supporter.save({ session });
      }
    }

    // Create Notification
    const note = new Notification({
      message: `Your contribution of ${contribution.contribution_amount}C for "${contribution.campaign_title}" has been ${status}.`,
      toEmail: contribution.supporter_email,
      actionRoute: '/dashboard/supporter/contributions'
    });
    await note.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ success: true, message: `Contribution ${status}` });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ success: false, message: error.message });
  }
};
