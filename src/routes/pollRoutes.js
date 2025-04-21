/**
 * pollRoutes.js
 * 
 * This module defines the Express router for handling poll-related API endpoints.
 * It maps HTTP requests (POST, GET, DELETE) to the corresponding PollService methods.
 */

import express from 'express';

/**
 * Creates and configures an Express Router for poll-related endpoints.
 * 
 * @param {import('../services/PollService.js').PollService} pollService - An instance of the PollService to handle business logic.
 * @returns {express.Router} An Express router instance with poll routes defined.
 * @throws {Error} If pollService is not provided or invalid.
 */
export function createPollRoutes(pollService) {
   if (!pollService) {
    throw new Error('createPollRoutes requires a valid pollService instance.');
  }
  const router = express.Router();

  /**
   * @route POST /polls
   * @description Creates a new poll. Expects JSON body with 'question', 'options', and 'creator'.
   * @param {express.Request} req - Express request object. Body: { question: string, options: string[], creator: string }.
   * @param {express.Response} res - Express response object.
   * @param {express.NextFunction} next - Express next middleware function.
   * @returns {Promise<void>}
   * @responsestatus 201 - Created: Returns the newly created poll object.
   * @responsestatus 400 - Bad Request: If input data is missing, invalid (e.g., < 2 options, duplicate options, empty strings), or the creator doesn't exist. Returns { error: string }.
   * @responsestatus 500 - Internal Server Error: If an unexpected error occurs. Returns { error: string }.
   */
  router.post('/', async (req, res, next) => {
    try {
      const { question, options, creator } = req.body;
      
      // Basic check for required fields (more detailed validation is in the service)
      if (!question || !options || !creator) {
        return res.status(400).json({ 
          error: 'Missing required fields: question, options, and creator are required.' 
        });
      }
      
      // Delegate to poll service
      const poll = await pollService.createPoll({
        question,
        options,
        creator
      });
      
      res.status(201).json(poll);
    } catch (error) {
      // Handle specific validation/business logic errors from the service
      if (error.message.includes('does not exist') || 
          error.message.includes('must have at least') ||
          error.message.includes('must be unique') ||
          error.message.includes('must be a non-empty')) {
        res.status(400).json({ error: error.message });
      } else {
        // Log unexpected errors and return a generic 500
        console.error('Error creating poll:', error);
        res.status(500).json({ error: 'Internal server error while creating poll' });
        // Optionally: next(error);
      }
    }
  });

  /**
   * @route GET /polls
   * @description Retrieves all polls, optionally filtering by creator username.
   * @param {express.Request} req - Express request object. Query param `createdBy` (optional string).
   * @param {express.Response} res - Express response object.
   * @param {express.NextFunction} next - Express next middleware function.
   * @returns {Promise<void>}
   * @responsestatus 200 - OK: Returns an array of poll objects (filtered or all). Array may be empty.
   * @responsestatus 404 - Not Found: If filtering by a non-existent creator username. Returns { error: string }.
   * @responsestatus 500 - Internal Server Error: If an unexpected error occurs. Returns { error: string }.
   */
  router.get('/', async (req, res, next) => {
    try {
      const { createdBy } = req.query;
      let polls;

      if (createdBy && typeof createdBy === 'string') {
        // Delegate filtering to poll service
        polls = await pollService.getPollsByCreator(createdBy);
      } else {
         // Get all polls if no valid filter is provided
        polls = await pollService.getAllPolls();
      }
      
      res.status(200).json(polls);
    } catch (error) {
       // Handle specific errors from the service layer (e.g., user not found during filtering)
      if (error.message.includes('does not exist')) {
        res.status(404).json({ error: error.message }); // Creator user not found
      } else {
        // Log unexpected errors and return a generic 500
        console.error('Error getting polls:', error);
        res.status(500).json({ error: 'Internal server error while getting polls' });
        // Optionally: next(error);
      }
    }
  });

  /**
   * @route GET /polls/:id
   * @description Retrieves a specific poll by its unique ID.
   * @param {express.Request} req - Express request object. Params should contain 'id'.
   * @param {express.Response} res - Express response object.
   * @param {express.NextFunction} next - Express next middleware function.
   * @returns {Promise<void>}
   * @responsestatus 200 - OK: Returns the requested poll object.
   * @responsestatus 404 - Not Found: If no poll with the specified ID exists. Returns { error: string }.
   * @responsestatus 500 - Internal Server Error: If an unexpected error occurs. Returns { error: string }.
   */
  router.get('/:id', async (req, res, next) => {
    try {
      const { id } = req.params;
       if (!id) { // Should not happen with route definition
           return res.status(400).json({ error: 'Poll ID parameter is required.' });
       }
      // Delegate to poll service
      const poll = await pollService.getPoll(id);
      res.status(200).json(poll);
    } catch (error) {
      // Handle specific errors from the service layer
      if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message }); // Poll not found
      } else {
        // Log unexpected errors and return a generic 500
        console.error(`Error getting poll ${req.params.id}:`, error);
        res.status(500).json({ error: 'Internal server error while getting poll' });
        // Optionally: next(error);
      }
    }
  });

  /**
   * @route DELETE /polls/:id
   * @description Deletes a specific poll. Requires the creator's username as a query parameter for authorization.
   * @param {express.Request} req - Express request object. Params contain 'id', Query contains 'username'.
   * @param {express.Response} res - Express response object.
   * @param {express.NextFunction} next - Express next middleware function.
   * @returns {Promise<void>}
   * @responsestatus 200 - OK: If deletion is successful. Returns { message: string }.
   * @responsestatus 400 - Bad Request: If the 'username' query parameter is missing. Returns { error: string }.
   * @responsestatus 403 - Forbidden: If the provided 'username' is not the creator of the poll. Returns { error: string }.
   * @responsestatus 404 - Not Found: If no poll with the specified ID exists. Returns { error: string }.
   * @responsestatus 500 - Internal Server Error: If an unexpected error occurs. Returns { error: string }.
   */
  router.delete('/:id', async (req, res, next) => {
    try {
      const { id } = req.params;
      const { username } = req.query;
      
       if (!id) { 
           return res.status(400).json({ error: 'Poll ID parameter is required.' });
       }
      // Check for required username query parameter for authorization
      if (!username || typeof username !== 'string' || username.trim() === '') {
        return res.status(400).json({ 
          error: 'Username query parameter is required for authorization to delete a poll.' 
        });
      }
      
      // Delegate deletion (including authorization check) to poll service
      await pollService.deletePoll(id, username.trim());
      res.status(200).json({ message: `Poll ${id} deleted successfully` });
    } catch (error) {
      // Handle specific errors from the service layer
      if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message }); // Poll not found
      } else if (error.message.includes('Forbidden') || error.message.includes('Only the creator')) {
        res.status(403).json({ error: 'Forbidden: You do not have permission to delete this poll.' }); // Authorization failed
      } else {
         // Log unexpected errors and return a generic 500
        console.error(`Error deleting poll ${req.params.id}:`, error);
        res.status(500).json({ error: 'Internal server error while deleting poll' });
         // Optionally: next(error);
      }
    }
  });

  /**
   * @route POST /polls/:id/vote
   * @description Records a vote for a specific option on a poll. Expects JSON body with 'username' and 'optionIndex'.
   * @param {express.Request} req - Express request object. Params contain 'id', Body: { username: string, optionIndex: number }.
   * @param {express.Response} res - Express response object.
   * @param {express.NextFunction} next - Express next middleware function.
   * @returns {Promise<void>}
   * @responsestatus 200 - OK: Returns the updated poll object with the new vote recorded.
   * @responsestatus 400 - Bad Request: If input data is missing/invalid, optionIndex is out of bounds, or the user has already voted. Returns { error: string }.
   * @responsestatus 404 - Not Found: If the specified poll or voting user does not exist. Returns { error: string }.
   * @responsestatus 500 - Internal Server Error: If an unexpected error occurs. Returns { error: string }.
   */
  router.post('/:id/vote', async (req, res, next) => {
    try {
      const { id } = req.params;
      const { username, optionIndex } = req.body;
      
       if (!id) { 
           return res.status(400).json({ error: 'Poll ID parameter is required.' });
       }
      // Basic check for required body fields and types
      if (username === undefined || typeof username !== 'string' || username.trim() === '' || optionIndex === undefined || typeof optionIndex !== 'number' || !Number.isInteger(optionIndex)) {
        return res.status(400).json({ 
          error: 'Invalid request body: Requires non-empty username (string) and optionIndex (integer).' 
        });
      }
      
      // Parse optionIndex just in case it comes as a string number
      const parsedOptionIndex = parseInt(optionIndex, 10);
       if (isNaN(parsedOptionIndex)) {
           return res.status(400).json({ error: 'Invalid optionIndex: Must be an integer.' });
       }

      // Delegate voting logic to poll service
      const updatedPoll = await pollService.vote({
        pollId: id,
        username: username.trim(),
        optionIndex: parsedOptionIndex
      });
      
      res.status(200).json(updatedPoll);
    } catch (error) {
      // Handle specific errors from the service layer
      if (error.message.includes('not found')) { // Could be poll or user not found
        res.status(404).json({ error: error.message }); 
      } else if (error.message.includes('already voted') || error.message.includes('Invalid option index') || error.message.includes('Invalid vote data')) {
        res.status(400).json({ error: error.message }); // Bad request (duplicate vote, invalid index)
      } else if (error.message.includes('does not exist')) { // User not found specifically
         res.status(404).json({ error: error.message }); // Treat non-existent user as Not Found
      }
       else {
         // Log unexpected errors and return a generic 500
        console.error(`Error voting on poll ${req.params.id}:`, error);
        // Include specific error message from service if available and safe
        const errorMessage = error.message || 'Internal server error while processing vote';
        res.status(500).json({ error: `Internal server error: ${errorMessage}` }); 
         // Optionally: next(error);
      }
    }
  });

  /**
   * @route GET /polls/:id/results
   * @description Retrieves the aggregated voting results for a specific poll.
   * @param {express.Request} req - Express request object. Params contain 'id'.
   * @param {express.Response} res - Express response object.
   * @param {express.NextFunction} next - Express next middleware function.
   * @returns {Promise<void>}
   * @responsestatus 200 - OK: Returns the poll results object (structure defined by service/storage).
   * @responsestatus 404 - Not Found: If no poll with the specified ID exists. Returns { error: string }.
   * @responsestatus 500 - Internal Server Error: If an unexpected error occurs. Returns { error: string }.
   */
  router.get('/:id/results', async (req, res, next) => {
    try {
      const { id } = req.params;
       if (!id) { 
           return res.status(400).json({ error: 'Poll ID parameter is required.' });
       }
      // Delegate getting results to poll service
      const results = await pollService.getPollResults(id);
      res.status(200).json(results);
    } catch (error) {
      // Handle specific errors from the service layer
      if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message }); // Poll not found
      } else {
        // Log unexpected errors and return a generic 500
        console.error(`Error getting results for poll ${req.params.id}:`, error);
        res.status(500).json({ error: 'Internal server error while getting poll results' });
        // Optionally: next(error);
      }
    }
  });

  return router;
}