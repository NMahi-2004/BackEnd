const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
  academicYear: {
    type: String,
    required: [true, 'Academic year is required'],
    trim: true,
    match: [/^\d{4}[-–]\d{2,4}$/, 'Academic year must be in format YYYY-YY (e.g., 2026-27)']
  },
  departments: [{
    type: String,
    required: true,
    trim: true,
    uppercase: true
  }],
  semesters: [{
    type: Number,
    required: true,
    min: 1,
    max: 12
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Ensure only one active system settings document
systemSettingsSchema.index({ isActive: 1 }, { unique: true, partialFilterExpression: { isActive: true } });

// Static method to get current system settings
systemSettingsSchema.statics.getCurrentSettings = async function() {
  const settings = await this.findOne({ isActive: true });
  if (!settings) {
    throw new Error('System settings not configured. Please contact administrator.');
  }
  return settings;
};

// Static method to update system settings (Admin only)
systemSettingsSchema.statics.updateSettings = async function(newSettings, adminId) {
  // Deactivate current settings
  await this.updateMany({ isActive: true }, { isActive: false, updatedBy: adminId });
  
  // Create new active settings
  const settings = new this({
    ...newSettings,
    isActive: true,
    createdBy: adminId,
    updatedBy: adminId
  });
  
  return await settings.save();
};

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);