/**
 * StorageInterface.js
 * 
 * This module defines the interface for storage implementations.
 * All storage implementations must implement these methods.
 */

/**
 * Base storage interface that all specific storage interfaces should extend
 */
export class StorageInterface {
  /**
   * Creates a new entity
   * @param {string} id - The ID of the entity
   * @param {Object} data - The entity data
   * @returns {Promise<Object>} - The created entity
   */
  async create(id, data) {
    throw new Error('Method not implemented');
  }

  /**
   * Gets an entity by ID
   * @param {string} id - The ID of the entity
   * @returns {Promise<Object|null>} - The entity or null if not found
   */
  async getById(id) {
    throw new Error('Method not implemented');
  }

  /**
   * Updates an entity
   * @param {string} id - The ID of the entity
   * @param {Object} data - The updated entity data
   * @returns {Promise<Object>} - The updated entity
   */
  async update(id, data) {
    throw new Error('Method not implemented');
  }

  /**
   * Deletes an entity by ID
   * @param {string} id - The ID of the entity
   * @returns {Promise<boolean>} - True if deleted, false if not found
   */
  async delete(id) {
    throw new Error('Method not implemented');
  }

  /**
   * Gets all entities
   * @returns {Promise<Array<Object>>} - All entities
   */
  async getAll() {
    throw new Error('Method not implemented');
  }

  /**
   * Filters entities by criteria
   * @param {Function} filterFn - Filter function that returns true for matched entities
   * @returns {Promise<Array<Object>>} - Filtered entities
   */
  async filter(filterFn) {
    throw new Error('Method not implemented');
  }
}