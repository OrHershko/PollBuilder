/**
 * UserService.test.js
 * 
 * Unit tests for the UserService class
 */

import { UserService } from '../src/services/UserService.js';
import { InMemoryStorage } from '../src/storage/InMemoryStorage.js';
import { UserStorage } from '../src/storage/UserStorage.js';

describe('UserService', () => {
  let userService;
  let userStorage;

  // Set up fresh instances before each test
  beforeEach(() => {
    // Use in-memory storage for tests
    userStorage = new UserStorage();
    userService = new UserService(userStorage);
  });

  describe('createUser', () => {
    it('should create a user with valid username', async () => {
      const username = 'testuser';
      const user = await userService.createUser(username);
      
      expect(user).toEqual({ id: username, username });
    });

    it('should reject empty username', async () => {
      await expect(userService.createUser('')).rejects.toThrow('Username must be a non-empty string');
    });

    it('should reject null username', async () => {
      await expect(userService.createUser(null)).rejects.toThrow('Username must be a non-empty string');
    });

    it('should reject duplicate username', async () => {
      const username = 'duplicateuser';
      
      // Create the user first
      await userService.createUser(username);
      
      // Try to create with the same username
      await expect(userService.createUser(username)).rejects.toThrow('already exists');
    });
  });

  describe('getUser', () => {
    it('should get existing user', async () => {
      const username = 'existinguser';
      
      // Create the user first
      await userService.createUser(username);
      
      // Get the user
      const user = await userService.getUser(username);
      
      expect(user).toEqual({ id: username, username });
    });

    it('should throw error for non-existent user', async () => {
      const username = 'nonexistentuser';
      
      await expect(userService.getUser(username)).rejects.toThrow('not found');
    });
  });

  describe('userExists', () => {
    it('should return true for existing user', async () => {
      const username = 'existinguser';
      
      // Create the user first
      await userService.createUser(username);
      
      // Check if user exists
      const exists = await userService.userExists(username);
      
      expect(exists).toBe(true);
    });

    it('should return false for non-existent user', async () => {
      const username = 'nonexistentuser';
      
      // Check if user exists
      const exists = await userService.userExists(username);
      
      expect(exists).toBe(false);
    });
  });
});