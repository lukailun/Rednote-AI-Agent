import mongoose from 'mongoose';
import logger from './logger';

export const connectDB = async () => {
  try {
    // Check if MONGODB_URI is provided
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      logger.warn('MONGODB_URI not provided. Database connection skipped.');
      return;
    }

    await mongoose.connect(mongoUri, {
      // These options are no longer necessary
    });
    logger.info('MongoDB connected successfully');
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    
    // Don't exit the process, just log the error
    // This allows the application to continue without database
    logger.warn('Application will continue without database connection');
    
    // You can uncomment the line below if you want to exit on database connection failure
    // process.exit(1);
  }
};

// Function to check if database is connected
export const isDBConnected = () => {
  return mongoose.connection.readyState === 1;
};
