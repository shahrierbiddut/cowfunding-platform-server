const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema(
  {
    creator_email: { type: String, required: true },
    creator_name: { type: String, required: true },
    withdrawal_credit: { type: Number, required: true },
    withdrawal_amount: { type: Number, required: true },
    payment_system: { type: String, enum: ['Stripe', 'Bkash', 'Rocket', 'Nagad'], required: true },
    account_number: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved'], default: 'pending' },
    withdraw_date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Withdrawal', withdrawalSchema);
