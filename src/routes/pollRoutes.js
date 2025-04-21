/**
 * pollRoutes.js
 * 
 * This module provides Express routes for poll management.
 */

import express from 'express';

/**
 * Creates poll routes
 * @param {Object} pollService - Poll service instance
 * @returns {express.Router} - Express router
 */
export function createPollRoutes(pollService) {
  const router = express.Router();

  /**
   * Create a new poll
   * @route POST /polls
   * @param {Object} req.body - Poll creation data
   * @param {string} req.body.question - The poll question
   * @param {Array<string>} req.body.options - List of poll options
   * @param {string} req.body.creator - Username of poll creator
   * @returns {Object} 201 - Created poll object
   * @returns {Object} 400 - Bad request error
   * @returns {Object} 500 - Internal server error
   */
  router.post('/', async (req, res) => {
    try {
      const { question, options, creator } = req.body;
      
      if (!question || !options || !creator) {
        return res.status(400).json({ 
          error: 'Question, options, and creator are required' 
        });
      }
      
      const poll = await pollService.createPoll({
        question,
        options,
        creator
      });
      
      res.status(201).json(poll);
    } catch (error) {
      if (error.message.includes('does not exist') || 
          error.message.includes('must have at least') ||
          error.message.includes('must be unique') ||
          error.message.includes('must be a non-empty')) {
        res.status(400).json({ error: error.message });
      } else {
        console.error('Error creating poll:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  /**
   * Get all polls or filter by creator
   * @route GET /polls
   * @route GET /polls?createdBy=username
   * @param {string} req.query.createdBy - Optional username to filter polls by creator
   * @returns {Array} 200 - List of poll objects
   * @returns {Object} 404 - Not found error
   * @returns {Object} 500 - Internal server error
   */
  router.get('/', async (req, res) => {
    try {
      const { createdBy } = req.query;
      
      if (createdBy) {
        const polls = await pollService.getPollsByCreator(createdBy);
        return res.status(200).json(polls);
      }
      
      const polls = await pollService.getAllPolls();
      res.status(200).json(polls);
    } catch (error) {
      if (error.message.includes('does not exist')) {
        res.status(404).json({ error: error.message });
      } else {
        console.error('Error getting polls:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  /**
   * Get a specific poll by ID
   * @route GET /polls/:id
   * @param {string} req.params.id - Poll ID
   * @returns {Object} 200 - Poll object
   * @returns {Object} 404 - Not found error
   * @returns {Object} 500 - Internal server error
   */
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const poll = await pollService.getPoll(id);
      res.status(200).json(poll);
    } catch (error) {
      if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else {
        console.error('Error getting poll:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  /**
   * Delete a poll
   * @route DELETE /polls/:id
   * @param {string} req.params.id - Poll ID
   * @param {string} req.query.username - Username of the user attempting to delete the poll
   * @returns {Object} 200 - Success message
   * @returns {Object} 400 - Bad request error
   * @returns {Object} 403 - Forbidden error (not poll creator)
   * @returns {Object} 404 - Not found error
   * @returns {Object} 500 - Internal server error
   */
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { username } = req.query;
      
      if (!username) {
        return res.status(400).json({ 
          error: 'Username is required to delete a poll' 
        });
      }
      
      await pollService.deletePoll(id, username);
      res.status(200).json({ message: 'Poll deleted successfully' });
    } catch (error) {
      if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else if (error.message.includes('Only the creator')) {
        res.status(403).json({ error: error.message });
      } else {
        console.error('Error deleting poll:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  /**
   * Vote on a poll
   * @route POST /polls/:id/vote
   * @param {string} req.params.id - Poll ID
   * @param {Object} req.body - Vote information
   * @param {string} req.body.username - Username of the voter
   * @param {number} req.body.optionIndex - Index of the selected option
   * @returns {Object} 200 - Updated poll with the new vote
   * @returns {Object} 400 - Bad request error
   * @returns {Object} 404 - Not found error
   * @returns {Object} 500 - Internal server error
   */
  router.post('/:id/vote', async (req, res) => {
    try {
      const { id } = req.params;
      const { username, optionIndex } = req.body;
      
      if (username === undefined || optionIndex === undefined) {
        return res.status(400).json({ 
          error: 'Username and optionIndex are required' 
        });
      }
      
      const updatedPoll = await pollService.vote({
        pollId: id, // Changed 'id' to 'pollId'
        username,
        optionIndex: parseInt(optionIndex, 10)
      });
      
      res.status(200).json(updatedPoll);
    } catch (error) {
      if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else if (error.message.includes('already voted')) {
        res.status(400).json({ error: error.message });
      } else if (error.message.includes('Invalid option')) {
        res.status(400).json({ error: error.message });
      } else {
        console.error('Error voting on poll:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  /**
   * Get poll results
   * @route GET /polls/:id/results
   * @param {string} req.params.id - Poll ID
   * @returns {Object} 200 - Poll results object
   * @returns {Object} 404 - Not found error
   * @returns {Object} 500 - Internal server error
   */
  router.get('/:id/results', async (req, res) => {
    try {
      const { id } = req.params;
      const results = await pollService.getPollResults(id);
      res.status(200).json(results);
    } catch (error) {
      if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else {
        console.error('Error getting poll results:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  return router;
}