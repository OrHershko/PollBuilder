/**
 * JsonFileUserStorage.js
 * 
 * This module provides storage functionality for user entities using JSON files.
 */

import { JsonFileStorage } from './JsonFileStorage.js';

/**
 * JSON file-based storage implementation for users
 */
export class JsonFileUserStorage extends JsonFileStorage {
  /**
   * Constructor
   * @param {string} dataFolder - Folder path to store JSON files
   */
  constructor(dataFolder) {
    super(dataFolder, 'users');
  }

  /**
   * Creates a new user
   * @param {string} username - The username to create
   * @returns {Promise<Object>} - The created user
   * @throws {Error} - If username already exists
   */
  async createUser(username) {
    return this.create(username, { username });
  }

  /**
   * Gets a user by username
   * @param {string} username - The username to look up
   * @returns {Promise<Object|null>} - The user or null if not found
   */
  async getUserByUsername(username) {
    return this.getById(username);
  }

  /**
   * Checks if a username already exists
   * @param {string} username - The username to check
   * @returns {Promise<boolean>} - True if username exists, false otherwise
   */
  async usernameExists(username) {
    const user = await this.getUserByUsername(username);
    return user !== null;
  }

  /**
   * Gets all users
   * @returns {Promise<Array<Object>>} - All users
   */
  async getAllUsers() {
    return this.getAll();
  }
}