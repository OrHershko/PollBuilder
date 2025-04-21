/**
 * StorageInterface.js
 * 
 * This module defines the abstract interface for storage implementations.
 * All concrete storage classes (like JsonFileStorage) must implement these methods.
 * This ensures a consistent API for data persistence regardless of the underlying mechanism.
 */

/**
 * Abstract base class defining the contract for storage implementations.
 * Methods in this class throw 'Method not implemented' errors and should be overridden
 * by concrete subclasses.
 */
export class StorageInterface {
  /**
   * Creates a new entity in the storage.
   * 
   * @async
   * @param {string} id - The unique identifier for the new entity.
   * @param {Object} data - The data object representing the entity to be created.
   * @returns {Promise<Object>} A promise that resolves with the newly created entity object (including its ID).
   * @throws {Error} If the 'create' method is not implemented by the subclass.
   * @throws {Error} Potentially throws if an entity with the same ID already exists (implementation-dependent).
   * @throws {Error} Potentially throws if there's an issue writing to the storage medium (e.g., file system error, database error).
   */
  async create(id, data) {
    throw new Error('Method not implemented: create');
  }

  /**
   * Retrieves an entity from the storage by its unique identifier.
   * 
   * @async
   * @param {string} id - The unique identifier of the entity to retrieve.
   * @returns {Promise<Object|null>} A promise that resolves with the entity object if found, or null if no entity with the given ID exists.
   * @throws {Error} If the 'getById' method is not implemented by the subclass.
   * @throws {Error} Potentially throws if there's an issue reading from the storage medium.
   */
  async getById(id) {
    throw new Error('Method not implemented: getById');
  }

  /**
   * Updates an existing entity in the storage.
   * 
   * @async
   * @param {string} id - The unique identifier of the entity to update.
   * @param {Object} data - The data object containing the updated fields for the entity. This typically replaces the entire entity data except for the ID.
   * @returns {Promise<Object>} A promise that resolves with the updated entity object.
   * @throws {Error} If the 'update' method is not implemented by the subclass.
   * @throws {Error} Potentially throws if no entity with the specified ID is found (implementation-dependent).
   * @throws {Error} Potentially throws if there's an issue writing to the storage medium.
   */
  async update(id, data) {
    throw new Error('Method not implemented: update');
  }

  /**
   * Deletes an entity from the storage by its unique identifier.
   * 
   * @async
   * @param {string} id - The unique identifier of the entity to delete.
   * @returns {Promise<boolean>} A promise that resolves with true if the entity was successfully deleted, or false if no entity with the given ID was found.
   * @throws {Error} If the 'delete' method is not implemented by the subclass.
   * @throws {Error} Potentially throws if there's an issue writing to the storage medium.
   */
  async delete(id) {
    throw new Error('Method not implemented: delete');
  }

  /**
   * Retrieves all entities of this type from the storage.
   * 
   * @async
   * @returns {Promise<Array<Object>>} A promise that resolves with an array containing all entity objects. The array may be empty if no entities exist.
   * @throws {Error} If the 'getAll' method is not implemented by the subclass.
   * @throws {Error} Potentially throws if there's an issue reading from the storage medium.
   */
  async getAll() {
    throw new Error('Method not implemented: getAll');
  }

  /**
   * Retrieves entities that match a specific filtering criterion.
   * 
   * @async
   * @param {Function} filterFn - A function that takes an entity object as input and returns true if the entity should be included in the results, false otherwise.
   * @returns {Promise<Array<Object>>} A promise that resolves with an array containing the entity objects that satisfy the filter function. The array may be empty.
   * @throws {Error} If the 'filter' method is not implemented by the subclass.
   * @throws {Error} Potentially throws if there's an issue reading from the storage medium.
   */
  async filter(filterFn) {
    throw new Error('Method not implemented: filter');
  }
}