const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

// Load environment variables
dotenv.config();

const seedAdmin = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.username);
      process.exit(0);
    }

    // Create admin user
    const adminUser = new User({
      name: 'System Administrator',
      email: 'admin@lms.com',
      phoneNumber: '+1234567890',
      username: 'admin',
      password: 'LMS@2024!Admin', // More secure password
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
    console.log('');
    console.log('⚠️  IMPORTANT: Change the default password after first login!');

  } catch (error) {
    console.error('Error seeding admin user:', error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
};

seedAdmin();