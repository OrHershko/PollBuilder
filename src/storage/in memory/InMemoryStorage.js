/**
 * InMemoryStorage.js
 * 
 * This module provides an in-memory implementation of the storage interface.
 */

import { StorageInterface } from './StorageInterface.js';

/**
 * In-memory implementation of the storage interface
 */
export class InMemoryStorage extends StorageInterface {
  constructor() {
    super();
    this.data = new Map();
  }

  /**
   * Creates a new entity
   * @param {string} id - The ID of the entity
   * @param {Object} data - The entity data
   * @returns {Promise<Object>} - The created entity
   */
  async create(id, data) {
    if (this.data.has(id)) {
      throw new Error(`Entity with ID ${id} already exists`);
    }
    
    // Store a deep copy to prevent external mutation
    const storedData = JSON.parse(JSON.stringify(data));
    this.data.set(id, storedData);
    return { id, ...storedData };
  }

  /**
   * Gets an entity by ID
   * @param {string} id - The ID of the entity
   * @returns {Promise<Object|null>} - The entity or null if not found
   */
  async getById(id) {
    if (!this.data.has(id)) {
      return null;
    }
    
    // Return a deep copy to prevent external mutation
    const storedData = this.data.get(id);
    return { id, ...JSON.parse(JSON.stringify(storedData)) };
  }

  /**
   * Updates an entity
   * @param {string} id - The ID of the entity
   * @param {Object} data - The updated entity data
   * @returns {Promise<Object>} - The updated entity
   */
  async update(id, data) {
    if (!this.data.has(id)) {
      throw new Error(`Entity with ID ${id} does not exist`);
    }
    
    // Store a deep copy to prevent external mutation
    const storedData = JSON.parse(JSON.stringify(data));
    this.data.set(id, storedData);
    return { id, ...storedData };
  }

  /**
   * Deletes an entity by ID
   * @param {string} id - The ID of the entity
   * @returns {Promise<boolean>} - True if deleted, false if not found
   */
  async delete(id) {
    if (!this.data.has(id)) {
      return false;
    }
    
    this.data.delete(id);
    return true;
  }

  /**
   * Gets all entities
   * @returns {Promise<Array<Object>>} - All entities
   */
  async getAll() {
    const allEntities = [];
    
    for (const [id, data] of this.data.entries()) {
      // Return deep copies to prevent external mutation
      allEntities.push({ id, ...JSON.parse(JSON.stringify(data)) });
    }
    
    return allEntities;
  }

  /**
   * Filters entities by criteria
   * @param {Function} filterFn - Filter function that returns true for matched entities
   * @returns {Promise<Array<Object>>} - Filtered entities
   */
  async filter(filterFn) {
    const filteredEntities = [];
    
    for (const [id, data] of this.data.entries()) {
      const entity = { id, ...data };
      if (filterFn(entity)) {
        // Return deep copies to prevent external mutation
        filteredEntities.push({ id, ...JSON.parse(JSON.stringify(data)) });
      }
    }
    
    return filteredEntities;
  }
}