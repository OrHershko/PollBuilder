/**
 * JsonFilePollStorage.js
 * 
 * This module provides a specialized JSON file storage implementation for poll entities.
 * It extends the generic JsonFileStorage and includes poll-specific logic for creation,
 * filtering, voting, and retrieving results.
 */

import { JsonFileStorage } from './JsonFileStorage.js';

/**
 * Concrete storage implementation for poll data using JSON files.
 * Extends JsonFileStorage to leverage common file handling logic.
 * 
 * @extends JsonFileStorage
 */
export class JsonFilePollStorage extends JsonFileStorage {
  /**
   * Creates an instance of JsonFilePollStorage.
   * 
   * @param {string} dataFolder - The absolute path to the directory where the 'polls.json' file will be stored.
   */
  constructor(dataFolder) {
    // Pass 'polls' as the entityType to the base class constructor
    super(dataFolder, 'polls');
  }

  /**
   * Creates a new poll entity with an initial empty votes object.
   * 
   * @async
   * @param {string} id - The unique identifier (UUID) for the new poll.
   * @param {Object} pollData - Data for the new poll.
   * @param {string} pollData.question - The poll question.
   * @param {Array<string>} pollData.options - The poll options.
   * @param {string} pollData.createdBy - The username of the poll creator.
   * @returns {Promise<Object>} The created poll object, including the `votes` property initialized to {}.
   * @throws {Error} If a poll with the same ID already exists (via `_formatDuplicateError`).
   * @throws {Error} If initialization fails.
   * @throws {Error} If saving to the file fails.
   */
  async createPoll(id, pollData) {
    // Basic validation (more comprehensive validation should be in the service layer)
    if (!pollData || !pollData.question || !Array.isArray(pollData.options) || !pollData.createdBy) {
        throw new Error('Invalid poll data provided to createPoll storage method.');
    }
    
    const poll = {
      question: pollData.question,
      options: pollData.options,
      createdBy: pollData.createdBy,
      votes: {} // Initialize votes as an empty object: { username: optionIndex }
    };
    // Use the provided ID for the generic create method
    return this.create(id, poll);
  }

  /**
   * Retrieves all polls created by a specific user.
   * Uses the generic `filter` method.
   * 
   * @async
   * @param {string} username - The username of the creator.
   * @returns {Promise<Array<Object>>} An array of poll objects created by the specified user.
   * @throws {Error} If initialization fails.
   * @throws {Error} If the filter function encounters an error.
   */
  async getPollsByCreator(username) {
    if (typeof username !== 'string' || username.trim() === '') {
        throw new Error('Invalid username provided to getPollsByCreator.');
    }
    return this.filter(poll => poll.createdBy === username);
  }

  /**
   * Retrieves all polls in which a specific user has voted.
   * Uses the generic `filter` method.
   * 
   * @async
   * @param {string} username - The username of the voter.
   * @returns {Promise<Array<Object>>} An array of poll objects where the user has cast a vote.
   * @throws {Error} If initialization fails.
   * @throws {Error} If the filter function encounters an error.
   */
  async getPollsVotedByUser(username) {
     if (typeof username !== 'string' || username.trim() === '') {
        throw new Error('Invalid username provided to getPollsVotedByUser.');
    }
    // Check if the username exists as a key in the poll's votes object
    return this.filter(poll => poll && poll.votes && Object.prototype.hasOwnProperty.call(poll.votes, username));
  }

  /**
   * Records a user's vote on a specific poll.
   * This method retrieves the poll, validates the vote, updates the poll's votes object,
   * and saves the updated poll.
   * 
   * @async
   * @param {string} pollId - The ID of the poll to vote on.
   * @param {string} username - The username of the voter.
   * @param {number} optionIndex - The 0-based index of the option being voted for.
   * @returns {Promise<Object>} The updated poll object after the vote has been recorded.
   * @throws {Error} If the poll with the given ID is not found (via `_formatNotFoundError`).
   * @throws {Error} If the user has already voted in this poll.
   * @throws {Error} If the provided `optionIndex` is invalid (out of bounds).
   * @throws {Error} If initialization fails.
   * @throws {Error} If saving the updated poll to the file fails.
   */
  async addVote(pollId, username, optionIndex) {
    // Retrieve the poll first using getById to ensure it exists
    // getById ensures initialization and returns a deep copy or null
    const poll = await this.getById(pollId); 
    if (!poll) {
      // Use the specific not found error format
      throw new Error(this._formatNotFoundError(pollId)); 
    }

    // Validate inputs (basic checks)
    if (typeof username !== 'string' || username.trim() === '') {
        throw new Error('Invalid username provided for voting.');
    }
     if (typeof optionIndex !== 'number' || !Number.isInteger(optionIndex)) {
        throw new Error('Invalid optionIndex provided for voting: must be an integer.');
    }

    // Check if user has already voted
    if (poll.votes && Object.prototype.hasOwnProperty.call(poll.votes, username)) {
      throw new Error(`User '${username}' has already voted in this poll (ID: ${pollId})`);
    }

    // Check if option index is valid
    if (optionIndex < 0 || !poll.options || optionIndex >= poll.options.length) {
      const maxIndex = poll.options ? poll.options.length - 1 : 'N/A';
      throw new Error(`Invalid option index: ${optionIndex}. Must be between 0 and ${maxIndex}.`);
    }

    // Add or update the vote (ensure votes object exists)
    if (!poll.votes) {
        poll.votes = {};
    }
    poll.votes[username] = optionIndex;
    
    // Use the generic update method to save the modified poll object
    // Pass the entire poll object (including the ID which update ignores in payload)
    return this.update(pollId, poll); 
  }

  /**
   * Calculates and retrieves the voting results for a specific poll.
   * 
   * @async
   * @param {string} pollId - The ID of the poll to get results for.
   * @returns {Promise<Object>} An object containing the poll details and the aggregated results.
   *   The results object structure is:
   *   {
   *     id: string,
   *     question: string,
   *     createdBy: string,
   *     totalVotes: number,
   *     results: Array<{ option: string, votes: number }>
   *   }
   * @throws {Error} If the poll with the given ID is not found (via `_formatNotFoundError`).
   * @throws {Error} If initialization fails.
   */
  async getPollResults(pollId) {
    // Retrieve the poll first
    const poll = await this.getById(pollId);
    if (!poll) {
      throw new Error(this._formatNotFoundError(pollId));
    }

    // Ensure options and votes exist and are in expected format
    if (!Array.isArray(poll.options)) {
        console.error(`Poll ${pollId} has invalid options format.`);
        throw new Error(`Internal error: Poll ${pollId} has invalid options.`);
    }
     if (typeof poll.votes !== 'object' || poll.votes === null) {
        console.warn(`Poll ${pollId} has invalid votes format. Assuming no votes.`);
        poll.votes = {}; // Treat as no votes
    }


    // Initialize vote counts for each option to 0
    const voteCounts = new Array(poll.options.length).fill(0);
    let totalVotes = 0;
    
    // Count votes for each option
    Object.values(poll.votes).forEach(optionIndex => {
      // Ensure the recorded vote index is valid before counting
      if (typeof optionIndex === 'number' && optionIndex >= 0 && optionIndex < voteCounts.length) {
        voteCounts[optionIndex]++;
        totalVotes++;
      } else {
          console.warn(`Invalid vote index ${optionIndex} found in poll ${pollId} for user. Skipping.`);
      }
    });

    // Prepare results array [{ option: string, votes: number }]
    const results = poll.options.map((option, index) => ({
      option,
      votes: voteCounts[index]
    }));

    // Return the structured results object
    return {
      id: pollId,
      question: poll.question,
      createdBy: poll.createdBy,
      totalVotes: totalVotes, // Use the counted total
      results: results
    };
  }

  /**
   * Overrides the base class method to provide a poll-specific error message
   * for duplicate entries.
   * 
   * @param {string} id - The poll ID that already exists.
   * @returns {string} The poll-specific error message.
   * @protected
   * @override
   */
  _formatDuplicateError(id) {
    return `Poll with ID '${id}' already exists`;
  }

  /**
   * Overrides the base class method to provide a poll-specific error message
   * when an entity is not found.
   * 
   * @param {string} id - The poll ID that was not found.
   * @returns {string} The poll-specific error message.
   * @protected
   * @override
   */
  _formatNotFoundError(id) {
    return `Poll with ID '${id}' not found`;
  }
}