const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    targetAmount: { type: Number, required: true },
    raisedAmount: { type: Number, default: 0 },
    minimumContribution: { type: Number, default: 1 },
    deadline: { type: Date, required: true },
    image: { type: String, required: true },
    category: { type: String, required: true },
    rewardInfo: { type: String },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    creatorEmail: { type: String, required: true },
    creatorName: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'completed', 'cancelled'], default: 'pending' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Campaign', campaignSchema);
