/**
 * JsonFileStorage.js
 * 
 * This module provides a concrete implementation of the StorageInterface using JSON files
 * for persistence. It handles reading from and writing to a specific JSON file,
 * maintaining an in-memory cache for performance.
 */

import fs from 'fs/promises';
import path from 'path';
import { StorageInterface } from './StorageInterface.js';
// Note: Concurrency handling (locking) is not implemented in this version.
// Concurrent writes might lead to race conditions or data loss.

/**
 * Implements the StorageInterface using a single JSON file for persistence.
 * Each instance manages data for a specific entity type (e.g., 'users', 'polls').
 * 
 * @extends StorageInterface
 */
export class JsonFileStorage extends StorageInterface {
  /**
   * Creates an instance of JsonFileStorage.
   * 
   * @param {string} dataFolder - The absolute path to the directory where the JSON file will be stored.
   * @param {string} entityType - A string identifying the type of entity this instance manages (e.g., 'users'). Used to name the JSON file (`<entityType>.json`).
   */
  constructor(dataFolder, entityType) {
    super();
    if (!dataFolder || !entityType) {
      throw new Error('JsonFileStorage requires dataFolder and entityType arguments.');
    }
    this.dataFolder = dataFolder;
    this.entityType = entityType;
    this.filePath = path.join(dataFolder, `${entityType}.json`);
    /** @type {Map<string, Object>} */
    this.data = new Map(); // In-memory cache
    this.initialized = false;
  }

  /**
   * Initializes the storage by creating the data folder if it doesn't exist
   * and loading existing data from the JSON file into the in-memory cache.
   * If the file doesn't exist, it creates an empty file.
   * 
   * @async
   * @returns {Promise<void>} A promise that resolves when initialization is complete.
   * @throws {Error} If there's an error creating the directory or reading/writing the initial file.
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      // Create data folder if it doesn't exist
      await fs.mkdir(this.dataFolder, { recursive: true });
      
      try {
        // Try to load existing data
        const fileContent = await fs.readFile(this.filePath, 'utf8');
        const entities = JSON.parse(fileContent);
        
        // Populate in-memory cache
        this.data.clear(); // Ensure cache is empty before loading
        if (Array.isArray(entities)) {
          entities.forEach(entity => {
            // Basic check for ID presence
            if (entity && typeof entity.id !== 'undefined') {
              this.data.set(String(entity.id), { ...entity }); // Store a shallow copy
            } else {
              console.warn(`Skipping entity without ID during load: ${JSON.stringify(entity)}`);
            }
          });
        } else {
           console.warn(`Invalid data format in ${this.filePath}. Expected an array.`);
           // Initialize with empty data and save
           this.data.clear();
           await this._saveToFile();
        }
      } catch (error) {
        if (error.code === 'ENOENT') {
          // If file doesn't exist, initialize with empty array and save
          console.log(`Data file ${this.filePath} not found. Creating a new one.`);
          this.data.clear();
          await this._saveToFile();
        } else if (error instanceof SyntaxError) {
           console.error(`Error parsing JSON in ${this.filePath}. Initializing with empty data.`, error);
           // Handle corrupt JSON file by starting fresh
           this.data.clear();
           await this._saveToFile();
        } else {
          // Rethrow other read errors (e.g., permissions)
          console.error(`Error loading ${this.entityType} data from ${this.filePath}:`, error);
          throw error;
        }
      }
      
      this.initialized = true;
      console.log(`${this.entityType} storage initialized from ${this.filePath}`);
    } catch (error) {
      console.error(`FATAL: Error initializing ${this.entityType} storage:`, error);
      // Prevent the application from potentially running with uninitialized storage
      throw new Error(`Failed to initialize ${this.entityType} storage: ${error.message}`);
    }
  }

  /**
   * Saves the current state of the in-memory cache to the JSON file.
   * This method overwrites the entire file.
   * 
   * @async
   * @private
   * @returns {Promise<void>} A promise that resolves when the file has been written.
   * @throws {Error} If there's an error writing to the file system.
   */
  async _saveToFile() {
    try {
      const entities = Array.from(this.data.values());
      await fs.writeFile(this.filePath, JSON.stringify(entities, null, 2), 'utf8');
    } catch (error) {
      console.error(`Error saving ${this.entityType} data to ${this.filePath}:`, error);
      // Propagate the error so calling operations know the save failed
      throw new Error(`Failed to save ${this.entityType} data: ${error.message}`);
    }
  }

  /**
   * Ensures the storage has been initialized before performing an operation.
   * Calls `initialize()` if it hasn't been called yet.
   * 
   * @async
   * @private
   * @returns {Promise<void>} A promise that resolves when initialization is confirmed.
   * @throws {Error} If initialization fails.
   */
  async _ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Creates a new entity, adds it to the cache, and saves to the file.
   * 
   * @async
   * @param {string} id - The unique identifier for the new entity.
   * @param {Object} data - The data object for the entity (ID should not be included here).
   * @returns {Promise<Object>} The created entity object (including ID).
   * @throws {Error} If an entity with the same ID already exists.
   * @throws {Error} If initialization fails.
   * @throws {Error} If saving to the file fails.
   */
  async create(id, data) {
    await this._ensureInitialized();
    
    const stringId = String(id); // Ensure ID is a string for map key consistency
    if (this.data.has(stringId)) {
      throw new Error(this._formatDuplicateError(stringId));
    }
    
    // Store a deep copy to prevent external mutations affecting the cache/file
    const storedData = JSON.parse(JSON.stringify(data));
    const newEntity = { id: stringId, ...storedData };
    this.data.set(stringId, newEntity);
    
    // Save to file
    await this._saveToFile();
    
    // Return a deep copy of the newly created entity
    return JSON.parse(JSON.stringify(newEntity));
  }

  /**
   * Gets an entity by ID from the in-memory cache.
   * 
   * @async
   * @param {string} id - The ID of the entity to retrieve.
   * @returns {Promise<Object|null>} The entity object if found (as a deep copy), or null otherwise.
   * @throws {Error} If initialization fails.
   */
  async getById(id) {
    await this._ensureInitialized();
    
    const stringId = String(id);
    if (!this.data.has(stringId)) {
      return null;
    }
    
    // Return a deep copy to prevent external mutations affecting the cache
    const storedData = this.data.get(stringId);
    return JSON.parse(JSON.stringify(storedData));
  }

  /**
   * Updates an existing entity in the cache and saves to the file.
   * 
   * @async
   * @param {string} id - The ID of the entity to update.
   * @param {Object} data - The updated data object for the entity (ID should not be included here). This replaces the existing data.
   * @returns {Promise<Object>} The updated entity object (including ID).
   * @throws {Error} If no entity with the specified ID is found.
   * @throws {Error} If initialization fails.
   * @throws {Error} If saving to the file fails.
   */
  async update(id, data) {
    await this._ensureInitialized();
    
    const stringId = String(id);
    if (!this.data.has(stringId)) {
      throw new Error(this._formatNotFoundError(stringId));
    }
    
    // Store a deep copy of the new data
    const storedData = JSON.parse(JSON.stringify(data));
    // Ensure the ID from the path parameter is preserved, not overwritten by data payload
    const updatedEntity = { id: stringId, ...storedData }; 
    this.data.set(stringId, updatedEntity);
    
    // Save to file
    await this._saveToFile();
    
    // Return a deep copy of the updated entity
    return JSON.parse(JSON.stringify(updatedEntity));
  }

  /**
   * Deletes an entity by ID from the cache and saves to the file.
   * 
   * @async
   * @param {string} id - The ID of the entity to delete.
   * @returns {Promise<boolean>} True if the entity was deleted, false if it was not found.
   * @throws {Error} If initialization fails.
   * @throws {Error} If saving to the file fails.
   */
  async delete(id) {
    await this._ensureInitialized();
    
    const stringId = String(id);
    if (!this.data.has(stringId)) {
      return false;
    }
    
    this.data.delete(stringId);
    
    // Save to file
    await this._saveToFile();
    
    return true;
  }

  /**
   * Gets all entities from the in-memory cache.
   * 
   * @async
   * @returns {Promise<Array<Object>>} An array containing deep copies of all entities.
   * @throws {Error} If initialization fails.
   */
  async getAll() {
    await this._ensureInitialized();
    
    // Return deep copies to prevent external mutation
    return Array.from(this.data.values()).map(entity => 
      JSON.parse(JSON.stringify(entity))
    );
  }

  /**
   * Filters entities from the in-memory cache based on a criteria function.
   * 
   * @async
   * @param {Function} filterFn - A function that takes an entity object and returns true if it should be included.
   * @returns {Promise<Array<Object>>} An array containing deep copies of the filtered entities.
   * @throws {Error} If initialization fails.
   * @throws {Error} If the provided filterFn is not a function or throws an error during execution.
   */
  async filter(filterFn) {
    await this._ensureInitialized();
    
    if (typeof filterFn !== 'function') {
        throw new Error('filterFn must be a function');
    }

    const filteredEntities = [];
    try {
        for (const entity of this.data.values()) {
          // Operate on the cached data
          if (filterFn(entity)) {
            // Return deep copies to prevent external mutation
            filteredEntities.push(JSON.parse(JSON.stringify(entity)));
          }
        }
    } catch (error) {
        console.error(`Error during filter execution for ${this.entityType}:`, error);
        throw new Error(`Filter function failed during execution: ${error.message}`);
    }
    
    return filteredEntities;
  }
  
  /**
   * Formats the error message for a duplicate entity scenario.
   * Can be overridden by subclasses for more specific messages.
   * 
   * @param {string} id - The ID of the entity that already exists.
   * @returns {string} The formatted error message.
   * @protected
   */
  _formatDuplicateError(id) {
    // Default message, subclasses can provide more context (e.g., "Username '...' already exists")
    return `Entity with ID '${id}' already exists in ${this.entityType}`;
  }

  /**
   * Formats the error message for an entity not found scenario.
   * Can be overridden by subclasses for more specific messages.
   * 
   * @param {string} id - The ID of the entity that was not found.
   * @returns {string} The formatted error message.
   * @protected
   */
  _formatNotFoundError(id) {
     // Default message, subclasses can provide more context (e.g., "User '...' not found")
    return `Entity with ID '${id}' not found in ${this.entityType}`;
  }
}

