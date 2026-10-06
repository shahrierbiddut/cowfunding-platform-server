const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGO_URI).then(async () => {
  const User = mongoose.model('User', new mongoose.Schema({ email: String, role: String }));
  await User.updateMany({}, { $set: { role: 'creator' } });
  console.log('Updated all users to creator');
  process.exit();
});
