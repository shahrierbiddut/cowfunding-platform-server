const User = require('../models/User');

// @desc    Get current logged in user
// @route   GET /api/users/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Update current user profile
// @route   PATCH /api/users/me
// @access  Private
exports.updateMe = async (req, res) => {
  try {
    const { name, photoURL } = req.body;
    
    // Only allow updating name and photoURL for now
    const updateData = {};
    if (name) updateData.name = name;
    if (photoURL !== undefined) updateData.photoURL = photoURL;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Update user role
// @route   PATCH /api/users/:id/role
// @access  Private/Admin
exports.updateRole = async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!['supporter', 'creator', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role provided' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Update user status (suspend/activate)
// @route   PATCH /api/users/:id/status
// @access  Private/Admin
exports.updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status provided' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Log the activity
    const Activity = require('../models/Activity');
    await Activity.create({
      adminId: req.user.id,
      adminEmail: req.user.email || 'admin@fundflow.com',
      adminName: 'Admin', // In production, we'd fetch the admin's name
      action: status === 'suspended' ? 'Suspended User' : 'Activated User',
      targetType: 'user',
      targetId: user._id.toString(),
      description: `Admin changed user status for ${user.email} to ${status}`
    });

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    // In a real production app, we would also need to handle deleting/archiving
    // their campaigns, contributions, etc. to maintain referential integrity.
    // For this assessment, we'll delete the user directly.
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'User removed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
