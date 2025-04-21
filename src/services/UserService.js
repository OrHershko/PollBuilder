/**
 * UserService.js
 * 
 * This module encapsulates the business logic related to user management.
 * It acts as an intermediary between the routes (HTTP layer) and the storage layer,
 * performing validation and coordinating actions.
 */

/**
 * Service class containing business logic for user operations.
 */
export class UserService {
  /**
   * Creates an instance of UserService.
   * 
   * @param {import('../storage/JsonFileUserStorage.js').JsonFileUserStorage} userStorage - An instance of a user storage implementation (e.g., JsonFileUserStorage). It should provide methods like `createUser`, `getUserByUsername`, `usernameExists`.
   */
  constructor(userStorage) {
    if (!userStorage || typeof userStorage.createUser !== 'function' || typeof userStorage.usernameExists !== 'function' || typeof userStorage.getUserByUsername !== 'function') {
        throw new Error('UserService requires a valid userStorage instance.');
    }
    this.userStorage = userStorage;
  }

  /**
   * Validates and creates a new user.
   * 
   * @async
   * @param {string} username - The desired username for the new user.
   * @returns {Promise<Object>} A promise that resolves with the created user object (usually { id: username, username: username }).
   * @throws {Error} If the username is invalid (null, empty, not a string, or whitespace only).
   * @throws {Error} If a user with the given username already exists (message includes 'already exists').
   * @throws {Error} If the underlying storage operation fails.
   */
  async createUser(username) {
    // Validate username: must be a non-empty string
    if (!username || typeof username !== 'string' || username.trim() === '') {
      throw new Error('Username must be a non-empty string');
    }
    
    const trimmedUsername = username.trim(); // Use trimmed username consistently

    // Check if username already exists using the storage method
    const exists = await this.userStorage.usernameExists(trimmedUsername);
    if (exists) {
      // Throw an error that the route layer can potentially identify
      throw new Error(`Username '${trimmedUsername}' already exists`); 
    }
    
    // Delegate user creation to the storage layer
    try {
        return await this.userStorage.createUser(trimmedUsername);
    } catch (storageError) {
        console.error(`Storage error during createUser for ${trimmedUsername}:`, storageError);
        // Rethrow or wrap the storage error
        throw new Error(`Failed to create user '${trimmedUsername}': ${storageError.message}`);
    }
  }

  /**
   * Retrieves a user by their username.
   * 
   * @async
   * @param {string} username - The username of the user to retrieve.
   * @returns {Promise<Object>} A promise that resolves with the user object.
   * @throws {Error} If the username is invalid (null, empty, not a string).
   * @throws {Error} If no user with the given username is found (message includes 'not found').
   * @throws {Error} If the underlying storage operation fails.
   */
  async getUser(username) {
     // Basic validation
    if (!username || typeof username !== 'string') {
      throw new Error('Invalid username provided to getUser.');
    }

    const user = await this.userStorage.getUserByUsername(username);
    if (!user) {
      // Throw an error that the route layer can potentially identify
      throw new Error(`User '${username}' not found`); 
    }
    return user;
  }

  /**
   * Checks if a user with the given username exists.
   * 
   * @async
   * @param {string} username - The username to check.
   * @returns {Promise<boolean>} A promise that resolves with true if the user exists, false otherwise.
   * @throws {Error} If the username is invalid (null, empty, not a string).
   * @throws {Error} If the underlying storage operation fails.
   */
  async userExists(username) {
     // Basic validation
    if (!username || typeof username !== 'string') {
      // Depending on requirements, might return false or throw
      // Throwing might be better to indicate invalid input vs. user not found
      throw new Error('Invalid username provided to userExists.'); 
    }
    try {
        return await this.userStorage.usernameExists(username);
    } catch (storageError) {
        console.error(`Storage error during userExists check for ${username}:`, storageError);
        // Rethrow or wrap the storage error
        throw new Error(`Failed to check existence for user '${username}': ${storageError.message}`);
    }
  }
}