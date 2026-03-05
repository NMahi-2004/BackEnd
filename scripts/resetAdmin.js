const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

// Load environment variables
dotenv.config();

const resetAdmin = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Delete existing admin user
    const deleteResult = await User.deleteOne({ role: 'admin' });
    console.log('Deleted existing admin users:', deleteResult.deletedCount);

    // Create new admin user with correct password
    const adminUser = new User({
      name: 'System Administrator',
      email: 'admin@lms.com',
      phoneNumber: '1234567890',
      username: 'admin',
      password: 'LMS@2024!Admin', // Lifelong secure password
      role: 'admin',
      isActive: true
    });

    await adminUser.save();
    console.log('✅ Admin user created successfully!');
    console.log('Username: admin');
    console.log('Password: LMS@2024!Admin');
    console.log('Name: System Administrator');
    console.log('Email: admin@lms.com');
    console.log('Role: admin');
    console.log('');
    console.log('🔐 You can now login at: /admin/auth');

  } catch (error) {
    console.error('Error resetting admin user:', error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
};

resetAdmin();