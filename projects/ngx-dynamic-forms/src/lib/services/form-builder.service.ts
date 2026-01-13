import { Injectable, signal } from '@angular/core';
import { FormConfig } from '../models/form-config.interface';

@Injectable({
  providedIn: 'root',
})
export class FormBuilderService {
  private readonly STORAGE_KEY = 'custom_form_configs';

  // Signal to track all saved form configurations
  savedConfigs = signal<FormConfig[]>([]);

  constructor() {
    this.loadAllConfigs();
  }

  /**
   * Save a form configuration to local storage
   */
  saveConfig(config: FormConfig): void {
    const configs = this.getAllConfigs();
    const existingIndex = configs.findIndex((c) => c.id === config.id);

    if (existingIndex >= 0) {
      configs[existingIndex] = config;
    } else {
      configs.push(config);
    }

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(configs));
      this.savedConfigs.set(configs);
    } catch (error) {
      console.error('Error saving form configuration:', error);
    }
  }

  /**
   * Load a specific form configuration by ID
   */
  loadConfig(id: string): FormConfig | null {
    const configs = this.getAllConfigs();
    return configs.find((c) => c.id === id) || null;
  }

  /**
   * Get all form configurations
   */
  getAllConfigs(): FormConfig[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading form configurations:', error);
      return [];
    }
  }

  /**
   * Delete a form configuration
   */
  deleteConfig(id: string): void {
    const configs = this.getAllConfigs().filter((c) => c.id !== id);

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(configs));
      this.savedConfigs.set(configs);
    } catch (error) {
      console.error('Error deleting form configuration:', error);
    }
  }

  /**
   * Load all configs into signal
   */
  private loadAllConfigs(): void {
    this.savedConfigs.set(this.getAllConfigs());
  }

  /**
   * Create a blank form configuration template
   */
  createBlankConfig(): FormConfig {
    return {
      id: `form-${Date.now()}`,
      fields: [],
    };
  }

  /**
   * Export configuration as JSON
   */
  exportConfig(config: FormConfig): string {
    return JSON.stringify(config, null, 2);
  }

  /**
   * Import configuration from JSON
   */
  importConfig(json: string): FormConfig | null {
    try {
      const config = JSON.parse(json) as FormConfig;
      // Validate that it has required properties
      if (config.id && Array.isArray(config.fields)) {
        return config;
      }
    } catch (error) {
      console.error('Error importing form configuration:', error);
    }
    return null;
  }
}
