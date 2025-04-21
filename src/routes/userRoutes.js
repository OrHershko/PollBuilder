/**
 * userRoutes.js
 * 
 * This module defines the Express router for handling user-related API endpoints.
 * It maps HTTP requests (POST, GET) to the corresponding UserService methods.
 */
import express from 'express';

/**
 * Creates and configures an Express Router for user-related endpoints.
 * 
 * @param {import('../services/UserService.js').UserService} userService - An instance of the UserService to handle business logic.
 * @returns {express.Router} An Express router instance with user routes defined.
 * @throws {Error} If userService is not provided or invalid.
 */
export function createUserRoutes(userService) {
  if (!userService) {
    throw new Error('createUserRoutes requires a valid userService instance.');
  }
  const router = express.Router();

  /**
   * @route POST /users
   * @description Creates a new user. Expects a JSON body with a 'username' property.
   * @param {express.Request} req - Express request object. Body should contain { username: string }.
   * @param {express.Response} res - Express response object.
   * @param {express.NextFunction} next - Express next middleware function.
   * @returns {Promise<void>}
   * @responsestatus 201 - Created: Returns the newly created user object { id: string, username: string }.
   * @responsestatus 400 - Bad Request: If 'username' is missing, invalid, or already exists. Returns { error: string }.
   * @responsestatus 500 - Internal Server Error: If an unexpected error occurs during processing. Returns { error: string }.
   */
  router.post('/', async (req, res, next) => { // Added next for potential future use
    try {
      const { username } = req.body;
      
      // Basic input validation
      if (!username || typeof username !== 'string' || username.trim() === '') {
        // Send specific error for missing/invalid username
        return res.status(400).json({ error: 'Username is required and must be a non-empty string' });
      }
      
      // Delegate to user service
      const user = await userService.createUser(username.trim()); // Use trimmed username
      res.status(201).json(user);
    } catch (error) {
      // Handle specific errors from the service layer
      if (error.message.includes('already exists')) {
        res.status(400).json({ error: error.message });
      } else if (error.message.includes('must be a non-empty string')) { 
        // Catch validation errors from service if not caught above
        res.status(400).json({ error: error.message });
      } else {
        // Log unexpected errors and return a generic 500
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Internal server error while creating user' });
        // Optionally pass to a generic error handler: next(error);
      }
    }
  });

  /**
   * @route GET /users/:username/polls
   * @description Retrieves all polls created by a specific user.
   * @param {express.Request} req - Express request object. Params should contain 'username'.
   * @param {express.Response} res - Express response object.
   * @param {express.NextFunction} next - Express next middleware function.
   * @returns {Promise<void>}
   * @responsestatus 200 - OK: Returns an array of poll objects created by the user. Array may be empty.
   * @responsestatus 404 - Not Found: If the specified user does not exist. Returns { error: string }.
   * @responsestatus 500 - Internal Server Error: If an unexpected error occurs. Returns { error: string }.
   */
  router.get('/:username/polls', async (req, res, next) => {
    try {
      const { username } = req.params;
       if (!username) { // Should not happen with route definition, but good practice
           return res.status(400).json({ error: 'Username parameter is required.' });
       }

      // Access pollService via app.locals (assuming it's set up in server.js)
      const pollService = req.app.locals.pollService;
      if (!pollService) {
          console.error('PollService not found in app.locals');
          return res.status(500).json({ error: 'Internal server configuration error.' });
      }

      // Delegate to poll service
      const polls = await pollService.getPollsByCreator(username);
      res.status(200).json(polls);
    } catch (error) {
      // Handle specific errors from the service layer
      if (error.message.includes('does not exist')) {
        res.status(404).json({ error: error.message }); // User not found
      } else {
        // Log unexpected errors and return a generic 500
        console.error(`Error getting polls for user ${req.params.username}:`, error);
        res.status(500).json({ error: 'Internal server error while getting user polls' });
        // Optionally: next(error);
      }
    }
  });

  /**
   * @route GET /users/:username/votes
   * @description Retrieves all polls in which a specific user has voted.
   * @param {express.Request} req - Express request object. Params should contain 'username'.
   * @param {express.Response} res - Express response object.
   * @param {express.NextFunction} next - Express next middleware function.
   * @returns {Promise<void>}
   * @responsestatus 200 - OK: Returns an array of poll objects the user has voted in. Array may be empty.
   * @responsestatus 404 - Not Found: If the specified user does not exist. Returns { error: string }.
   * @responsestatus 500 - Internal Server Error: If an unexpected error occurs. Returns { error: string }.
   */
  router.get('/:username/votes', async (req, res, next) => {
    try {
      const { username } = req.params;
       if (!username) {
           return res.status(400).json({ error: 'Username parameter is required.' });
       }

      // Access pollService via app.locals
      const pollService = req.app.locals.pollService;
       if (!pollService) {
          console.error('PollService not found in app.locals');
          return res.status(500).json({ error: 'Internal server configuration error.' });
      }

      // Delegate to poll service
      const polls = await pollService.getPollsVotedByUser(username);
      res.status(200).json(polls);
    } catch (error) {
      // Handle specific errors from the service layer
      if (error.message.includes('does not exist')) {
        res.status(404).json({ error: error.message }); // User not found
      } else {
         // Log unexpected errors and return a generic 500
        console.error(`Error getting votes for user ${req.params.username}:`, error);
        res.status(500).json({ error: 'Internal server error while getting user votes' });
         // Optionally: next(error);
      }
    }
  });

  return router;
}