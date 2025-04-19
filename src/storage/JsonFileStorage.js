/**
 * JsonFileStorage.js
 * 
 * This module provides a JSON file-based implementation of the storage interface.
 * Data is persisted to JSON files on disk.
 */

import fs from 'fs/promises';
import path from 'path';
import { StorageInterface } from './StorageInterface.js';

/**
 * JSON file-based implementation of the storage interface
 */
export class JsonFileStorage extends StorageInterface {
  /**
   * Constructor
   * @param {string} dataFolder - Folder path to store JSON files
   * @param {string} entityType - Type of entity (e.g., 'users', 'polls')
   */
  constructor(dataFolder, entityType) {
    super();
    this.dataFolder = dataFolder;
    this.entityType = entityType;
    this.filePath = path.join(dataFolder, `${entityType}.json`);
    this.data = new Map(); // In-memory cache
    this.initialized = false;
  }

  /**
   * Initializes the storage by creating data folder and loading data
   * @returns {Promise<void>}
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
        entities.forEach(entity => {
          this.data.set(entity.id, { ...entity });
        });
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.error(`Error loading ${this.entityType} data:`, error);
        }
        // If file doesn't exist, initialize with empty array
        await this._saveToFile();
      }
      
      this.initialized = true;
    } catch (error) {
      console.error(`Error initializing ${this.entityType} storage:`, error);
      throw error;
    }
  }

  /**
   * Saves current data to file
   * @returns {Promise<void>}
   * @private
   */
  async _saveToFile() {
    try {
      const entities = Array.from(this.data.values());
      await fs.writeFile(this.filePath, JSON.stringify(entities, null, 2), 'utf8');
    } catch (error) {
      console.error(`Error saving ${this.entityType} data:`, error);
      throw error;
    }
  }

  /**
   * Ensures storage is initialized
   * @returns {Promise<void>}
   * @private
   */
  async _ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Creates a new entity
   * @param {string} id - The ID of the entity
   * @param {Object} data - The entity data
   * @returns {Promise<Object>} - The created entity
   */
  async create(id, data) {
    await this._ensureInitialized();
    
    if (this.data.has(id)) {
      throw new Error(`Username ${username} already exists, try a different one.`);
    }
    
    // Store a deep copy to prevent external mutation
    const storedData = JSON.parse(JSON.stringify(data));
    this.data.set(id, { id, ...storedData });
    
    // Save to file
    await this._saveToFile();
    
    return { id, ...storedData };
  }

  /**
   * Gets an entity by ID
   * @param {string} id - The ID of the entity
   * @returns {Promise<Object|null>} - The entity or null if not found
   */
  async getById(id) {
    await this._ensureInitialized();
    
    if (!this.data.has(id)) {
      return null;
    }
    
    // Return a deep copy to prevent external mutation
    const storedData = this.data.get(id);
    return JSON.parse(JSON.stringify(storedData));
  }

  /**
   * Updates an entity
   * @param {string} id - The ID of the entity
   * @param {Object} data - The updated entity data
   * @returns {Promise<Object>} - The updated entity
   */
  async update(id, data) {
    await this._ensureInitialized();
    
    if (!this.data.has(id)) {
      throw new Error(`Entity with ID ${id} does not exist`);
    }
    
    // Store a deep copy to prevent external mutation
    const storedData = JSON.parse(JSON.stringify(data));
    this.data.set(id, { id, ...storedData });
    
    // Save to file
    await this._saveToFile();
    
    return { id, ...storedData };
  }

  /**
   * Deletes an entity by ID
   * @param {string} id - The ID of the entity
   * @returns {Promise<boolean>} - True if deleted, false if not found
   */
  async delete(id) {
    await this._ensureInitialized();
    
    if (!this.data.has(id)) {
      return false;
    }
    
    this.data.delete(id);
    
    // Save to file
    await this._saveToFile();
    
    return true;
  }

  /**
   * Gets all entities
   * @returns {Promise<Array<Object>>} - All entities
   */
  async getAll() {
    await this._ensureInitialized();
    
    // Return deep copies to prevent external mutation
    return Array.from(this.data.values()).map(entity => 
      JSON.parse(JSON.stringify(entity))
    );
  }

  /**
   * Filters entities by criteria
   * @param {Function} filterFn - Filter function that returns true for matched entities
   * @returns {Promise<Array<Object>>} - Filtered entities
   */
  async filter(filterFn) {
    await this._ensureInitialized();
    
    const filteredEntities = [];
    
    for (const entity of this.data.values()) {
      if (filterFn(entity)) {
        // Return deep copies to prevent external mutation
        filteredEntities.push(JSON.parse(JSON.stringify(entity)));
      }
    }
    
    return filteredEntities;
  }
}