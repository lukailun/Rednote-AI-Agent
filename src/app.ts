import express, { Application } from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import helmet from 'helmet'; // For securing HTTP headers

import logger, { setupErrorHandlers } from './config/logger';
import { connectDB } from './config/db'; 

// Set up process-level error handlers
setupErrorHandlers();

// Initialize environment variables
dotenv.config();

const app: Application = express();

// Connect to the database
connectDB().catch(err => {
    logger.error('Failed to connect to MongoDB:', err);
    process.exit(1);
});

// Middleware setup
app.use(helmet({ xssFilter: true, noSniff: true })); // Security headers
app.use(express.json()); // JSON body parsing
app.use(express.urlencoded({ extended: true, limit: '1kb' })); // URL-encoded data
app.use(cookieParser()); // Cookie parsing

export default app;
