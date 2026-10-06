const Report = require('../models/Report');
const Campaign = require('../models/Campaign');
const User = require('../models/User');

exports.createReport = async (req, res) => {
  try {
    const { campaign_id, reason } = req.body;
    
    const campaign = await Campaign.findById(campaign_id);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

    const user = await User.findById(req.user.id);

    const report = new Report({
      campaign_id,
      campaign_title: campaign.title,
      reporter_email: user.email,
      reporter_name: user.name,
      reason,
      status: 'pending'
    });

    await report.save();
    res.status(201).json({ success: true, message: 'Report submitted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.getAllReports = async (req, res) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 });
    res.status(200).json(reports);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.updateReportStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const report = await Report.findByIdAndUpdate(req.params.id, { status }, { new: true });
    
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    // Log Activity
    const Activity = require('../models/Activity');
    await Activity.create({
      adminId: req.user.id,
      adminEmail: req.user.email || 'admin@fundflow.com',
      adminName: 'Admin',
      action: `Marked Report as ${status}`,
      targetType: 'report',
      targetId: report._id.toString(),
      description: `Admin changed report status for campaign "${report.campaign_title}" to ${status}`
    });

    res.status(200).json(report);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
