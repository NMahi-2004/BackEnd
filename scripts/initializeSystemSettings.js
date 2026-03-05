const mongoose = require('mongoose');
const dotenv = require('dotenv');
const SystemSettings = require('../models/SystemSettings');
const User = require('../models/User');

// Load environment variables
dotenv.config();

const initializeSystemSettings = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Get admin user
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.error('❌ Admin user not found. Please run resetAdmin.js first.');
      return;
    }

    // Check if system settings already exist
    const existingSettings = await SystemSettings.findOne({ isActive: true });
    if (existingSettings) {
      console.log('✅ System settings already exist');
      console.log('Academic Year:', existingSettings.academicYear);
      console.log('Departments:', existingSettings.departments);
      console.log('Semesters:', existingSettings.semesters);
      return;
    }

    // Create default system settings
    const defaultSettings = new SystemSettings({
      academicYear: '2026-27',
      departments: ['CSE', 'ECE', 'MECH', 'IT', 'CIVIL'],
      semesters: [1, 2, 3, 4, 5, 6, 7, 8],
      isActive: true,
      createdBy: admin._id,
      updatedBy: admin._id
    });

    await defaultSettings.save();

    console.log('✅ Default system settings created successfully!');
    console.log('Academic Year: 2026-27');
    console.log('Departments: CSE, ECE, MECH, IT, CIVIL');
    console.log('Semesters: 1, 2, 3, 4, 5, 6, 7, 8');
    console.log('');
    console.log('🎯 Admin can now manage these settings via /admin/settings');

  } catch (error) {
    console.error('Error initializing system settings:', error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
};

initializeSystemSettings();