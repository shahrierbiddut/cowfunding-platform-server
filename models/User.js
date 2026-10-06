const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    photoURL: { type: String, default: '' },
    password: { type: String }, // Optional for Google Sign-in users
    role: { type: String, enum: ['supporter', 'creator', 'admin'], required: true },
    credits: { type: Number, default: 0 }, 
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
    lastActive: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
