/**
 * userRoutes.js
 * 
 * This module provides Express routes for user management.
 */
import express from 'express';

/**
 * Creates user routes
 * @param {Object} userService - User service instance
 * @returns {express.Router} - Express router
 */
export function createUserRoutes(userService) {
  const router = express.Router();

  /**
   * Create a new user
   * @route POST /users
   * @param {Object} req.body - User creation data
   * @param {string} req.body.username - The username to create
   * @returns {Object} 201 - Created user object
   * @returns {Object} 400 - Bad request error
   * @returns {Object} 500 - Internal server error
   */
  router.post('/', async (req, res) => {
    try {
      const { username } = req.body;
      
      if (!username) {
        return res.status(400).json({ error: 'Username is required' });
      }
      
      const user = await userService.createUser(username);
      res.status(201).json(user);
    } catch (error) {
      if (error.message.includes('already exists')) {
        res.status(400).json({ error: error.message });
      } else {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  /**
   * Get polls created by a specific user
   * @route GET /users/:username/polls
   * @param {string} req.params.username - The username to get polls for
   * @returns {Array} 200 - List of poll objects created by the user
   * @returns {Object} 404 - User not found error
   * @returns {Object} 500 - Internal server error
   */
  router.get('/:username/polls', async (req, res) => {
    try {
      const { username } = req.params;
      const polls = await req.app.locals.pollService.getPollsByCreator(username);
      res.status(200).json(polls);
    } catch (error) {
      if (error.message.includes('does not exist')) {
        res.status(404).json({ error: error.message });
      } else {
        console.error('Error getting user polls:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  /**
   * Get polls a user has voted in
   * @route GET /users/:username/votes
   * @param {string} req.params.username - The username to get votes for
   * @returns {Array} 200 - List of poll objects the user has voted in
   * @returns {Object} 404 - User not found error
   * @returns {Object} 500 - Internal server error
   */
  router.get('/:username/votes', async (req, res) => {
    try {
      const { username } = req.params;
      const polls = await req.app.locals.pollService.getPollsVotedByUser(username);
      res.status(200).json(polls);
    } catch (error) {
      if (error.message.includes('does not exist')) {
        res.status(404).json({ error: error.message });
      } else {
        console.error('Error getting user votes:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  return router;
}