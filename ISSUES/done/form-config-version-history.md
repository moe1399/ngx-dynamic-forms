# Form Config Version History

## Description

The form builder currently has no version history for form configurations. When a user saves changes to a form config, the previous version is immediately overwritten. This feature would add version history tracking with the ability to view and revert to previous versions of a form configuration.

## Use Cases

### Use Case 1: Undo Mistakes
A user accidentally deletes important sections or fields while editing a form. With version history, they can quickly revert to a previous version instead of manually recreating the lost content.

### Use Case 2: A/B Testing Form Designs
Users want to test different form layouts and field configurations. Version history allows them to iterate on designs and easily switch between different versions to compare effectiveness.

### Use Case 3: Audit Trail
Organizations need to track who made changes to form configurations and when. This is especially important for regulated industries or teams with multiple editors.

### Use Case 4: Seasonal Form Variations
A form needs temporary changes (e.g., event registration forms with different questions for different events). Version history allows reverting to the base form after the event without maintaining separate copies.

### Use Case 5: External Storage Integration (Enterprise/Backend-Powered)
A consumer application manages form configurations in their own backend/database instead of localStorage. When the user saves in the form builder, the consumer needs to receive the complete config with version history to persist to their API. This enables:
- Server-side version history storage and retention policies
- Multi-user environments with centralized config management
- Audit trails backed by database records
- Integration with existing CMS/DM systems

## Affected Components

- `projects/ngx-dynamic-forms/src/lib/services/form-builder.service.ts`
- `projects/ngx-dynamic-forms/src/lib/components/form-builder/form-builder.ts`
- `projects/ngx-dynamic-forms/src/lib/components/form-builder/form-builder.html`
- `projects/ngx-dynamic-forms/src/lib/components/form-builder/form-builder.scss`
- `projects/ngx-dynamic-forms/src/lib/models/form-config.interface.ts`
- `apps/demo/src/app/app.html` (demo UI)

## Proposed Design

### Data Model

```typescript
interface FormConfigVersion {
  id: string;                    // Unique version ID (timestamp-based)
  config: FormConfig;            // Complete config snapshot
  timestamp: number;             // Unix timestamp
  createdAt: Date;               // ISO date string
  description?: string;          // Optional description/note
  createdBy?: string;            // Optional user attribution
  versionNumber: number;         // Sequential version number
  isAutoSave?: boolean;          // Distinguish manual vs auto-saves
}

interface FormConfigWithHistory {
  current: FormConfig;
  versions: FormConfigVersion[];
  maxVersions?: number;          // Optional: max versions to keep (default: 50)
}
```

### Storage Strategy

**Option A: Separate Storage Keys**
- Current config: `form_configs` (existing)
- Version history: `form_configs_history` (new)
- Format: `{ [formId: string]: FormConfigVersion[] }`

**Option B: Single Storage Object**
- Single key: `form_configs_with_history`
- Format: `{ [formId: string]: FormConfigWithHistory }`

**Recommendation**: Option A for backward compatibility with existing saved configs

### Service API

```typescript
// form-builder.service.ts additions

class FormBuilderService {
  // Version History Methods (localStorage-based)
  saveVersion(formId: string, config: FormConfig, description?: string): string;
  getVersionHistory(formId: string): FormConfigVersion[];
  restoreVersion(formId: string, versionId: string): FormConfig;
  deleteVersions(formId: string, beforeDate?: Date): void;
  compareVersions(version1: FormConfigVersion, version2: FormConfigVersion): VersionDiff;
  getMaxVersions(): number;  // Default: 50
  setMaxVersions(max: number): void;

  // External Consumer Methods (returns data for consumer to persist)
  /**
   * Creates a new version and returns the complete FormConfigWithHistory
   * for the consumer to persist to their own storage (API, database, etc.)
   *
   * @param config - The current form config
   * @param existingHistory - Existing version history array from consumer's storage
   * @param description - Optional description for this version
   * @returns FormConfigWithHistory - Complete data structure for consumer to persist
   */
  createVersionForExternalStorage(
    config: FormConfig,
    existingHistory: FormConfigVersion[],
    description?: string
  ): FormConfigWithHistory;

  /**
   * Prepares a version restore for external storage consumers
   * Returns the FormConfigWithHistory with the restored config as current
   *
   * @param formId - Form identifier
   * @param versionId - Version ID to restore
   * @param existingHistory - Existing version history array from consumer's storage
   * @returns FormConfigWithHistory - Updated data structure with restored config
   */
  restoreVersionForExternalStorage(
    formId: string,
    versionId: string,
    existingHistory: FormConfigVersion[]
  ): FormConfigWithHistory;
}
```

### Auto-Versioning Behavior

**A new version is created on every save.** This ensures a complete audit trail of all changes.

When saving a config (localStorage mode):
1. **Before overwriting**: Create version snapshot with current timestamp
2. **Save version**: Add to history array
3. **Trim history**: Remove oldest versions if exceeding `maxVersions`
4. **Save new config**: Proceed with normal save

Configuration options:
```typescript
interface VersionHistoryConfig {
  enabled?: boolean;             // Default: true
  maxVersions?: number;          // Default: 50
}
```

### External Storage Consumer Pattern

For consumers who manage their own storage (backend API, database, etc.):

```typescript
// Consumer component
@Component({
  selector: 'my-form-builder-wrapper',
  template: `
    <ngx-form-builder
      [(config)]="config"
      (configChanged)="onConfigChanged($event)"
      [showSavedConfigs]="false" />
  `
})
export class MyFormBuilderWrapper {
  config = signal<FormConfig | null>(null);
  private savedHistory: FormConfigVersion[] = [];

  constructor(
    private formBuilderService: FormBuilderService,
    private api: MyApiService
  ) {}

  // Load config with history from backend
  async loadForm(formId: string) {
    const data = await this.api.getFormConfig(formId);
    this.config.set(data.config);
    this.savedHistory = data.versions || [];
  }

  // On save, create version and persist to backend
  onConfigChanged(formConfig: FormConfig) {
    const withHistory = this.formBuilderService.createVersionForExternalStorage(
      formConfig,
      this.savedHistory,
      'User saved changes'
    );

    // Persist to backend
    this.api.saveFormConfig(withHistory).subscribe();
  }

  // Restore a version
  restoreVersion(versionId: string) {
    const restored = this.formBuilderService.restoreVersionForExternalStorage(
      this.config()!.id,
      versionId,
      this.savedHistory
    );

    this.config.set(restored.current);
    this.savedHistory = restored.versions;

    // Persist restored state to backend
    this.api.saveFormConfig(restored).subscribe();
  }
}
```

### Output for External Consumers

The form builder emits the current config via `configChanged`. External consumers should:
1. Call `createVersionForExternalStorage()` to get the complete `FormConfigWithHistory`
2. Persist both `current` (FormConfig) and `versions` (FormConfigVersion[]) to their storage
3. When loading, populate the form builder with `current` and store `versions` for future operations

## UI Design

### Version History Panel

Location: New panel in form builder (accordion or tab)

```html
<div class="version-history-panel panel-section">
  <h3>Version History</h3>

  <!-- Version List -->
  <div class="version-list">
    @for (version of versions(); track version.id) {
      <div class="version-item"
           [class.current]="version.id === currentVersionId()"
           [class.selected]="version.id === selectedVersionId()"
           [attr.data-version-id]="version.id">
        <div class="version-header">
          <span class="version-number">v{{ version.versionNumber }}</span>
          <span class="version-date">{{ formatTimestamp(version.timestamp) }}</span>
        </div>
        @if (version.description) {
          <div class="version-description">{{ version.description }}</div>
        }
        <div class="version-actions">
          <button class="btn-preview" (click)="previewVersion(version.id)">
            Preview
          </button>
          @if (!version.isCurrent) {
            <button class="btn-restore" (click)="restoreVersion(version.id)">
              Restore
            </button>
          }
        </div>
      </div>
    }
  </div>

  <!-- Version Comparison (when two versions selected) -->
  @if (compareMode()) {
    <div class="version-comparison">
      <!-- Side-by-side diff view -->
    </div>
  }
</div>
```

### Version Preview Modal

Shows the form builder UI with the selected version loaded (read-only preview):
- Form fields and sections displayed
- "Restore This Version" button
- "Compare with Current" button
- "Close" button

### Toolbar Actions

New toolbar buttons:
- **View History**: Opens version history panel
- **Create Version**: Manually create a version with description

```html
<button class="btn-create-version" (click)="createVersionWithNote()"
        title="Save current state as a named version">
  <span class="icon">bookmark</span>
  Create Version
</button>
```

## Affected Code Locations

### 1. FormBuilderService
**File**: `projects/ngx-dynamic-forms/src/lib/services/form-builder.service.ts`

**Add methods**:
- `saveVersion(formId: string, config: FormConfig, description?: string): string`
- `getVersionHistory(formId: string): FormConfigVersion[]`
- `restoreVersion(formId: string, versionId: string): FormConfig`
- `deleteOldVersions(formId: string, keepCount: number): void`
- `createVersionForExternalStorage(config, existingHistory, description?): FormConfigWithHistory`
- `restoreVersionForExternalStorage(formId, versionId, existingHistory): FormConfigWithHistory`

**Modify methods**:
- `saveConfig()`: Create version snapshot before overwriting (on every save)
- `deleteConfig()`: Also delete version history
- `getAllConfigs()`: Return configs with version metadata

### 2. FormConfig Interface
**File**: `projects/ngx-dynamic-forms/src/lib/models/form-config.interface.ts`

**Add new interfaces**:
```typescript
export interface FormConfigVersion {
  id: string;
  config: FormConfig;
  timestamp: number;
  createdAt: string;
  description?: string;
  createdBy?: string;
  versionNumber: number;
  isAutoSave?: boolean;
}

export interface VersionHistoryConfig {
  enabled?: boolean;
  maxVersions?: number;
  autoSaveOnManualSave?: boolean;
  autoSaveOnAutoSave?: boolean;
}
```

**Add to FormConfig** (optional, for per-form settings):
```typescript
export interface FormConfig {
  // existing...
  versionHistory?: VersionHistoryConfig;
}
```

### 3. Form Builder Component
**File**: `projects/ngx-dynamic-forms/src/lib/components/form-builder/form-builder.ts`

**Add signals**:
```typescript
versions = signal<FormConfigVersion[]>([]);
selectedVersionId = signal<string | null>(null);
compareMode = signal<boolean>(false);
historyPanelOpen = signal<boolean>(false);
```

**Add methods**:
- `loadVersionHistory(): void`
- `createVersionWithNote(): void`
- `previewVersion(versionId: string): void`
- `restoreVersion(versionId: string): void`
- `compareVersions(versionId1: string, versionId2: string): void`
- `deleteVersion(versionId: string): void`
- `exportVersionHistory(): void` (JSON export)

### 4. Form Builder Template
**File**: `projects/ngx-dynamic-forms/src/lib/components/form-builder/form-builder.html`

**Add**: Version history panel section

**Modify**: Add toolbar button for version history

### 5. Form Builder Styles
**File**: `projects/ngx-dynamic-forms/src/lib/components/form-builder/form-builder.scss`

**Add classes**:
- `.version-history-panel` - Main panel container
- `.version-list` - Scrollable list container
- `.version-item` - Individual version row
- `.version-item.current` - Highlight current version
- `.version-item.selected` - Highlight selected version
- `.version-header` - Version metadata row
- `.version-number` - Version number badge
- `.version-date` - Timestamp display
- `.version-description` - Optional description text
- `.version-actions` - Action button container
- `.version-comparison` - Side-by-side diff view (Phase 2)

## Implementation Checklist

1. Add `FormConfigVersion`, `FormConfigWithHistory`, and `VersionHistoryConfig` interfaces to `form-config.interface.ts`
2. Add version storage methods to `form-builder.service.ts`:
   - `saveVersion()`
   - `getVersionHistory()`
   - `restoreVersion()`
   - `deleteOldVersions()`
   - `createVersionForExternalStorage()`
   - `restoreVersionForExternalStorage()`
3. Modify `saveConfig()` to auto-create versions on every save before overwriting
4. Modify `deleteConfig()` to clean up version history
5. Add version history signals to `form-builder.ts`
6. Add version history UI methods to `form-builder.ts`
7. Add version history panel to `form-builder.html`
8. Add version history toolbar button
9. Add version history styles to `form-builder.scss`
10. Add version preview modal component
11. Add unit tests for version history service methods (including external storage methods)
12. Update demo app to showcase version history feature
13. Add documentation example for external storage consumer pattern

## Data Attributes (State Only)

Data attributes are used for element state, not general styling:

| Attribute | Purpose | Values |
|-----------|---------|--------|
| `data-version-id` | Identifies which version the item represents | version ID string |
| `data-current-version` | Marks the current/active version | presence = true |
| `data-selected-version` | Marks the currently selected version | presence = true |
| `data-panel-open` | Indicates version history panel is open | presence = true |
| `data-preview-mode` | Indicates preview mode is active | presence = true |

**CSS Classes** are used for styling:
- `.version-history-panel`, `.version-list`, `.version-item`
- `.version-item.current`, `.version-item.selected`
- `.btn-preview`, `.btn-restore`, `.btn-create-version`

## Open Questions

1. **Max Versions Default**: What should the default limit be?
   - **Recommendation**: 50 versions (balances storage with usability)

2. **Storage Quota**: Should we add storage size monitoring?
   - **Recommendation**: Monitor localStorage usage, warn when approaching limit

3. **Version Descriptions**: Should users be prompted to describe manual saves?
   - **Recommendation**: Optional - can add a description when manually creating a version via "Create Version" button, but auto-saves have no description

4. **Diff Viewer**: Should we include a visual diff for comparing versions?
   - **Recommendation**: Phase 2 feature - start with preview/restore only

5. **Export/Import**: Should version history be included in config export?
   - **Recommendation**: Optional - add checkbox to "Include version history" in export modal

## Breaking Changes

None - this is a new feature with backward compatibility preserved.

## Migration Path

No migration needed - existing configs will have empty version history arrays.

## Future Enhancements

- **Phase 2**: Visual diff viewer for comparing versions
- **Phase 2**: Version branching/forking
- **Phase 2**: Collaborative editing with user attribution
- **Phase 2**: Cloud sync for version history
- **Phase 2**: Version scheduling (auto-revert at specific time)
- **Phase 2**: Version approval workflow
