const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();
const User = require('./models/User');

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB successfully.');

    // Check if admin already exists
    const adminExists = await User.findOne({ email: 'admin@fundflow.com' });
    
    if (adminExists) {
      console.log('Admin user already exists!');
      console.log('Email: admin@fundflow.com');
      process.exit();
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    // Create Admin User
    const adminUser = new User({
      name: 'System Admin',
      email: 'admin@fundflow.com',
      password: hashedPassword,
      role: 'admin',
      credits: 0,
      photoURL: 'https://i.ibb.co/313yMbd/admin-avatar.jpg'
    });

    await adminUser.save();
    
    console.log('✅ Admin user created successfully!');
    console.log('--------------------------------');
    console.log('Email: admin@fundflow.com');
    console.log('Password: admin123');
    console.log('--------------------------------');

    process.exit();
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
};

seedAdmin();
