const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^\+?[\d\s-()]+$/, 'Please enter a valid phone number']
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [30, 'Username cannot exceed 30 characters']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  role: {
    type: String,
    enum: ['admin', 'faculty', 'student'],
    required: [true, 'Role is required']
  },
  // Academic fields - ONLY for Faculty and Student
  department: {
    type: String,
    required: function() { return this.role === 'faculty' || this.role === 'student'; },
    trim: true,
    uppercase: true,
    validate: {
      validator: function(v) {
        // Admin should never have department
        if (this.role === 'admin') return !v;
        // Faculty and Student must have department
        return this.role === 'faculty' || this.role === 'student' ? !!v : true;
      },
      message: 'Department is required for Faculty and Student roles only'
    }
  },
  semester: {
    type: Number,
    required: function() { return this.role === 'student'; },
    min: 1,
    max: 12,
    validate: {
      validator: function(v) {
        // Only students should have semester
        if (this.role === 'student') return !!v;
        // Faculty and Admin should not have semester
        return this.role === 'faculty' || this.role === 'admin' ? !v : true;
      },
      message: 'Semester is required for Student role only'
    }
  },
  academicYear: {
    type: String,
    required: function() { return this.role === 'faculty' || this.role === 'student'; },
    trim: true,
    validate: {
      validator: function(v) {
        // Admin should never have academic year
        if (this.role === 'admin') return !v;
        // Faculty and Student must have academic year
        return this.role === 'faculty' || this.role === 'student' ? !!v : true;
      },
      message: 'Academic year is required for Faculty and Student roles only'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() { return this.role !== 'admin'; }
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function() {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return;
  
  try {
    // Hash password with cost of 8 for development (faster)
    const salt = await bcrypt.genSalt(8);
    this.password = await bcrypt.hash(this.password, salt);
    console.log('✅ Password hashed successfully');
  } catch (error) {
    console.error('❌ Password hashing error:', error);
    throw error;
  }
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to get name
userSchema.methods.getName = function() {
  return this.name;
};

// Static method to find active users by role
userSchema.statics.findActiveByRole = function(role) {
  return this.find({ role, isActive: true });
};

// Static method to get user statistics
userSchema.statics.getUserStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 },
        active: { $sum: { $cond: ['$isActive', 1, 0] } }
      }
    }
  ]);
  
  const result = {
    totalFaculties: 0,
    activeFaculties: 0,
    totalStudents: 0,
    activeStudents: 0,
    totalAdmins: 0
  };
  
  stats.forEach(stat => {
    if (stat._id === 'faculty') {
      result.totalFaculties = stat.count;
      result.activeFaculties = stat.active;
    } else if (stat._id === 'student') {
      result.totalStudents = stat.count;
      result.activeStudents = stat.active;
    } else if (stat._id === 'admin') {
      result.totalAdmins = stat.count;
    }
  });
  
  return result;
};

module.exports = mongoose.model('User', userSchema);