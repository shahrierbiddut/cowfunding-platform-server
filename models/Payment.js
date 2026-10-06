const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    user_email: { type: String, required: true },
    user_name: { type: String, required: true },
    credits: { type: Number, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'usd' },
    payment_method: { type: String, default: 'stripe' },
    transaction_id: { type: String, required: true, unique: true },
    status: { type: String, enum: ['succeeded', 'pending', 'failed'], default: 'pending' },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
