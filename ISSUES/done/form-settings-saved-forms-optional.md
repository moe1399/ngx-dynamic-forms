# Form Settings - Remove UI Properties, Keep Form ID

## Description

The `FormConfig` interface includes UI-related properties (`submitLabel`, `saveLabel`, `autoSave`, `autoSaveInterval`) that are redundant since the consuming app already controls button labels and behavior via content projection.

The form builder's "Form Settings" section should only contain `formId`, which is needed for:
- The demo site to manage multiple forms
- Use cases where the consumer manages multiple forms using the form builder
- Identifying forms when saving/loading from localStorage

### Current State

**FormConfig Interface** (`form-config.interface.ts`):
```typescript
export interface FormConfig {
  id: string;
  fields: FormFieldConfig[];
  sections?: FormSection[];
  wizard?: WizardConfig;
  submitLabel?: string;      // REMOVE - consumer controls via content projection
  saveLabel?: string;        // REMOVE - consumer controls via content projection
  autoSave?: boolean;        // REMOVE - consumer can call saveForm() on their own interval
  autoSaveInterval?: number; // REMOVE - consumer controls their own timer
}
```

**Form Settings Section** (lines 39-90 in `form-builder.html`):
- Form ID ✓ (keep - needed for multi-form management)
- Submit Label ✗ (remove - consumer provides button text)
- Save Label ✗ (remove - consumer provides button text)
- Enable Auto-Save ✗ (remove - consumer controls save behavior)
- Auto-Save Interval ✗ (remove - consumer controls timing)

### Why Remove These Properties?

The dynamic form uses **content projection** (`<ng-content>`) for buttons:

```html
<!-- Consuming app provides buttons -->
<ngx-dynamic-form [config]="config" (formSubmit)="onSubmit($event)">
  <div data-form-actions>
    <!-- Consumer controls button text directly -->
    <button (click)="form.saveForm()">Save Draft</button>
    <button (click)="form.submitForm()">Submit Application</button>
  </div>
</ngx-dynamic-form>
```

The config properties are redundant because:
1. Consumer writes button text directly in their markup
2. Consumer decides whether to show a save button at all
3. Consumer can set up their own auto-save timer calling `saveForm()`

### Exception: Wizard Mode

Wizard mode has its own `wizard.submitLabel` (and prev/next labels) which **should stay** because:
- It's part of the wizard feature configuration
- Wizard buttons are rendered by the component, not via content projection
- Different forms may need different wizard button labels

## Affected Components

- `projects/ngx-dynamic-forms/src/lib/models/form-config.interface.ts`
- `projects/ngx-dynamic-forms/src/lib/components/form-builder/form-builder.ts`
- `projects/ngx-dynamic-forms/src/lib/components/form-builder/form-builder.html`
- `projects/ngx-dynamic-forms/src/lib/services/form-builder.service.ts`
- `projects/ngx-dynamic-forms/src/lib/components/dynamic-form/dynamic-form.ts`
- `apps/demo/src/app/app.html`

## Affected Code Locations

### 1. FormConfig Interface
**File**: `projects/ngx-dynamic-forms/src/lib/models/form-config.interface.ts`
**Lines**: 164-174

**Remove**:
```typescript
submitLabel?: string;
saveLabel?: string;
autoSave?: boolean;
autoSaveInterval?: number;
```

### 2. Form Builder Component
**File**: `projects/ngx-dynamic-forms/src/lib/components/form-builder/form-builder.html`
**Lines**: 39-90

**Remove**: Submit Label, Save Label, Auto-Save checkbox, Auto-Save Interval inputs
**Keep**: Form ID input only

### 3. Form Builder TypeScript
**File**: `projects/ngx-dynamic-forms/src/lib/components/form-builder/form-builder.ts`

**Remove methods**:
- `updateFormSettings()` (if only used for these properties)
- References to `submitLabel`, `saveLabel`, `autoSave`, `autoSaveInterval`

### 4. Dynamic Form Component
**File**: `projects/ngx-dynamic-forms/src/lib/components/dynamic-form/dynamic-form.ts`
**Lines**: 1090-1103 (auto-save timer setup)

**Remove**: Auto-save interval timer logic

### 5. Demo App
**File**: `apps/demo/src/app/app.html`
**Lines**: 98-112 (save/submit buttons)

**Update**: Remove references to `config().saveLabel` and `config().submitLabel`

## Recommended Fix

### Step 0: Add showFormSettings Input (Optional Form Settings)

Add input to allow hiding the Form Settings section entirely:
```typescript
// form-builder.ts
showFormSettings = input<boolean>(true);
```

Wrap Form Settings section in template:
```html
@if (showFormSettings()) {
  <div class="panel-section">
    <h3>Form Settings</h3>
    <!-- Form ID input only -->
  </div>
}
```

### Step 1: Remove Properties from FormConfig

```typescript
// form-config.interface.ts
export interface FormConfig {
  id: string;
  fields: FormFieldConfig[];
  sections?: FormSection[];
  wizard?: WizardConfig;
  // Removed: submitLabel, saveLabel, autoSave, autoSaveInterval
}
```

### Step 2: Simplify Form Builder UI

Form Settings section becomes just Form ID:
```html
<!-- form-builder.html -->
<div class="panel-section">
  <h3>Form Settings</h3>
  <div class="form-group">
    <label>Form ID</label>
    <input
      type="text"
      [ngModel]="currentConfig().id"
      (ngModelChange)="updateFormSettings({ id: $event })"
      placeholder="form-id"
    />
  </div>
</div>
```

### Step 3: Remove Auto-Save Logic from Dynamic Form

Remove the interval timer setup (lines 1090-1103):
```typescript
// Remove this effect
// if (currentConfig.autoSave) {
//   const interval = currentConfig.autoSaveInterval || 5000;
//   this.autoSaveTimer = window.setInterval(...)
// }
```

### Step 4: Update Demo App

Remove config-based button labels:
```html
<!-- Before -->
<button>{{ currentConfig()!.submitLabel || 'Submit' }}</button>
@if (currentConfig()!.saveLabel) {
  <button>{{ currentConfig()!.saveLabel }}</button>
}

<!-- After -->
<button>Submit</button>
<button>Save Draft</button>
```

### Step 5: Update FormBuilderService

Remove properties from `createBlankConfig()`:
```typescript
createBlankConfig(): FormConfig {
  return {
    id: `form_${Date.now()}`,
    fields: [],
    sections: [],
    // Remove: submitLabel, saveLabel, autoSave, autoSaveInterval
  };
}
```

## Use Cases

### Use Case 1: Standalone Form Builder (Demo)

**Context**: Demo site where users create and manage multiple forms locally.

**Required**:
- Form ID (to identify/manage multiple forms)
- Saved Forms management
- Toolbar

**Configuration**:
```html
<ngx-form-builder
  [(config)]="config"
  [showToolbar]="true"
  [showSavedConfigs]="true" />
```

### Use Case 2: API-Driven Form Management (Enterprise)

**Context**: Forms managed in backend. Form builder only configures structure.

**Form ID assigned by**: Backend/database
**Button labels**: Consumer app's concern
**Auto-save**: Consumer app's concern (or backend auto-save)

**Configuration**:
```html
<ngx-form-builder
  [(config)]="config"
  [showToolbar]="false"
  [showSavedConfigs]="false" />
```

The consumer manages formId via the `config` binding:
```typescript
this.config = {
  id: this.formIdFromBackend, // Assigned by server
  fields: [...],
  sections: [...]
};
```

### Use Case 3: Consumer-Managed Multi-Form System

**Context**: CMS/plugin with multiple form templates.

**Required**:
- Form ID (to identify templates in the system)
- Sections, fields, validations

**Not Required**:
- Submit/save labels (CMS controls buttons)
- Auto-save (CMS handles persistence)

## Breaking Changes

This is a **breaking change** for existing consumers:

1. **FormConfig interface**: Properties removed
2. **Dynamic form**: Auto-save behavior removed (consumer must implement)
3. **Form builder**: UI simplification

### Migration Guide

**Before**:
```typescript
const config: FormConfig = {
  id: 'my-form',
  fields: [...],
  submitLabel: 'Submit Application',
  saveLabel: 'Save Draft',
  autoSave: true,
  autoSaveInterval: 10000
};
```

**After**:
```typescript
const config: FormConfig = {
  id: 'my-form',
  fields: [...]
  // Button labels in your component template:
  // <button>Submit Application</button>
  // <button>Save Draft</button>

  // Auto-save in your component:
  // setInterval(() => form.saveForm(), 10000);
};
```

## Open Questions

1. **Form Settings Section Name**: After removing submit/save/auto-save, should it be renamed from "Form Settings" to "Form ID"?
   - **Decision**: Keep "Form Settings" as section header (may add other form-level settings later)

2. **Form Settings Visibility**: Should we add `@Input() showFormSettings` to hide even the Form ID field?
   - **Decision**: **Yes** - Add this input for API-driven systems where formId is never edited in the builder

3. **Wizard Mode Labels**: Should `wizard.submitLabel`, `wizard.prevLabel`, `wizard.nextLabel` also be removed?
   - **Decision**: **No** - these are part of the wizard feature configuration, not general form UI

## Implementation Checklist

1. Add `showFormSettings = input<boolean>(true)` to `NgxFormBuilder` component
2. Wrap Form Settings section in template with `@if (showFormSettings())`
3. Remove `submitLabel`, `saveLabel`, `autoSave`, `autoSaveInterval` from `FormConfig` interface
4. Remove Submit Label, Save Label, Auto-Save, Auto-Save Interval inputs from form builder UI
5. Remove auto-save timer logic from `dynamic-form.ts`
6. Remove references to removed properties from `form-builder.ts`
7. Update `createBlankConfig()` in `form-builder.service.ts`
8. Update demo app to remove config-based button labels
9. Update documentation with new input and removed properties
10. Add demo showcasing "minimal mode" (API-driven use case)

## Migration Path

**For FormConfig consumers** (breaking change):
- Button labels: Move to your component template
- Auto-save: Implement your own timer calling `form.saveForm()`

**For form builder consumers** (backward compatible):
- `showFormSettings` defaults to `true` - no change needed
- Set `showFormSettings="false"` to hide Form Settings section

## Resolution

**Status**: Approved

**Implementation**: Ready to start
