/**
 * JsonFileUserStorage.js
 * 
 * This module provides a specialized JSON file storage implementation for user entities.
 * It extends the generic JsonFileStorage and provides user-specific methods and error messages.
 */

import { JsonFileStorage } from './JsonFileStorage.js';

/**
 * Concrete storage implementation for user data using JSON files.
 * Extends JsonFileStorage to leverage common file handling logic.
 * 
 * @extends JsonFileStorage
 */
export class JsonFileUserStorage extends JsonFileStorage {
  /**
   * Creates an instance of JsonFileUserStorage.
   * 
   * @param {string} dataFolder - The absolute path to the directory where the 'users.json' file will be stored.
   */
  constructor(dataFolder) {
    // Pass 'users' as the entityType to the base class constructor
    super(dataFolder, 'users');
  }

  /**
   * Creates a new user entity. Uses the username as the unique ID.
   * 
   * @async
   * @param {string} username - The username for the new user. This will also be used as the user's ID.
   * @returns {Promise<Object>} The created user object { id: username, username: username }.
   * @throws {Error} If a user with the same username (ID) already exists (via `_formatDuplicateError`).
   * @throws {Error} If initialization fails.
   * @throws {Error} If saving to the file fails.
   */
  async createUser(username) {
    // Use the username as the ID for the generic create method
    return this.create(username, { username });
  }

  /**
   * Retrieves a user by their username (which is also their ID).
   * 
   * @async
   * @param {string} username - The username of the user to retrieve.
   * @returns {Promise<Object|null>} The user object if found, or null otherwise.
   * @throws {Error} If initialization fails.
   */
  async getUserByUsername(username) {
    // User ID is the username in this implementation
    return this.getById(username);
  }

  /**
   * Checks if a user with the given username exists.
   * 
   * @async
   * @param {string} username - The username to check for existence.
   * @returns {Promise<boolean>} True if a user with the username exists, false otherwise.
   * @throws {Error} If initialization fails.
   */
  async usernameExists(username) {
    const user = await this.getUserByUsername(username);
    return user !== null;
  }

  /**
   * Retrieves all user entities.
   * 
   * @async
   * @returns {Promise<Array<Object>>} An array containing all user objects.
   * @throws {Error} If initialization fails.
   */
  async getAllUsers() {
    return this.getAll();
  }

  /**
   * Overrides the base class method to provide a user-specific error message
   * for duplicate entries.
   * 
   * @param {string} id - The username (ID) that already exists.
   * @returns {string} The user-specific error message.
   * @protected
   * @override
   */
  _formatDuplicateError(id) {
    return `Username '${id}' already exists, try a different one`;
  }

  /**
   * Overrides the base class method to provide a user-specific error message
   * when an entity is not found.
   * 
   * @param {string} id - The username (ID) that was not found.
   * @returns {string} The user-specific error message.
   * @protected
   * @override
   */
  _formatNotFoundError(id) {
    return `User '${id}' not found`;
  }
}