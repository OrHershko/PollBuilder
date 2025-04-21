/**
 * PollService.js
 * 
 * This module encapsulates the business logic related to poll management.
 * It handles validation of poll data, coordinates interactions between poll storage
 * and user service, and enforces business rules (like voting restrictions).
 */

import { v4 as uuidv4 } from 'uuid';


/**
 * Service class containing business logic for poll operations.
 */
export class PollService {
  /**
   * Creates an instance of PollService.
   * 
   * @param {import('../storage/JsonFilePollStorage.js').JsonFilePollStorage} pollStorage - An instance of a poll storage implementation (e.g., JsonFilePollStorage).
   * @param {import('./UserService.js').UserService} userService - An instance of the UserService to check for user existence.
   */
  constructor(pollStorage, userService) {
     if (!pollStorage || typeof pollStorage.createPoll !== 'function' /* add other checks */) {
        throw new Error('PollService requires a valid pollStorage instance.');
    }
     if (!userService || typeof userService.userExists !== 'function') {
        throw new Error('PollService requires a valid userService instance.');
    }
    this.pollStorage = pollStorage;
    this.userService = userService;
  }

  /**
   * Validates and creates a new poll.
   * 
   * @async
   * @param {Object} pollData - The data for the poll to be created.
   * @param {string} pollData.question - The poll question. Must be a non-empty string.
   * @param {Array<string>} pollData.options - An array of poll options. Must contain at least 2 unique, non-empty strings.
   * @param {string} pollData.creator - The username of the user creating the poll. Must correspond to an existing user.
   * @returns {Promise<Object>} A promise that resolves with the created poll object (including its generated ID and initial empty votes object).
   * @throws {Error} If `pollData` is invalid (missing fields, invalid types).
   * @throws {Error} If the question is empty or not a string.
   * @throws {Error} If options array is invalid (not an array, < 2 options, contains non-strings, empty strings, or duplicates).
   * @throws {Error} If the creator username is invalid or does not correspond to an existing user (message includes 'does not exist').
   * @throws {Error} If the underlying storage or user service operation fails.
   */
  async createPoll(pollData) {
    // Validate pollData structure
    if (!pollData || typeof pollData !== 'object') {
        throw new Error('Invalid pollData provided.');
    }
    const { question, options, creator } = pollData;

    // Validate question
    if (!question || typeof question !== 'string' || question.trim() === '') {
      throw new Error('Question must be a non-empty string');
    }
    
    // Validate options
    if (!Array.isArray(options) || options.length < 2) {
      throw new Error('Poll must have at least 2 options');
    }
    
    // Check for empty or duplicate options
    const uniqueOptions = new Set();
    for (const option of options) {
      if (typeof option !== 'string' || option.trim() === '') {
        throw new Error('All options must be non-empty strings');
      }
      const trimmedOption = option.trim();
      if (uniqueOptions.has(trimmedOption)) {
        throw new Error('Options must be unique');
      }
      uniqueOptions.add(trimmedOption);
    }
    const validatedOptions = options.map(opt => opt.trim()); // Use trimmed options
    
    // Validate creator
    if (!creator || typeof creator !== 'string' || creator.trim() === '') {
      throw new Error('Creator must be a non-empty string');
    }
    const trimmedCreator = creator.trim();
    
    // Check if creator exists using UserService
    const creatorExists = await this.userService.userExists(trimmedCreator);
    if (!creatorExists) {
      // Throw error identifiable by the route layer
      throw new Error(`Creator '${trimmedCreator}' does not exist`); 
    }
    
    // Generate a unique UUID for the poll
    const pollId = uuidv4();
    
    // Delegate poll creation to the storage layer
    try {
        return await this.pollStorage.createPoll(pollId, {
          question: question.trim(),
          options: validatedOptions,
          createdBy: trimmedCreator // Store the creator's username
        });
    } catch (storageError) {
        console.error(`Storage error during createPoll for ${pollId}:`, storageError);
        throw new Error(`Failed to create poll: ${storageError.message}`);
    }
  }

  /**
   * Retrieves a specific poll by its ID.
   * 
   * @async
   * @param {string} pollId - The unique identifier of the poll to retrieve.
   * @returns {Promise<Object>} A promise that resolves with the poll object.
   * @throws {Error} If `pollId` is invalid (e.g., not a string).
   * @throws {Error} If no poll with the given ID is found (message includes 'not found').
   * @throws {Error} If the underlying storage operation fails.
   */
  async getPoll(pollId) {
     if (!pollId || typeof pollId !== 'string') {
        throw new Error('Invalid pollId provided to getPoll.');
    }
    const poll = await this.pollStorage.getById(pollId);
    if (!poll) {
      // Throw error identifiable by the route layer
      throw new Error(`Poll with ID '${pollId}' not found`); 
    }
    return poll;
  }

  /**
   * Retrieves all polls currently stored.
   * 
   * @async
   * @returns {Promise<Array<Object>>} A promise that resolves with an array of all poll objects. The array may be empty.
   * @throws {Error} If the underlying storage operation fails.
   */
  async getAllPolls() {
    try {
        return await this.pollStorage.getAll();
    } catch (storageError) {
        console.error('Storage error during getAllPolls:', storageError);
        throw new Error(`Failed to retrieve all polls: ${storageError.message}`);
    }
  }

  /**
   * Retrieves all polls created by a specific user.
   * 
   * @async
   * @param {string} username - The username of the poll creator.
   * @returns {Promise<Array<Object>>} A promise that resolves with an array of poll objects created by the user.
   * @throws {Error} If the username is invalid.
   * @throws {Error} If the specified user does not exist (message includes 'does not exist').
   * @throws {Error} If the underlying storage or user service operation fails.
   */
  async getPollsByCreator(username) {
    if (!username || typeof username !== 'string' || username.trim() === '') {
      throw new Error('Invalid username provided to getPollsByCreator.');
    }
    const trimmedUsername = username.trim();

    // Check if user exists first
    const userExists = await this.userService.userExists(trimmedUsername);
    if (!userExists) {
      throw new Error(`User '${trimmedUsername}' does not exist`);
    }
    
    // Delegate filtering to storage layer
    try {
        return await this.pollStorage.getPollsByCreator(trimmedUsername);
    } catch (storageError) {
        console.error(`Storage error during getPollsByCreator for ${trimmedUsername}:`, storageError);
        throw new Error(`Failed to retrieve polls for creator '${trimmedUsername}': ${storageError.message}`);
    }
  }

  /**
   * Retrieves all polls in which a specific user has voted.
   * 
   * @async
   * @param {string} username - The username of the voter.
   * @returns {Promise<Array<Object>>} A promise that resolves with an array of poll objects the user has voted in.
   * @throws {Error} If the username is invalid.
   * @throws {Error} If the specified user does not exist (message includes 'does not exist').
   * @throws {Error} If the underlying storage or user service operation fails.
   */
  async getPollsVotedByUser(username) {
     if (!username || typeof username !== 'string' || username.trim() === '') {
      throw new Error('Invalid username provided to getPollsVotedByUser.');
    }
     const trimmedUsername = username.trim();

    // Check if user exists first
    const userExists = await this.userService.userExists(trimmedUsername);
    if (!userExists) {
      throw new Error(`User '${trimmedUsername}' does not exist`);
    }
    
    // Delegate filtering to storage layer
     try {
        return await this.pollStorage.getPollsVotedByUser(trimmedUsername);
    } catch (storageError) {
        console.error(`Storage error during getPollsVotedByUser for ${trimmedUsername}:`, storageError);
        throw new Error(`Failed to retrieve polls voted by user '${trimmedUsername}': ${storageError.message}`);
    }
  }
  
  /**
   * Records a user's vote on a poll, performing necessary validations.
   * 
   * @async
   * @param {Object} voteData - Data for the vote.
   * @param {string} voteData.pollId - The ID of the poll to vote on.
   * @param {string} voteData.username - The username of the voter.
   * @param {number} voteData.optionIndex - The 0-based index of the chosen option.
   * @returns {Promise<Object>} A promise that resolves with the updated poll object after the vote is recorded.
   * @throws {Error} If `voteData` is invalid or missing required fields/types.
   * @throws {Error} If the specified user does not exist (message includes 'does not exist').
   * @throws {Error} If the specified poll does not exist (message includes 'not found').
   * @throws {Error} If the `optionIndex` is invalid (out of bounds for the poll's options).
   * @throws {Error} If the user has already voted in this poll (storage layer error, message includes 'already voted').
   * @throws {Error} If the underlying storage or user service operation fails.
   */
  async vote(voteData) {
    // Validate required fields and types
    if (!voteData || typeof voteData !== 'object' || typeof voteData.pollId !== 'string' || typeof voteData.username !== 'string' || typeof voteData.optionIndex !== 'number' || !Number.isInteger(voteData.optionIndex)) {
      throw new Error('Invalid vote data: requires pollId (string), username (string), and optionIndex (integer).');
    }
    
    const { pollId, username, optionIndex } = voteData;
    const trimmedUsername = username.trim();

     if (trimmedUsername === '') {
        throw new Error('Username cannot be empty for voting.');
    }
    
    // Check if user exists
    const userExists = await this.userService.userExists(trimmedUsername);
    if (!userExists) {
      throw new Error(`User '${trimmedUsername}' does not exist`);
    }
    
    // Check if poll exists (getPoll throws if not found)
    // This also implicitly validates the optionIndex range within the storage layer's addVote
    const poll = await this.getPoll(pollId); 
    
    // Validate option index against the retrieved poll (redundant if storage does it, but good practice)
    if (optionIndex < 0 || optionIndex >= poll.options.length) {
      throw new Error(`Invalid option index: ${optionIndex}. Must be between 0 and ${poll.options.length - 1}.`);
    }
    
    // Delegate adding the vote to the storage layer
    // The storage layer handles the check for duplicate votes
    try {
        return await this.pollStorage.addVote(pollId, trimmedUsername, optionIndex);
    } catch (storageError) {
         // Make specific errors identifiable if possible
        if (storageError.message.includes('already voted')) {
             throw new Error(`User '${trimmedUsername}' has already voted in this poll`); // More specific message
        }
        console.error(`Storage error during vote for poll ${pollId} by ${trimmedUsername}:`, storageError);
        throw new Error(`Failed to record vote: ${storageError.message}`);
    }
  }

  /**
   * Retrieves the aggregated results for a specific poll.
   * 
   * @async
   * @param {string} pollId - The ID of the poll to get results for.
   * @returns {Promise<Object>} A promise that resolves with the poll results object (structure defined in storage).
   * @throws {Error} If `pollId` is invalid.
   * @throws {Error} If the poll with the given ID is not found (message includes 'not found').
   * @throws {Error} If the underlying storage operation fails.
   */
  async getPollResults(pollId) {
     if (!pollId || typeof pollId !== 'string') {
        throw new Error('Invalid pollId provided to getPollResults.');
    }
    // Delegate directly to storage, which handles 'not found'
    try {
        return await this.pollStorage.getPollResults(pollId);
    } catch (storageError) {
        // Re-throw 'not found' errors specifically if needed, or handle generally
        if (storageError.message.includes('not found')) {
            throw new Error(`Poll with ID '${pollId}' not found`);
        }
        console.error(`Storage error during getPollResults for ${pollId}:`, storageError);
        throw new Error(`Failed to retrieve poll results: ${storageError.message}`);
    }
  }

  /**
   * Deletes a poll, but only if the requesting user is the creator.
   * 
   * @async
   * @param {string} pollId - The ID of the poll to delete.
   * @param {string} username - The username of the user attempting the deletion.
   * @returns {Promise<boolean>} A promise that resolves with true if the poll was successfully deleted.
   * @throws {Error} If `pollId` or `username` is invalid.
   * @throws {Error} If the poll with the given ID is not found (message includes 'not found').
   * @throws {Error} If the `username` provided does not match the `createdBy` field of the poll (message includes 'Only the creator').
   * @throws {Error} If the underlying storage operation fails.
   */
  async deletePoll(pollId, username) {
     if (!pollId || typeof pollId !== 'string') {
        throw new Error('Invalid pollId provided to deletePoll.');
    }
     if (!username || typeof username !== 'string' || username.trim() === '') {
        throw new Error('Invalid username provided to deletePoll.');
    }
    const trimmedUsername = username.trim();

    // Check if poll exists first (getPoll throws if not found)
    const poll = await this.getPoll(pollId);
    
    // Authorization check: Ensure the user attempting deletion is the creator
    if (poll.createdBy !== trimmedUsername) {
      // Throw error identifiable by the route layer
      throw new Error('Forbidden: Only the creator can delete this poll'); 
    }
    
    // Delegate deletion to storage layer
    try {
        const deleted = await this.pollStorage.delete(pollId);
        // The storage delete should return true if found and deleted.
        // If getPoll succeeded, it should be found by delete.
        if (!deleted) {
            // This case might indicate an unexpected state (found by getPoll, not by delete)
            console.warn(`Poll ${pollId} found by getPoll but delete returned false.`);
            throw new Error(`Failed to delete poll ${pollId} despite finding it initially.`);
        }
        return true; 
    } catch (storageError) {
        console.error(`Storage error during deletePoll for ${pollId}:`, storageError);
        throw new Error(`Failed to delete poll: ${storageError.message}`);
    }
  }
}