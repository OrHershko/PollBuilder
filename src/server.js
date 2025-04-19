/**
 * server.js
 * 
 * This is the main server file that sets up the Express application
 * and registers all routes and middleware.
 */

import express from 'express';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url'; 
import { createUserRoutes } from './routes/userRoutes.js';
import { createPollRoutes } from './routes/pollRoutes.js';
import { UserService } from './services/UserService.js';
import { PollService } from './services/PollService.js';
import { JsonFileUserStorage } from './storage/JsonFileUserStorage.js';
import { JsonFilePollStorage } from './storage/JsonFilePollStorage.js';

// Get directory name in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');

// Create Express app
const app = express();

// Create storage instances
const userStorage = new JsonFileUserStorage(dataDir);
const pollStorage = new JsonFilePollStorage(dataDir);

// Create service instances
const userService = new UserService(userStorage);
const pollService = new PollService(pollStorage, userService);

// Store services in app locals for access in routes
app.locals.userService = userService;
app.locals.pollService = pollService;

// Middleware
app.use(express.json());

// Log requests in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });
}

// Register routes
app.use('/users', createUserRoutes(userService));
app.use('/polls', createPollRoutes(pollService));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Server configuration
const PORT = process.env.PORT || 3000;

/**
 * Start the server
 * @returns {Promise<{baseURL: string}>} - Promise resolving to server info
 */
export function start() {
  return new Promise((resolve) => {
    const server = app.listen(PORT, () => {
      const baseURL = `http://localhost:${PORT}`;
      console.log(`Server running at ${baseURL}`);
      resolve({ baseURL });
    });
    
    // Store server instance for stop function
    app.locals.server = server;
  });
}

/**
 * Stop the server
 * @returns {Promise<void>}
 */
export function stop() {
  return new Promise((resolve, reject) => {
    if (!app.locals.server) {
      return resolve();
    }
    
    app.locals.server.close((err) => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
}

// Start server if this file is run directly
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    start().catch(console.error);
}