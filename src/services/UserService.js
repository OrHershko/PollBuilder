/**
 * UserService.js
 * 
 * This module provides business logic for user management.
 */

/**
 * Service for user-related business logic
 */
export class UserService {
  /**
   * Constructor
   * @param {Object} userStorage - User storage instance
   */
  constructor(userStorage) {
    this.userStorage = userStorage;
  }

  /**
   * Creates a new user
   * @param {string} username - The username to create
   * @returns {Promise<Object>} - The created user
   * @throws {Error} - If username is invalid or already exists
   */
  async createUser(username) {
    // Validate username
    if (!username || typeof username !== 'string' || username.trim() === '') {
      throw new Error('Username must be a non-empty string');
    }
    
    // Check if username already exists
    const exists = await this.userStorage.usernameExists(username);
    if (exists) {
      throw new Error(`Username '${username}' already exists`);
    }
    
    // Create user
    return this.userStorage.createUser(username);
  }

  /**
   * Gets a user by username
   * @param {string} username - The username to look up
   * @returns {Promise<Object>} - The user
   * @throws {Error} - If user not found
   */
  async getUser(username) {
    const user = await this.userStorage.getUserByUsername(username);
    if (!user) {
      throw new Error(`User '${username}' not found`);
    }
    return user;
  }

  /**
   * Checks if a user exists
   * @param {string} username - The username to check
   * @returns {Promise<boolean>} - True if user exists, false otherwise
   */
  async userExists(username) {
    return this.userStorage.usernameExists(username);
  }
}