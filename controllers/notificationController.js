const Notification = require('../models/Notification');
const User = require('../models/User');

exports.getMyNotifications = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const notifications = await Notification.find({ toEmail: user.email })
      .sort({ createdAt: -1 })
      .limit(20);
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );
    res.status(200).json(notification);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
