const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to verify the JWT token
exports.verifyToken = (req, res, next) => {
  let token;

  // Check if token exists in the Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Extract token from 'Bearer <token>'
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Attach user info to the request object
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed or expired.' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided.' });
  }
};

// Middleware to verify if the user is a Supporter
exports.verifySupporter = (req, res, next) => {
  if (req.user && req.user.role === 'supporter') {
    next();
  } else {
    return res.status(403).json({ message: 'Access denied. Require Supporter role.' });
  }
};

// Middleware to verify if the user is a Creator
exports.verifyCreator = (req, res, next) => {
  if (req.user && req.user.role === 'creator') {
    next();
  } else {
    return res.status(403).json({ message: 'Access denied. Require Creator role.' });
  }
};

// Middleware to verify if the user is an Admin
exports.verifyAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ message: 'Access denied. Require Admin role.' });
  }
};
