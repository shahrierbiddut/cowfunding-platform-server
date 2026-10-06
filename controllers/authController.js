const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Generate JWT Token
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @route   POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { name, email, photoURL, password, role } = req.body;

    // Check if admin is trying to register from form
    if (role === 'admin') {
      return res.status(403).json({ message: 'Admin accounts cannot be created via registration form.' });
    }

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email.' });
    }

    // Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Set Credits
    let initialCredits = 0;
    if (role === 'supporter') initialCredits = 50;
    if (role === 'creator') initialCredits = 20;

    // Create User
    const user = await User.create({
      name,
      email,
      photoURL: photoURL || '',
      password: hashedPassword,
      role,
      credits: initialCredits,
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      credits: user.credits,
      photoURL: user.photoURL,
      token: generateToken(user._id, user.role),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid email or password' });

    // If user has no password (e.g., registered via Google), block password login
    if (!user.password) {
      return res.status(401).json({ message: 'Please login using Google Sign-In.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid email or password' });

    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      credits: user.credits,
      photoURL: user.photoURL,
      token: generateToken(user._id, user.role),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   POST /api/auth/google
exports.googleSignIn = async (req, res) => {
  try {
    const { name, email, photoURL, role } = req.body; // Firebase/Google will provide this

    let user = await User.findOne({ email });

    // If user doesn't exist, create them
    if (!user) {
      // Role defaults to supporter if not provided in google login flow
      const assignedRole = role || 'supporter';
      if (assignedRole === 'admin') {
         return res.status(403).json({ message: 'Unauthorized role assignment' });
      }

      let initialCredits = 0;
      if (assignedRole === 'supporter') initialCredits = 50;
      if (assignedRole === 'creator') initialCredits = 20;

      user = await User.create({
        name,
        email,
        photoURL,
        role: assignedRole,
        credits: initialCredits,
        // No password stored
      });
    }

    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      credits: user.credits,
      photoURL: user.photoURL,
      token: generateToken(user._id, user.role),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
