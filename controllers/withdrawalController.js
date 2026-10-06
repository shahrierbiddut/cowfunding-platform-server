const Withdrawal = require('../models/Withdrawal');
const User = require('../models/User');
const mongoose = require('mongoose');

exports.createWithdrawalRequest = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { withdrawal_credit, payment_system, account_number } = req.body;
    
    if (withdrawal_credit < 200) {
      throw new Error('Minimum withdrawal is 200 credits ($10)');
    }
    
    const user = await User.findById(req.user.id).session(session);
    if (user.credits < withdrawal_credit) {
      throw new Error('Insufficient credits in your wallet');
    }

    // Deduct credits immediately
    user.credits -= withdrawal_credit;
    await user.save({ session });

    // Calculate dollar amount (20 credits = $1)
    const withdrawal_amount = withdrawal_credit / 20;

    const withdrawal = new Withdrawal({
      creator_email: user.email,
      creator_name: user.name,
      withdrawal_credit,
      withdrawal_amount,
      payment_system,
      account_number,
      status: 'pending'
    });

    await withdrawal.save({ session });
    
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ success: true, message: 'Withdrawal request submitted to admin', data: withdrawal });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getMyWithdrawals = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const withdrawals = await Withdrawal.find({ creator_email: user.email }).sort({ createdAt: -1 });
    res.status(200).json(withdrawals);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.getAllWithdrawals = async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find().sort({ createdAt: -1 });
    res.status(200).json(withdrawals);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.updateWithdrawalStatus = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { status } = req.body;
    
    // Check if idempotent (prevent double approve/reject)
    const existingWithdrawal = await Withdrawal.findById(req.params.id).session(session);
    if (!existingWithdrawal) {
      throw new Error('Withdrawal not found');
    }
    if (existingWithdrawal.status !== 'pending') {
       throw new Error('Withdrawal is already processed');
    }

    const withdrawal = await Withdrawal.findByIdAndUpdate(req.params.id, { status }, { new: true, session });
    
    if (status === 'rejected') {
      // Refund credits to user
      const user = await User.findOne({ email: withdrawal.creator_email }).session(session);
      if (user) {
        user.credits += withdrawal.withdrawal_credit;
        await user.save({ session });
      }
    }

    const Notification = require('../models/Notification');
    const note = new Notification({
      message: `Your withdrawal request of ${withdrawal.withdrawal_credit}C ($${withdrawal.withdrawal_amount}) has been ${status}.`,
      toEmail: withdrawal.creator_email,
      actionRoute: '/dashboard/creator/withdrawals'
    });
    await note.save({ session });
    
    // Log Activity
    const Activity = require('../models/Activity');
    await Activity.create([{
      adminId: req.user.id,
      adminEmail: req.user.email || 'admin@fundflow.com',
      adminName: 'Admin',
      action: status === 'approved' ? 'Approved Withdrawal' : 'Rejected Withdrawal',
      targetType: 'withdrawal',
      targetId: withdrawal._id.toString(),
      description: `Admin ${status} withdrawal of ${withdrawal.withdrawal_credit}C for ${withdrawal.creator_email}`
    }], { session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json(withdrawal);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
