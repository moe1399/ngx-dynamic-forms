import { TestBed } from '@angular/core/testing';
import { FormBuilderService } from './form-builder.service';
import { FormConfig, FormConfigVersion } from '../models/form-config.interface';

describe('FormBuilderService', () => {
  let service: FormBuilderService;

  const createMockConfig = (id: string): FormConfig => ({
    id,
    fields: [{ name: 'test', label: 'Test', type: 'text' }],
  });

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FormBuilderService);

    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('saveVersion', () => {
    it('should create a version with correct structure', () => {
      const config = createMockConfig('test-form');
      const versionId = service.saveVersion(config.id, config, 'Test description');

      const versions = service.getVersionHistory(config.id);
      expect(versions.length).toBe(1);
      expect(versions[0].id).toBe(versionId);
      expect(versions[0].config.id).toBe(config.id);
      expect(versions[0].description).toBe('Test description');
      expect(versions[0].versionNumber).toBe(1);
      expect(versions[0].isAutoSave).toBe(true);
      expect(versions[0].timestamp).toBeDefined();
      expect(versions[0].createdAt).toBeDefined();
    });

    it('should increment version numbers sequentially', () => {
      const config = createMockConfig('test-form');

      service.saveVersion(config.id, config);
      service.saveVersion(config.id, config);
      service.saveVersion(config.id, config);

      const versions = service.getVersionHistory(config.id);
      expect(versions.length).toBe(3);
      // Newest first, so version numbers are 3, 2, 1
      expect(versions[0].versionNumber).toBe(3);
      expect(versions[1].versionNumber).toBe(2);
      expect(versions[2].versionNumber).toBe(1);
    });

    it('should store versions newest-first', () => {
      const config = createMockConfig('test-form');

      service.saveVersion(config.id, config, 'First');
      service.saveVersion(config.id, config, 'Second');
      service.saveVersion(config.id, config, 'Third');

      const versions = service.getVersionHistory(config.id);
      expect(versions[0].description).toBe('Third');
      expect(versions[1].description).toBe('Second');
      expect(versions[2].description).toBe('First');
    });

    it('should trim to maxVersions when exceeded', () => {
      const config = createMockConfig('test-form');
      service.versionHistoryConfig.set({ enabled: true, maxVersions: 3 });

      for (let i = 0; i < 5; i++) {
        service.saveVersion(config.id, config, `Version ${i + 1}`);
      }

      const versions = service.getVersionHistory(config.id);
      expect(versions.length).toBe(3);
      // Newest versions should be kept
      expect(versions[0].description).toBe('Version 5');
      expect(versions[1].description).toBe('Version 4');
      expect(versions[2].description).toBe('Version 3');
    });

    it('should deep clone config to prevent mutations', () => {
      const config = createMockConfig('test-form');
      service.saveVersion(config.id, config);

      // Mutate the original config
      config.fields[0].label = 'Modified';

      const versions = service.getVersionHistory(config.id);
      expect(versions[0].config.fields[0].label).toBe('Test');
    });

    it('should distinguish manual saves from auto-saves', () => {
      const config = createMockConfig('test-form');

      service.saveVersion(config.id, config, 'Auto save', true);
      service.saveVersion(config.id, config, 'Manual save', false);

      const versions = service.getVersionHistory(config.id);
      expect(versions[0].isAutoSave).toBe(false);
      expect(versions[1].isAutoSave).toBe(true);
    });
  });

  describe('getVersionHistory', () => {
    it('should return empty array for non-existent form', () => {
      const versions = service.getVersionHistory('non-existent');
      expect(versions).toEqual([]);
    });

    it('should return versions in correct order (newest first)', () => {
      const config = createMockConfig('test-form');

      service.saveVersion(config.id, config, 'First');
      service.saveVersion(config.id, config, 'Second');

      const versions = service.getVersionHistory(config.id);
      expect(versions[0].description).toBe('Second');
      expect(versions[1].description).toBe('First');
    });
  });

  describe('restoreVersion', () => {
    it('should return correct config for valid versionId', () => {
      const config = createMockConfig('test-form');
      config.fields[0].label = 'Original';

      const versionId = service.saveVersion(config.id, config);

      const restored = service.restoreVersion(config.id, versionId);
      expect(restored).not.toBeNull();
      expect(restored!.fields[0].label).toBe('Original');
    });

    it('should return null for invalid versionId', () => {
      const config = createMockConfig('test-form');
      service.saveVersion(config.id, config);

      const restored = service.restoreVersion(config.id, 'invalid-version-id');
      expect(restored).toBeNull();
    });

    it('should return deep clone to prevent mutations', () => {
      const config = createMockConfig('test-form');
      const versionId = service.saveVersion(config.id, config);

      const restored1 = service.restoreVersion(config.id, versionId);
      restored1!.fields[0].label = 'Modified';

      const restored2 = service.restoreVersion(config.id, versionId);
      expect(restored2!.fields[0].label).toBe('Test');
    });
  });

  describe('deleteOldVersions', () => {
    it('should remove versions beyond keepCount', () => {
      const config = createMockConfig('test-form');

      for (let i = 0; i < 5; i++) {
        service.saveVersion(config.id, config, `Version ${i + 1}`);
      }

      service.deleteOldVersions(config.id, 2);

      const versions = service.getVersionHistory(config.id);
      expect(versions.length).toBe(2);
      expect(versions[0].description).toBe('Version 5');
      expect(versions[1].description).toBe('Version 4');
    });

    it('should keep correct number of versions', () => {
      const config = createMockConfig('test-form');

      for (let i = 0; i < 10; i++) {
        service.saveVersion(config.id, config);
      }

      service.deleteOldVersions(config.id, 5);

      const versions = service.getVersionHistory(config.id);
      expect(versions.length).toBe(5);
    });

    it('should do nothing if fewer versions than keepCount', () => {
      const config = createMockConfig('test-form');

      service.saveVersion(config.id, config);
      service.saveVersion(config.id, config);

      service.deleteOldVersions(config.id, 5);

      const versions = service.getVersionHistory(config.id);
      expect(versions.length).toBe(2);
    });
  });

  describe('saveConfig (with version history)', () => {
    it('should create version before overwriting existing config', () => {
      const config = createMockConfig('test-form');
      config.fields[0].label = 'V1';

      // First save (new config - no version created)
      service.saveConfig(config);

      // Modify and save again (should create version of V1)
      const updatedConfig = { ...config, fields: [{ ...config.fields[0], label: 'V2' }] };
      service.saveConfig(updatedConfig);

      const versions = service.getVersionHistory(config.id);
      expect(versions.length).toBe(1);
      expect(versions[0].config.fields[0].label).toBe('V1');
    });

    it('should not create version for new configs', () => {
      const config = createMockConfig('new-form');
      service.saveConfig(config);

      const versions = service.getVersionHistory(config.id);
      expect(versions.length).toBe(0);
    });

    it('should respect version history enabled setting', () => {
      const config = createMockConfig('test-form');
      service.saveConfig(config);

      service.versionHistoryConfig.set({ enabled: false });

      const updatedConfig = { ...config, fields: [{ ...config.fields[0], label: 'Modified' }] };
      service.saveConfig(updatedConfig);

      const versions = service.getVersionHistory(config.id);
      expect(versions.length).toBe(0);
    });
  });

  describe('deleteConfig (with version history)', () => {
    it('should delete version history along with config', () => {
      const config = createMockConfig('test-form');
      service.saveConfig(config);

      // Create some versions
      service.saveVersion(config.id, config);
      service.saveVersion(config.id, config);

      expect(service.getVersionHistory(config.id).length).toBe(2);

      service.deleteConfig(config.id);

      expect(service.getVersionHistory(config.id).length).toBe(0);
    });
  });

  describe('createVersionForExternalStorage', () => {
    it('should return correct FormConfigWithHistory structure', () => {
      const config = createMockConfig('test-form');

      const result = service.createVersionForExternalStorage(config, [], 'Initial version');

      expect(result.current.id).toBe(config.id);
      expect(result.versions.length).toBe(1);
      expect(result.versions[0].description).toBe('Initial version');
      expect(result.maxVersions).toBeDefined();
    });

    it('should increment version number correctly', () => {
      const config = createMockConfig('test-form');

      const existingHistory: FormConfigVersion[] = [
        {
          id: 'v_1',
          config,
          timestamp: Date.now(),
          createdAt: new Date().toISOString(),
          versionNumber: 1,
        },
        {
          id: 'v_2',
          config,
          timestamp: Date.now(),
          createdAt: new Date().toISOString(),
          versionNumber: 2,
        },
      ];

      const result = service.createVersionForExternalStorage(config, existingHistory);

      expect(result.versions[0].versionNumber).toBe(3);
    });

    it('should trim to maxVersions', () => {
      const config = createMockConfig('test-form');
      service.versionHistoryConfig.set({ enabled: true, maxVersions: 2 });

      // existingHistory is in newest-first order (like returned by getVersionHistory)
      const existingHistory: FormConfigVersion[] = [
        {
          id: 'v_2',
          config,
          timestamp: Date.now(),
          createdAt: new Date().toISOString(),
          versionNumber: 2,
        },
        {
          id: 'v_1',
          config,
          timestamp: Date.now() - 1000,
          createdAt: new Date(Date.now() - 1000).toISOString(),
          versionNumber: 1,
        },
      ];

      const result = service.createVersionForExternalStorage(config, existingHistory);

      expect(result.versions.length).toBe(2);
      expect(result.versions[0].versionNumber).toBe(3); // Newest (just created)
      expect(result.versions[1].versionNumber).toBe(2); // Second newest (v1 dropped)
    });
  });

  describe('restoreVersionForExternalStorage', () => {
    it('should return correct structure with restored config', () => {
      const config = createMockConfig('test-form');
      config.fields[0].label = 'Original';

      const existingHistory: FormConfigVersion[] = [
        {
          id: 'v_1',
          config,
          timestamp: Date.now(),
          createdAt: new Date().toISOString(),
          versionNumber: 1,
        },
      ];

      const result = service.restoreVersionForExternalStorage('v_1', existingHistory);

      expect(result).not.toBeNull();
      expect(result!.current.fields[0].label).toBe('Original');
      expect(result!.versions).toBe(existingHistory);
    });

    it('should return null for invalid versionId', () => {
      const config = createMockConfig('test-form');

      const existingHistory: FormConfigVersion[] = [
        {
          id: 'v_1',
          config,
          timestamp: Date.now(),
          createdAt: new Date().toISOString(),
          versionNumber: 1,
        },
      ];

      const result = service.restoreVersionForExternalStorage('invalid', existingHistory);

      expect(result).toBeNull();
    });
  });
});
