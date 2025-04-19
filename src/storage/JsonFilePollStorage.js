/**
 * JsonFilePollStorage.js
 * 
 * This module provides storage functionality for poll entities using JSON files.
 */

import { JsonFileStorage } from './JsonFileStorage.js';

/**
 * JSON file-based storage implementation for polls
 */
export class JsonFilePollStorage extends JsonFileStorage {
  /**
   * Constructor
   * @param {string} dataFolder - Folder path to store JSON files
   */
  constructor(dataFolder) {
    super(dataFolder, 'polls');
  }

  /**
   * Creates a new poll
   * @param {string} id - The UUID of the poll
   * @param {Object} pollData - The poll data (question, options, createdBy)
   * @returns {Promise<Object>} - The created poll
   */
  async createPoll(id, pollData) {
    const poll = {
      question: pollData.question,
      options: pollData.options,
      createdBy: pollData.createdBy,
      votes: {} // Map of username -> optionIndex
    };
    return this.create(id, poll);
  }

  /**
   * Gets polls created by a specific user
   * @param {string} username - The username of the creator
   * @returns {Promise<Array<Object>>} - Polls created by the user
   */
  async getPollsByCreator(username) {
    return this.filter(poll => poll.createdBy === username);
  }

  /**
   * Gets polls that a user has voted in
   * @param {string} username - The username of the voter
   * @returns {Promise<Array<Object>>} - Polls the user has voted in
   */
  async getPollsVotedByUser(username) {
    return this.filter(poll => Object.prototype.hasOwnProperty.call(poll.votes, username));
  }

  /**
   * Records a vote for a poll
   * @param {string} pollId - The poll ID
   * @param {string} username - The username of the voter
   * @param {number} optionIndex - The index of the voted option
   * @returns {Promise<Object>} - The updated poll
   */
  async addVote(pollId, username, optionIndex) {
    const poll = await this.getById(pollId);
    if (!poll) {
      throw new Error(`Poll with ID ${pollId} not found`);
    }

    // Check if user has already voted
    if (Object.prototype.hasOwnProperty.call(poll.votes, username)) {
      throw new Error(`User ${username} has already voted in this poll`);
    }

    // Check if option index is valid
    if (optionIndex < 0 || optionIndex >= poll.options.length) {
      throw new Error(`Invalid option index: ${optionIndex}`);
    }

    // Add the vote
    poll.votes[username] = optionIndex;
    return this.update(pollId, poll);
  }

  /**
   * Gets the results of a poll
   * @param {string} pollId - The poll ID
   * @returns {Promise<Object>} - The poll results
   */
  async getPollResults(pollId) {
    const poll = await this.getById(pollId);
    if (!poll) {
      throw new Error(`Poll with ID ${pollId} not found`);
    }

    // Count votes for each option
    const voteCounts = new Array(poll.options.length).fill(0);
    
    // Count votes for each option
    Object.values(poll.votes).forEach(optionIndex => {
      voteCounts[optionIndex]++;
    });

    // Prepare results
    const results = poll.options.map((option, index) => ({
      option,
      votes: voteCounts[index]
    }));

    return {
      id: pollId,
      question: poll.question,
      createdBy: poll.createdBy,
      totalVotes: Object.keys(poll.votes).length,
      results
    };
  }
}