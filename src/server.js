/**
 * server.js
 * 
 * This is the main entry point for the PollBuilder Express application.
 * It sets up the Express app, initializes services and storage, configures middleware,
 * registers API routes, defines error handling, and starts the HTTP server.
 */

import express from 'express';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url'; 
// Route handlers
import { createUserRoutes } from './routes/userRoutes.js';
import { createPollRoutes } from './routes/pollRoutes.js';
// Service layer
import { UserService } from './services/UserService.js';
import { PollService } from './services/PollService.js';
// Storage layer implementations
import { JsonFileUserStorage } from './storage/JsonFileUserStorage.js';
import { JsonFilePollStorage } from './storage/JsonFilePollStorage.js';

// --- Setup ---

// Determine the directory name in an ES Module context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Define the path to the data directory relative to this file
const dataDir = path.join(__dirname, '..', 'data');

// --- Initialization ---

// Create the Express application instance
const app = express();

// Create storage instances, providing the data directory path
// These instances handle reading/writing user and poll data from/to JSON files.
const userStorage = new JsonFileUserStorage(dataDir);
const pollStorage = new JsonFilePollStorage(dataDir);

// Create service instances, injecting storage dependencies
// Services contain the core business logic.
const userService = new UserService(userStorage);
const pollService = new PollService(pollStorage, userService); // PollService depends on both storages via UserService

// Store service instances in app.locals for easy access within route handlers
// This avoids needing to pass services down through middleware chains explicitly.
app.locals.userService = userService;
app.locals.pollService = pollService;

// --- Middleware ---

// Parse incoming JSON request bodies. Makes `req.body` available.
app.use(express.json());

// Simple request logger middleware (runs only in non-production environments)
// Logs the HTTP method and URL of each incoming request to the console.
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
    next(); // Pass control to the next middleware/route handler
  });
}

// --- API Routes ---

// Mount the user-related routes under the '/users' path prefix
app.use('/users', createUserRoutes(userService));
// Mount the poll-related routes under the '/polls' path prefix
app.use('/polls', createPollRoutes(pollService));

// --- Error Handling ---

// Catch-all error handler middleware. Must be defined *after* all routes.
// Express identifies it as an error handler by its four arguments (err, req, res, next).
// @ts-ignore (Ignoring potential type mismatch for Express error handler signature)
app.use((err, req, res, next) => {
  // Log the full error stack trace to the console for debugging
  console.error("Unhandled Error:", err.stack || err);
  
  // Send a generic 500 Internal Server Error response to the client
  res.status(500).json({
    error: 'Internal server error',
    // Optionally include the error message in development for easier debugging
    message: process.env.NODE_ENV === 'development' ? err.message : undefined 
  });
});

// 404 Not Found handler. Placed after all valid routes and the main error handler.
// If no route matches and no error occurred previously, this middleware runs.
app.use((req, res) => {
  res.status(404).json({ error: `Not Found: Cannot ${req.method} ${req.originalUrl}` });
});

// --- Server Start/Stop ---

// Define the port the server will listen on. Use environment variable or default to 3000.
const PORT = process.env.PORT || 3000;

/**
 * Starts the Express server, listening on the configured port.
 * Initializes storage layers before starting the listener.
 * 
 * @async
 * @returns {Promise<{baseURL: string, server: import('http').Server}>} A promise resolving to an object containing the base URL and the Node.js HTTP server instance.
 * @throws {Error} If storage initialization fails or the server fails to listen.
 */
export async function start() {
  try {
    // Ensure storage is initialized before accepting requests
    // Run initializations concurrently
    await Promise.all([
        userStorage.initialize(),
        pollStorage.initialize()
    ]);
    console.log('Storage initialized successfully.');

    // Return a promise that resolves when the server is listening
    return new Promise((resolve, reject) => {
      const server = app.listen(PORT, () => {
        const address = server.address();
        // Handle cases where address might be null or a string (like a pipe/socket)
        const port = typeof address === 'object' && address !== null ? address.port : PORT;
        const baseURL = `http://localhost:${port}`;
        console.log(`Server running at ${baseURL}`);
        
        // Store server instance in app.locals for the stop function
        app.locals.server = server; 
        
        resolve({ baseURL, server }); // Resolve with info
      });

      // Handle server startup errors (e.g., port already in use)
      server.on('error', (err) => {
        console.error('Server startup error:', err);
        reject(err);
      });
    });
  } catch (initError) {
      console.error('Failed to initialize application before starting server:', initError);
      // Propagate initialization error
      throw initError; 
  }
}

/**
 * Stops the currently running Express server.
 * 
 * @returns {Promise<void>} A promise that resolves when the server has successfully closed, or rejects if an error occurs during closing.
 */
export function stop() {
  return new Promise((resolve, reject) => {
    const server = app.locals.server;
    if (!server) {
      // If server wasn't started or already stopped, resolve immediately
      console.log('Server stop called, but no server instance found.');
      return resolve();
    }
    
    console.log('Attempting to stop the server...');
    server.close((err) => {
      if (err) {
        console.error('Error stopping the server:', err);
        return reject(err);
      }
      console.log('Server stopped successfully.');
      // Clear the stored server instance
      delete app.locals.server; 
      resolve();
    });
  });
}

// --- Direct Execution ---

// Check if this script is being run directly (e.g., `node src/server.js`)
// and not just imported as a module.
// `import.meta.url` gives the URL of the current module.
// `pathToFileURL(process.argv[1]).href` gives the URL of the script executed by Node.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    console.log('Running server directly...');
    // Start the server and log any unhandled errors during startup
    start().catch(error => {
        console.error('Failed to start server:', error);
        process.exit(1); // Exit with an error code if startup fails
    });

    // Graceful shutdown handling
    const shutdown = async (signal) => {
        console.log(`\nReceived ${signal}. Shutting down gracefully...`);
        try {
            await stop();
            console.log('Server shutdown complete.');
            process.exit(0);
        } catch (err) {
            console.error('Error during graceful shutdown:', err);
            process.exit(1);
        }
    };

    process.on('SIGINT', () => shutdown('SIGINT')); // Ctrl+C
    process.on('SIGTERM', () => shutdown('SIGTERM')); // Termination signal
}