/**
 * UserService.test.js
 * 
 * Unit tests for the UserService class
 */

import { UserService } from '../src/services/UserService.js';
// Use JsonFile storage for tests, requires cleanup
import { JsonFileUserStorage } from '../src/storage/JsonFileUserStorage.js'; 
import fs from 'fs/promises'; // Import fs for cleanup
import path from 'path'; // Import path for cleanup
import { fileURLToPath } from 'url'; // Import url for cleanup

// Get directory name in ESM for cleanup
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDataDir = path.join(__dirname, 'test_data_userservice'); // Use separate test data dir

describe('UserService', () => {
  let userService;
  let userStorage;

  // Set up fresh instances and cleanup before each test
  beforeEach(async () => {
    // Clean up test data directory before each test
    await fs.rm(testDataDir, { recursive: true, force: true });
    await fs.mkdir(testDataDir, { recursive: true });

    // Use JsonFile storage for tests
    userStorage = new JsonFileUserStorage(testDataDir); 
    userService = new UserService(userStorage);
  });

  // Clean up test data directory after all tests
  afterAll(async () => {
    await fs.rm(testDataDir, { recursive: true, force: true });
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