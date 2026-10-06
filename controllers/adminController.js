const User = require('../models/User');
const Campaign = require('../models/Campaign');
const Payment = require('../models/Payment');
const Withdrawal = require('../models/Withdrawal');
const Report = require('../models/Report');
const Contribution = require('../models/Contribution');
const Activity = require('../models/Activity');

// @desc    Get dashboard aggregate statistics
// @route   GET /api/admin/stats
// @access  Private/Admin
exports.getAdminStats = async (req, res) => {
  try {
    const totalSupporters = await User.countDocuments({ role: 'supporter' });
    const totalCreators = await User.countDocuments({ role: 'creator' });
    
    const creditsData = await User.aggregate([
      { $group: { _id: null, total: { $sum: '$credits' } } }
    ]);
    const availableCredits = creditsData.length > 0 ? creditsData[0].total : 0;

    const paymentsData = await Payment.aggregate([
      { $match: { status: 'succeeded' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalPaymentsProcessed = paymentsData.length > 0 ? paymentsData[0].total : 0;

    // Platform Health Secondary Stats
    const totalCampaigns = await Campaign.countDocuments();
    const activeCampaigns = await Campaign.countDocuments({ status: 'approved', deadline: { $gt: new Date() } });
    const pendingCampaigns = await Campaign.countDocuments({ status: 'pending' });
    const completedCampaigns = await Campaign.countDocuments({ status: 'completed' });
    const rejectedCampaigns = await Campaign.countDocuments({ status: 'rejected' });
    const reportedCampaigns = await Report.countDocuments({ status: 'pending' });
    const pendingWithdrawals = await Withdrawal.countDocuments({ status: 'pending' });

    res.status(200).json({
      primary: {
        totalSupporters,
        totalCreators,
        availableCredits,
        totalPaymentsProcessed
      },
      secondary: {
        totalCampaigns,
        activeCampaigns,
        pendingCampaigns,
        completedCampaigns,
        rejectedCampaigns,
        reportedCampaigns,
        pendingWithdrawals
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get analytics chart data (Funding and Revenue)
// @route   GET /api/admin/analytics
// @access  Private/Admin
exports.getAdminAnalytics = async (req, res) => {
  try {
    // For simplicity, returning mock series data mapped to timeframes.
    // In a full production scale, you would use MongoDB $group by date (day/month/year).
    const fundingData = [
      { name: 'Mon', total: 4200 },
      { name: 'Tue', total: 5800 },
      { name: 'Wed', total: 7400 },
      { name: 'Thu', total: 6900 },
      { name: 'Fri', total: 9200 },
      { name: 'Sat', total: 11400 },
      { name: 'Sun', total: 13800 }
    ];

    const categoryDistribution = await Campaign.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    
    res.status(200).json({
      fundingSeries: fundingData,
      categoryDistribution: categoryDistribution.map(c => ({
        name: c._id,
        value: c.count
      }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get detailed platform revenue
// @route   GET /api/admin/revenue
// @access  Private/Admin
exports.getAdminRevenue = async (req, res) => {
  try {
    const salesData = await Payment.aggregate([
      { $match: { status: 'succeeded' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const withdrawalData = await Withdrawal.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$withdrawal_amount' } } }
    ]);

    const grossCreditSales = salesData.length > 0 ? salesData[0].total : 0;
    const totalWithdrawals = withdrawalData.length > 0 ? withdrawalData[0].total : 0;
    // Simple revenue model: platform takes 5% off credit sales
    const platformRevenue = grossCreditSales * 0.05;
    const netRevenue = grossCreditSales - totalWithdrawals;

    res.status(200).json({
      grossCreditSales,
      totalWithdrawals,
      platformRevenue,
      netRevenue
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get all payments across platform
// @route   GET /api/admin/payments
// @access  Private/Admin
exports.getAllPayments = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const payments = await Payment.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Payment.countDocuments();

    res.status(200).json({
      data: payments,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get admin activity logs
// @route   GET /api/admin/activity
// @access  Private/Admin
exports.getAdminActivity = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const activities = await Activity.find()
      .sort({ createdAt: -1 })
      .limit(limit);
    res.status(200).json(activities);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
