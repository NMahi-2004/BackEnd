const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

// Load environment variables
dotenv.config();

const createTestUsers = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Get admin user ID
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.error('❌ Admin user not found. Please run resetAdmin.js first.');
      return;
    }

    // Create test faculty users
    const facultyUsers = [
      {
        name: 'Dr. John Smith',
        email: 'john.smith@university.edu',
        phoneNumber: '1234567890',
        username: 'johnsmith',
        password: 'password123',
        role: 'faculty',
        department: 'CSE',
        academicYear: '2026-27',
        isActive: true,
        createdBy: admin._id
      },
      {
        name: 'Prof. Sarah Johnson',
        email: 'sarah.johnson@university.edu',
        phoneNumber: '1234567891',
        username: 'sarahjohnson',
        password: 'password123',
        role: 'faculty',
        department: 'ECE',
        academicYear: '2026-27',
        isActive: true,
        createdBy: admin._id
      },
      {
        name: 'Dr. Michael Brown',
        email: 'michael.brown@university.edu',
        phoneNumber: '1234567892',
        username: 'michaelbrown',
        password: 'password123',
        role: 'faculty',
        department: 'MECH',
        academicYear: '2026-27',
        isActive: false,
        createdBy: admin._id
      }
    ];

    // Create test student users
    const studentUsers = [
      {
        name: 'Alice Wilson',
        email: 'alice.wilson@student.edu',
        phoneNumber: '2234567890',
        username: 'alicewilson',
        password: 'password123',
        role: 'student',
        department: 'CSE',
        academicYear: '2026-27',
        semester: 3,
        isActive: true,
        createdBy: admin._id
      },
      {
        name: 'Bob Davis',
        email: 'bob.davis@student.edu',
        phoneNumber: '2234567891',
        username: 'bobdavis',
        password: 'password123',
        role: 'student',
        department: 'ECE',
        academicYear: '2026-27',
        semester: 5,
        isActive: true,
        createdBy: admin._id
      },
      {
        name: 'Charlie Miller',
        email: 'charlie.miller@student.edu',
        phoneNumber: '2234567892',
        username: 'charliemiller',
        password: 'password123',
        role: 'student',
        department: 'CSE',
        academicYear: '2026-27',
        semester: 1,
        isActive: true,
        createdBy: admin._id
      },
      {
        name: 'Diana Garcia',
        email: 'diana.garcia@student.edu',
        phoneNumber: '2234567893',
        username: 'dianagarcia',
        password: 'password123',
        role: 'student',
        department: 'IT',
        academicYear: '2026-27',
        semester: 7,
        isActive: false,
        createdBy: admin._id
      }
    ];

    // Delete existing test users (except admin)
    await User.deleteMany({ role: { $in: ['faculty', 'student'] } });
    console.log('Deleted existing faculty and student users');

    // Create faculty users
    for (const userData of facultyUsers) {
      const user = new User(userData);
      await user.save();
      console.log(`✅ Created faculty user: ${userData.username}`);
    }

    // Create student users
    for (const userData of studentUsers) {
      const user = new User(userData);
      await user.save();
      console.log(`✅ Created student user: ${userData.username}`);
    }

    console.log('\n📊 Test users created successfully!');
    console.log('Faculty: 3 users (2 active, 1 inactive)');
    console.log('Students: 4 users (3 active, 1 inactive)');
    console.log('\nYou can now see real statistics in the admin dashboard.');

  } catch (error) {
    console.error('Error creating test users:', error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
};

createTestUsers();