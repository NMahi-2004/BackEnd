const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Debug: Log environment variable loading
    console.log('🔍 Environment check:');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('PORT:', process.env.PORT);
    console.log('MONGO_URI exists:', !!process.env.MONGO_URI);
    console.log('MONGO_URI length:', process.env.MONGO_URI ? process.env.MONGO_URI.length : 0);
    
    // Check if MONGO_URI is loaded
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI environment variable is not defined. Check your .env file.');
    }
    
    // Log connection attempt (hide password for security)
    const safeUri = process.env.MONGO_URI.replace(/:([^:@]{1,})@/, ':****@');
    console.log('🔗 Attempting to connect to:', safeUri);
    
    // Set mongoose options
    mongoose.set('strictQuery', false);
    
    // Connection options for better stability
    const options = {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      family: 4 // Use IPv4, skip trying IPv6
    };
    
    // Connect to MongoDB
    const conn = await mongoose.connect(process.env.MONGO_URI, options);
    
    console.log('✅ MongoDB Connected Successfully!');
    console.log('📍 Host:', conn.connection.host);
    console.log('🗄️  Database:', conn.connection.name);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err.message);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  MongoDB disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
    });
    
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('Error:', error.message);
    
    // Specific error handling
    if (error.message.includes('bad auth')) {
      console.error('🔐 Authentication failed. Please check:');
      console.error('   1. Username and password are correct');
      console.error('   2. User has proper database permissions');
      console.error('   3. Database name exists in connection string');
    } else if (error.message.includes('ENOTFOUND')) {
      console.error('🌐 Network error. Please check:');
      console.error('   1. Internet connection is stable');
      console.error('   2. Cluster URL is correct');
    } else if (error.message.includes('IP')) {
      console.error('🚫 IP Access error. Please check:');
      console.error('   1. Your IP is whitelisted in MongoDB Atlas');
      console.error('   2. Network Access settings in Atlas');
    } else if (error.message.includes('timeout')) {
      console.error('⏰ Connection timeout. Please check:');
      console.error('   1. Internet connection is stable');
      console.error('   2. MongoDB Atlas cluster is running');
      console.error('   3. Network firewall settings');
    }
    
    // Don't exit in development
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      console.log('🔧 Running in development mode without database connection...');
      console.log('💡 Server will continue running but database operations will fail');
    }
  }
};

module.exports = connectDB;