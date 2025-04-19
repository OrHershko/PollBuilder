/**
 * PollService.js
 * 
 * This module provides business logic for poll management.
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Service for poll-related business logic
 */
export class PollService {
  /**
   * Constructor
   * @param {Object} pollStorage - Poll storage instance
   * @param {Object} userService - User service instance
   */
  constructor(pollStorage, userService) {
    this.pollStorage = pollStorage;
    this.userService = userService;
  }

  /**
   * Creates a new poll
   * @param {Object} pollData - The poll data
   * @param {string} pollData.question - The poll question
   * @param {Array<string>} pollData.options - The poll options
   * @param {string} pollData.creator - The username of the poll creator
   * @returns {Promise<Object>} - The created poll
   * @throws {Error} - If poll data is invalid or creator doesn't exist
   */
  async createPoll(pollData) {
    // Validate question
    if (!pollData.question || typeof pollData.question !== 'string' || pollData.question.trim() === '') {
      throw new Error('Question must be a non-empty string');
    }
    
    // Validate options
    if (!Array.isArray(pollData.options) || pollData.options.length < 2) {
      throw new Error('Poll must have at least 2 options');
    }
    
    // Check for empty or duplicate options
    const uniqueOptions = new Set();
    for (const option of pollData.options) {
      if (typeof option !== 'string' || option.trim() === '') {
        throw new Error('All options must be non-empty strings');
      }
      if (uniqueOptions.has(option)) {
        throw new Error('Options must be unique');
      }
      uniqueOptions.add(option);
    }
    
    // Validate creator
    if (!pollData.creator || typeof pollData.creator !== 'string') {
      throw new Error('Creator must be a non-empty string');
    }
    
    // Check if creator exists
    const creatorExists = await this.userService.userExists(pollData.creator);
    if (!creatorExists) {
      throw new Error(`Creator '${pollData.creator}' does not exist`);
    }
    
    // Generate a unique UUID for the poll
    const pollId = uuidv4();
    
    // Create poll with createdBy instead of creator
    return this.pollStorage.createPoll(pollId, {
      question: pollData.question,
      options: pollData.options,
      createdBy: pollData.creator
    });
  }

  /**
   * Gets a poll by ID
   * @param {string} pollId - The poll ID
   * @returns {Promise<Object>} - The poll
   * @throws {Error} - If poll not found
   */
  async getPoll(pollId) {
    const poll = await this.pollStorage.getById(pollId);
    if (!poll) {
      throw new Error(`Poll with ID '${pollId}' not found`);
    }
    return poll;
  }

  /**
   * Gets all polls
   * @returns {Promise<Array<Object>>} - All polls
   */
  async getAllPolls() {
    return this.pollStorage.getAll();
  }

  /**
   * Gets polls created by a specific user
   * @param {string} username - The username of the creator
   * @returns {Promise<Array<Object>>} - Polls created by the user
   * @throws {Error} - If user doesn't exist
   */
  async getPollsByCreator(username) {
    // Check if user exists
    const userExists = await this.userService.userExists(username);
    if (!userExists) {
      throw new Error(`User '${username}' does not exist`);
    }
    
    return this.pollStorage.getPollsByCreator(username);
  }

  /**
   * Gets polls that a user has voted in
   * @param {string} username - The username of the voter
   * @returns {Promise<Array<Object>>} - Polls the user has voted in
   * @throws {Error} - If user doesn't exist
   */
  async getPollsVotedByUser(username) {
    // Check if user exists
    const userExists = await this.userService.userExists(username);
    if (!userExists) {
      throw new Error(`User '${username}' does not exist`);
    }
    
    return this.pollStorage.getPollsVotedByUser(username);
  }
  /**
   * Records a vote for a poll
   * @param {Object} pollData - Data for the vote
   * @param {string} pollData.pollId - The poll ID
   * @param {string} pollData.username - The username of the voter
   * @param {number} pollData.optionIndex - The index of the voted option
   * @returns {Promise<Object>} - The updated poll
   * @throws {Error} - If poll not found, user doesn't exist, or vote is invalid
   */
  async vote(pollData) {
    // Validate required fields
    if (typeof pollData.pollId !== 'string' || typeof pollData.username !== 'string' || typeof pollData.optionIndex !== 'number') {
      throw new Error('Invalid vote data');
    }
    
    const { pollId, username, optionIndex } = pollData;
    
    // Check if user exists
    const userExists = await this.userService.userExists(username);
    if (!userExists) {
      throw new Error(`User '${username}' does not exist`);
    }
    
    // Check if poll exists
    const poll = await this.getPoll(pollId);
    
    // Validate option index
    if (optionIndex < 0 || 
        optionIndex >= poll.options.length) {
      throw new Error(`Invalid option index: ${optionIndex}`);
    }
    
    // Add vote
    return this.pollStorage.addVote(pollId, username, optionIndex);
  }

  /**
   * Gets the results of a poll
   * @param {string} pollId - The poll ID
   * @returns {Promise<Object>} - The poll results
   * @throws {Error} - If poll not found
   */
  async getPollResults(pollId) {
    return this.pollStorage.getPollResults(pollId);
  }

  /**
   * Deletes a poll
   * @param {string} pollId - The poll ID
   * @param {string} username - The username of the user attempting to delete
   * @returns {Promise<boolean>} - True if deleted, false if not found
   * @throws {Error} - If poll not found or user is not the creator
   */
  async deletePoll(pollId, username) {
    // Check if poll exists
    const poll = await this.getPoll(pollId);
    
    // Check if user is the creator - use createdBy instead of creator
    if (poll.createdBy !== username) {
      throw new Error('Only the creator can delete a poll');
    }
    
    return this.pollStorage.delete(pollId);
  }
}