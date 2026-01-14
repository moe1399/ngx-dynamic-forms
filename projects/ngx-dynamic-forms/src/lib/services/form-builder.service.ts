import { Injectable, signal } from '@angular/core';
import {
  FormConfig,
  FormConfigVersion,
  FormConfigWithHistory,
  VersionHistoryConfig,
} from '../models/form-config.interface';

@Injectable({
  providedIn: 'root',
})
export class FormBuilderService {
  private readonly STORAGE_KEY = 'custom_form_configs';
  private readonly HISTORY_STORAGE_KEY = 'custom_form_configs_history';
  private readonly DEFAULT_MAX_VERSIONS = 50;

  // Signal to track all saved form configurations
  savedConfigs = signal<FormConfig[]>([]);

  // Signal for version history configuration
  versionHistoryConfig = signal<VersionHistoryConfig>({
    enabled: true,
    maxVersions: 50,
  });

  constructor() {
    this.loadAllConfigs();
  }

  /**
   * Save a form configuration to local storage.
   * Creates a version snapshot before overwriting existing configs.
   */
  saveConfig(config: FormConfig): void {
    const configs = this.getAllConfigs();
    const existingIndex = configs.findIndex((c) => c.id === config.id);

    // If updating existing config, create version snapshot first
    if (existingIndex >= 0 && this.versionHistoryConfig().enabled !== false) {
      this.saveVersion(config.id, configs[existingIndex], undefined, true);
    }

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
   * Delete a form configuration and its version history
   */
  deleteConfig(id: string): void {
    const configs = this.getAllConfigs().filter((c) => c.id !== id);

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(configs));
      this.savedConfigs.set(configs);

      // Also delete version history
      this.deleteVersionHistory(id);
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

  // ============================================
  // Version History Methods
  // ============================================

  /**
   * Generate unique version ID based on timestamp
   */
  private generateVersionId(): string {
    return `v_${Date.now()}`;
  }

  /**
   * Get all version history for all forms from localStorage
   */
  private getAllVersionHistory(): { [formId: string]: FormConfigVersion[] } {
    try {
      const stored = localStorage.getItem(this.HISTORY_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Error loading version history:', error);
      return {};
    }
  }

  /**
   * Create a version snapshot for a form configuration
   * @param formId - The form ID to create a version for
   * @param config - The form configuration to snapshot
   * @param description - Optional description for this version
   * @param isAutoSave - Whether this is an automatic save (default: true)
   * @returns The version ID of the created version
   */
  saveVersion(
    formId: string,
    config: FormConfig,
    description?: string,
    isAutoSave = true
  ): string {
    const history = this.getAllVersionHistory();
    const formVersions = history[formId] || [];

    // Calculate next version number
    const nextVersionNumber =
      formVersions.length > 0
        ? Math.max(...formVersions.map((v) => v.versionNumber)) + 1
        : 1;

    const newVersion: FormConfigVersion = {
      id: this.generateVersionId(),
      config: structuredClone(config),
      timestamp: Date.now(),
      createdAt: new Date().toISOString(),
      description,
      versionNumber: nextVersionNumber,
      isAutoSave,
    };

    // Add new version at the beginning (newest first)
    formVersions.unshift(newVersion);

    // Trim to max versions
    const maxVersions =
      this.versionHistoryConfig().maxVersions || this.DEFAULT_MAX_VERSIONS;
    if (formVersions.length > maxVersions) {
      formVersions.splice(maxVersions);
    }

    history[formId] = formVersions;

    try {
      localStorage.setItem(this.HISTORY_STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Error saving version history:', error);
    }

    return newVersion.id;
  }

  /**
   * Get version history for a specific form
   * @param formId - The form ID to get history for
   * @returns Array of versions, newest first
   */
  getVersionHistory(formId: string): FormConfigVersion[] {
    const history = this.getAllVersionHistory();
    return history[formId] || [];
  }

  /**
   * Restore a previous version as the current configuration
   * @param formId - The form ID
   * @param versionId - The version ID to restore
   * @returns The restored FormConfig or null if not found
   */
  restoreVersion(formId: string, versionId: string): FormConfig | null {
    const versions = this.getVersionHistory(formId);
    const version = versions.find((v) => v.id === versionId);

    if (!version) {
      console.error(`Version ${versionId} not found for form ${formId}`);
      return null;
    }

    // Return a deep clone of the config to prevent mutations
    return structuredClone(version.config);
  }

  /**
   * Delete old versions, keeping only the specified count
   * @param formId - The form ID
   * @param keepCount - Number of versions to keep (default: use config)
   */
  deleteOldVersions(formId: string, keepCount?: number): void {
    const history = this.getAllVersionHistory();
    const formVersions = history[formId];

    if (!formVersions) return;

    const maxToKeep =
      keepCount ??
      this.versionHistoryConfig().maxVersions ??
      this.DEFAULT_MAX_VERSIONS;

    if (formVersions.length > maxToKeep) {
      history[formId] = formVersions.slice(0, maxToKeep);

      try {
        localStorage.setItem(this.HISTORY_STORAGE_KEY, JSON.stringify(history));
      } catch (error) {
        console.error('Error saving version history:', error);
      }
    }
  }

  /**
   * Delete all version history for a form
   * @param formId - The form ID to delete history for
   */
  private deleteVersionHistory(formId: string): void {
    const history = this.getAllVersionHistory();
    delete history[formId];

    try {
      localStorage.setItem(this.HISTORY_STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Error deleting version history:', error);
    }
  }

  // ============================================
  // External Storage Consumer Methods
  // ============================================

  /**
   * Creates a new version and returns complete FormConfigWithHistory
   * for external storage consumers to persist to their own storage
   *
   * @param config - The current form config
   * @param existingHistory - Existing version history array from consumer's storage
   * @param description - Optional description for this version
   * @param isAutoSave - Whether this is an automatic save
   * @returns FormConfigWithHistory - Complete data structure for consumer to persist
   */
  createVersionForExternalStorage(
    config: FormConfig,
    existingHistory: FormConfigVersion[] = [],
    description?: string,
    isAutoSave = true
  ): FormConfigWithHistory {
    // Calculate next version number
    const nextVersionNumber =
      existingHistory.length > 0
        ? Math.max(...existingHistory.map((v) => v.versionNumber)) + 1
        : 1;

    const newVersion: FormConfigVersion = {
      id: this.generateVersionId(),
      config: structuredClone(config),
      timestamp: Date.now(),
      createdAt: new Date().toISOString(),
      description,
      versionNumber: nextVersionNumber,
      isAutoSave,
    };

    // Create new history array with new version at start
    const updatedHistory = [newVersion, ...existingHistory];

    // Trim to max versions
    const maxVersions =
      this.versionHistoryConfig().maxVersions || this.DEFAULT_MAX_VERSIONS;
    const trimmedHistory = updatedHistory.slice(0, maxVersions);

    return {
      current: structuredClone(config),
      versions: trimmedHistory,
      maxVersions,
    };
  }

  /**
   * Prepares a version restore for external storage consumers
   * Returns FormConfigWithHistory with the restored config as current
   *
   * @param versionId - Version ID to restore
   * @param existingHistory - Existing version history array from consumer's storage
   * @returns FormConfigWithHistory with restored config, or null if version not found
   */
  restoreVersionForExternalStorage(
    versionId: string,
    existingHistory: FormConfigVersion[]
  ): FormConfigWithHistory | null {
    const version = existingHistory.find((v) => v.id === versionId);

    if (!version) {
      console.error(`Version ${versionId} not found`);
      return null;
    }

    // The restored config becomes current; history remains unchanged
    // (We don't create a new version on restore - that happens on next save)
    return {
      current: structuredClone(version.config),
      versions: existingHistory,
      maxVersions:
        this.versionHistoryConfig().maxVersions || this.DEFAULT_MAX_VERSIONS,
    };
  }
}
