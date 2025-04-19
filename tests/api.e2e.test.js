/**
 * api.e2e.test.js
 * 
 * End-to-end tests for the polling system API
 */

import fetch from 'node-fetch';
import { start, stop } from '../src/server.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');

describe('API End-to-End Tests', () => {
  let baseURL;
  let testUser = 'testUser';
  let testPoll = {
    question: 'What is your favorite color?',
    options: ['Red', 'Green', 'Blue'],
    creator: testUser
  };
  let pollId;

  // Start the server before all tests
  beforeAll(async () => {
    // Clean up data directory
    try {
      await fs.rm(path.join(dataDir, 'users.json'), { force: true });
      await fs.rm(path.join(dataDir, 'polls.json'), { force: true });
    } catch (error) {
      // Ignore errors if files don't exist
    }
    
    // Start the server
    const serverInfo = await start();
    baseURL = serverInfo.baseURL;
  }, 10000);

  // Stop the server after all tests
  afterAll(async () => {
    await stop();
  });

  describe('User Management', () => {
    it('should create a user successfully', async () => {
      const response = await fetch(`${baseURL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: testUser })
      });

      expect(response.status).toBe(201);
      const user = await response.json();
      expect(user.username).toBe(testUser);
    });

    it('should reject duplicate username', async () => {
      const response = await fetch(`${baseURL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: testUser })
      });

      expect(response.status).toBe(400);
      const error = await response.json();
      expect(error.error).toContain('already exists');
    });
  });

  describe('Poll Management', () => {
    it('should create a poll successfully', async () => {
      const response = await fetch(`${baseURL}/polls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPoll)
      });

      expect(response.status).toBe(201);
      const poll = await response.json();
      
      expect(poll.question).toBe(testPoll.question);
      expect(poll.options).toEqual(testPoll.options);
      expect(poll.createdBy).toBe(testPoll.creator);
      expect(poll.id).toBeDefined();

      // Store poll ID for later tests
      pollId = poll.id;
    });

    it('should list all polls', async () => {
      const response = await fetch(`${baseURL}/polls`);
      
      expect(response.status).toBe(200);
      const polls = await response.json();
      
      expect(Array.isArray(polls)).toBe(true);
      expect(polls.length).toBeGreaterThan(0);
      
      // Check if our test poll is in the list
      const foundPoll = polls.find(p => p.id === pollId);
      expect(foundPoll).toBeDefined();
    });

    it('should list polls created by a user', async () => {
      const response = await fetch(`${baseURL}/users/${testUser}/polls`);
      
      expect(response.status).toBe(200);
      const polls = await response.json();
      
      expect(Array.isArray(polls)).toBe(true);
      expect(polls.length).toBeGreaterThan(0);

      // All polls should be created by the test user
      polls.forEach(poll => {
        expect(poll.createdBy).toBe(testUser);
      });
    });
  });

  describe('Voting', () => {
    const voter = 'voteUser';

    beforeAll(async () => {
      // Create a voter user
      await fetch(`${baseURL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: voter })
      });
    });

    it('should allow a user to vote on a poll', async () => {
      const optionIndex = 1; // Vote for the second option
      
      const response = await fetch(`${baseURL}/polls/${pollId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: voter, optionIndex })
      });

      expect(response.status).toBe(200);
      const poll = await response.json();
      
      // The vote should be recorded
      expect(poll.votes[voter]).toBe(optionIndex);
    });

    it('should prevent a user from voting twice', async () => {
      const optionIndex = 2; // Try to vote for a different option
      
      const response = await fetch(`${baseURL}/polls/${pollId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: voter, optionIndex })
      });

      expect(response.status).toBe(400);
      const error = await response.json();
      expect(error.error).toContain('already voted');
    });

    it('should list polls a user has voted in', async () => {
      const response = await fetch(`${baseURL}/users/${voter}/votes`);
      
      expect(response.status).toBe(200);
      const polls = await response.json();
      
      expect(Array.isArray(polls)).toBe(true);
      expect(polls.length).toBeGreaterThan(0);

      // Each poll should have a vote from the voter
      polls.forEach(poll => {
        expect(poll.votes).toHaveProperty(voter);
      });
    });

    it('should get poll results', async () => {
      const response = await fetch(`${baseURL}/polls/${pollId}/results`);
      
      expect(response.status).toBe(200);
      const results = await response.json();
      
      expect(results.id).toBe(pollId);
      expect(results.question).toBe(testPoll.question);
      expect(results.totalVotes).toBeGreaterThan(0);
      
      // Results should have counts for each option
      expect(results.results).toHaveLength(testPoll.options.length);
      
      // The option voted for should have a count of 1
      const votedOption = results.results[1]; // We voted for option index 1
      expect(votedOption.votes).toBe(1);
    });
  });

  describe('Poll Deletion', () => {
    it('should not allow a non-creator to delete a poll', async () => {
      const nonCreator = 'nonCreator';
      
      // Create non-creator user
      await fetch(`${baseURL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: nonCreator })
      });

      const response = await fetch(`${baseURL}/polls/${pollId}?username=${nonCreator}`, {
        method: 'DELETE'
      });

      expect(response.status).toBe(403);
    });

    it('should allow the creator to delete their poll', async () => {
      const response = await fetch(`${baseURL}/polls/${pollId}?username=${testUser}`, {
        method: 'DELETE'
      });

      expect(response.status).toBe(200);

      // Verify the poll is deleted
      const checkResponse = await fetch(`${baseURL}/polls/${pollId}`);
      expect(checkResponse.status).toBe(404);
    });
  });
});