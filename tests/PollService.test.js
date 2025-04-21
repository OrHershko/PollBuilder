/**
 * PollService.test.js
 * 
 * Unit tests for the PollService class
 */

import { PollService } from '../src/services/PollService.js';
import { UserService } from '../src/services/UserService.js';
// Use JsonFile storage for tests, requires cleanup
import { JsonFilePollStorage } from '../src/storage/JsonFilePollStorage.js'; 
import { JsonFileUserStorage } from '../src/storage/JsonFileUserStorage.js';
import fs from 'fs/promises'; // Import fs for cleanup
import path from 'path'; // Import path for cleanup
import { fileURLToPath } from 'url'; // Import url for cleanup

// Get directory name in ESM for cleanup
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDataDir = path.join(__dirname, 'test_data_pollservice'); // Use separate test data dir


describe('PollService', () => {
  let pollService;
  let userService;
  let pollStorage;
  let userStorage;
  const testCreator = 'testuser';
  const testPollData = {
    question: 'Test question?',
    options: ['Option 1', 'Option 2', 'Option 3'],
    creator: testCreator
  };

  // Set up fresh instances and cleanup before each test
  beforeEach(async () => {
    // Clean up test data directory before each test
    await fs.rm(testDataDir, { recursive: true, force: true });
    await fs.mkdir(testDataDir, { recursive: true });

    // Use JsonFile storage for tests
    pollStorage = new JsonFilePollStorage(testDataDir); 
    userStorage = new JsonFileUserStorage(testDataDir);
    userService = new UserService(userStorage);
    pollService = new PollService(pollStorage, userService);
    
    // Create a test user for all tests to use
    await userService.createUser(testCreator);
  });

  // Clean up test data directory after all tests
  afterAll(async () => {
    await fs.rm(testDataDir, { recursive: true, force: true });
  });

  describe('createPoll', () => {
    it('should create a valid poll', async () => {
      const poll = await pollService.createPoll(testPollData);
      
      expect(poll).toHaveProperty('id'); // Poll should have an ID
      expect(poll).toMatchObject({
        question: testPollData.question,
        options: testPollData.options,
        createdBy: testPollData.creator, // Note: creator in input becomes createdBy in output
        votes: {}
      });
    });

    it('should reject poll with empty question', async () => {
      const invalidData = { ...testPollData, question: '' };
      await expect(pollService.createPoll(invalidData)).rejects.toThrow('Question must be a non-empty string');
    });

    it('should reject poll with less than two options', async () => {
      const invalidData = { ...testPollData, options: ['Only one option'] };
      await expect(pollService.createPoll(invalidData)).rejects.toThrow('Poll must have at least 2 options');
    });

    it('should reject poll with empty options', async () => {
      const invalidData = { ...testPollData, options: ['Valid option', ''] };
      await expect(pollService.createPoll(invalidData)).rejects.toThrow('All options must be non-empty strings');
    });

    it('should reject poll with duplicate options', async () => {
      const invalidData = { ...testPollData, options: ['Same option', 'Same option'] };
      await expect(pollService.createPoll(invalidData)).rejects.toThrow('Options must be unique');
    });

    it('should reject poll with non-existent creator', async () => {
      const invalidData = { ...testPollData, creator: 'nonexistentuser' };
      await expect(pollService.createPoll(invalidData)).rejects.toThrow('does not exist');
    });
  });

  describe('vote', () => {
    let pollId;
    let voter;

    beforeEach(async () => {
      // Create a poll for testing
      const poll = await pollService.createPoll(testPollData);
      pollId = poll.id;
      
      // Create a voter
      voter = 'testvoter';
      await userService.createUser(voter);
    });

    it('should record a valid vote', async () => {
      const optionIndex = 1;
      // Pass vote data as an object
      const updatedPoll = await pollService.vote({ pollId, username: voter, optionIndex }); 
      
      // The vote should be recorded
      expect(updatedPoll.votes[voter]).toBe(optionIndex);
    });

    it('should reject vote from non-existent user', async () => {
      // Pass vote data as an object
      await expect(pollService.vote({ pollId, username: 'nonexistentuser', optionIndex: 1 })) 
        .rejects.toThrow('does not exist');
    });

    it('should reject vote for non-existent poll', async () => {
      // Pass vote data as an object
      await expect(pollService.vote({ pollId: 'nonexistentpoll', username: voter, optionIndex: 1 })) 
        .rejects.toThrow('not found');
    });

    it('should reject vote with invalid option index', async () => {
      const invalidIndex = testPollData.options.length; // Out of bounds
      // Pass vote data as an object
      await expect(pollService.vote({ pollId, username: voter, optionIndex: invalidIndex })) 
        .rejects.toThrow('Invalid option index');
    });

    it('should reject duplicate vote from same user', async () => {
      // First vote should succeed
      // Pass vote data as an object
      await pollService.vote({ pollId, username: voter, optionIndex: 1 }); 
      
      // Second vote should fail
      // Pass vote data as an object
      await expect(pollService.vote({ pollId, username: voter, optionIndex: 2 })) 
        .rejects.toThrow('already voted');
    });
  });

  describe('getPollsByCreator', () => {
    beforeEach(async () => {
      // Create several polls with different creators
      await pollService.createPoll(testPollData);
      await pollService.createPoll(testPollData);
      
      // Create another user and their poll
      const otherCreator = 'otheruser';
      await userService.createUser(otherCreator);
      await pollService.createPoll({
        ...testPollData,
        creator: otherCreator
      });
    });

    it('should get polls created by a specific user', async () => {
      const polls = await pollService.getPollsByCreator(testCreator);
      
      // Should return only polls created by testCreator
      expect(polls.length).toBe(2);
      polls.forEach(poll => {
        expect(poll.createdBy).toBe(testCreator);
      });
    });

    it('should return empty array when user has no polls', async () => {
      const newUser = 'newuser';
      await userService.createUser(newUser);
      
      const polls = await pollService.getPollsByCreator(newUser);
      
      expect(polls).toEqual([]);
    });

    it('should throw error for non-existent user', async () => {
      await expect(pollService.getPollsByCreator('nonexistentuser'))
        .rejects.toThrow('does not exist');
    });
  });

  describe('getPollsVotedByUser', () => {
    let voter;
    
    beforeEach(async () => {
      // Create several polls
      const poll1 = await pollService.createPoll(testPollData);
      const poll2 = await pollService.createPoll(testPollData);
      const poll3 = await pollService.createPoll(testPollData);
      
      // Create a voter and let them vote on some polls
      voter = 'testvoter';
      await userService.createUser(voter);
      
      // Vote on two polls
      await pollService.vote({ pollId: poll1.id, username: voter, optionIndex: 0 });
      await pollService.vote({ pollId: poll3.id, username: voter, optionIndex: 1 });
    });

    it('should get polls voted by a specific user', async () => {
      const polls = await pollService.getPollsVotedByUser(voter);
      
      // Should return only polls voted by the voter
      expect(polls.length).toBe(2);
      
      // Each poll should have this user's vote
      polls.forEach(poll => {
        expect(poll.votes).toHaveProperty(voter);
      });
    });

    it('should return empty array when user has no votes', async () => {
      const newUser = 'newvoter';
      await userService.createUser(newUser);
      
      const polls = await pollService.getPollsVotedByUser(newUser);
      
      expect(polls).toEqual([]);
    });

    it('should throw error for non-existent user', async () => {
      await expect(pollService.getPollsVotedByUser('nonexistentuser'))
        .rejects.toThrow('does not exist');
    });
  });

  describe('deletePoll', () => {
    let pollId;
    
    beforeEach(async () => {
      // Create a poll for testing
      const poll = await pollService.createPoll(testPollData);
      pollId = poll.id;
    });

    it('should allow creator to delete their poll', async () => {
      const result = await pollService.deletePoll(pollId, testCreator);
      
      // Deletion should succeed
      expect(result).toBe(true);
      
      // Poll should no longer exist
      await expect(pollService.getPoll(pollId)).rejects.toThrow('not found');
    });

    it('should not allow non-creator to delete poll', async () => {
      // Create another user
      const otherUser = 'otheruser';
      await userService.createUser(otherUser);
      
      // Try to delete another user's poll
      await expect(pollService.deletePoll(pollId, otherUser))
        .rejects.toThrow('Only the creator can delete a poll');
    });

    it('should throw error for non-existent poll', async () => {
      await expect(pollService.deletePoll('nonexistentpoll', testCreator))
        .rejects.toThrow('not found');
    });
  });
});