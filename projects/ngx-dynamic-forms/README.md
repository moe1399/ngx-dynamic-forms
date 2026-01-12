# @moe1399/ngx-dynamic-forms

Dynamic form builder and renderer for Angular with a headless UI pattern.

## Features

- **Headless UI Pattern**: Zero default styling, complete styling freedom via `data-*` attributes
- **No Built-in Buttons**: You render your own submit/save buttons for full control
- **14 Field Types**: text, email, number, textarea, date, daterange, select, radio, checkbox, table, datagrid, phone, info, formref
- **Visual Form Builder**: Drag-drop field ordering, validation rules, sections
- **JSON-driven**: Define forms via JSON configuration
- **Auto-save**: Built-in local storage persistence
- **URL Sharing**: Compressed schema sharing via URL parameters

## Installation

```bash
npm install @moe1399/ngx-dynamic-forms
```

**Peer Dependencies:**
- Angular 21+
- pako (optional, for URL sharing)

## Usage

### Basic Form Renderer

The DynamicForm component does not render submit/save buttons. You provide your own buttons via content projection and call the component methods:

```typescript
import { Component, viewChild } from '@angular/core';
import { DynamicForm, FormConfig } from '@moe1399/ngx-dynamic-forms';

@Component({
  selector: 'app-my-form',
  imports: [DynamicForm],
  template: `
    <ngx-dynamic-form
      #form
      [config]="formConfig"
      (formSubmit)="onSubmit($event)"
      (valueChanges)="onValueChange($event)">
      <!-- Your custom buttons -->
      <div class="form-actions">
        <button type="button" (click)="form.submitForm()" [disabled]="!form.valid">
          {{ formConfig.submitLabel || 'Submit' }}
        </button>
      </div>
    </ngx-dynamic-form>
  `
})
export class MyFormComponent {
  form = viewChild.required<DynamicForm>('form');

  formConfig: FormConfig = {
    id: 'contact-form',
    fields: [
      { name: 'name', label: 'Name', type: 'text', validations: [{ type: 'required', message: 'Name is required' }] },
      { name: 'email', label: 'Email', type: 'email' }
    ],
    submitLabel: 'Send'
  };

  onSubmit(data: any) {
    console.log('Form submitted:', data);
  }

  onValueChange(data: any) {
    console.log('Form values changed:', data);
  }

  // Access form state programmatically
  checkFormState() {
    const formRef = this.form();
    console.log('Current value:', formRef.value);
    console.log('Is valid:', formRef.valid);
    console.log('Is touched:', formRef.touched);
    console.log('Is dirty:', formRef.dirty);
  }
}
```

### Form Builder

```typescript
import { Component } from '@angular/core';
import { NgxFormBuilder, FormConfig } from '@moe1399/ngx-dynamic-forms';

@Component({
  selector: 'app-builder',
  imports: [NgxFormBuilder],
  template: `<ngx-form-builder [(config)]="formConfig" />`
})
export class BuilderComponent {
  formConfig: FormConfig | null = null;
}
```

### Using Services

```typescript
import { Component, inject } from '@angular/core';
import { FormBuilderService, FormStorage, UrlSchemaService } from '@moe1399/ngx-dynamic-forms';

@Component({
  // ...
})
export class MyComponent {
  private formBuilder = inject(FormBuilderService);
  private formStorage = inject(FormStorage);
  private urlSchema = inject(UrlSchemaService);

  // FormBuilderService - manage form configurations
  saveConfig() {
    this.formBuilder.saveConfig(this.config);
  }

  loadConfig(id: string) {
    return this.formBuilder.loadConfig(id);
  }

  // FormStorage - persist form data
  saveFormData() {
    this.formStorage.saveForm('my-form', this.data);
  }

  // UrlSchemaService - share forms via URL
  async shareForm() {
    await this.urlSchema.copyShareUrlToClipboard(this.config);
  }
}
```

### Styling

Both components are headless with optional default themes. Import themes in your `styles.scss`:

```scss
// Import both themes (dynamic form + form builder)
@use '@moe1399/ngx-dynamic-forms/src/styles/ngx-dynamic-forms';

// Or import individually
@use '@moe1399/ngx-dynamic-forms/src/styles/themes/default';              // Dynamic Form (.ngx-df)
@use '@moe1399/ngx-dynamic-forms/src/styles/themes/form-builder-default'; // Form Builder (.ngx-fb)
```

#### Dynamic Form Theme Customization

The default theme uses CSS custom properties (design tokens) for easy customization. Override these variables on `.ngx-df` to customize colors, typography, spacing, and more:

```scss
.ngx-df {
  // Primary colors
  --df-color-primary: #0066cc;
  --df-color-primary-dark: #004d99;
  --df-color-primary-light: #3399ff;

  // Backgrounds
  --df-color-background: #f0f4f8;
  --df-color-surface: #ffffff;

  // Typography
  --df-font-family: 'Roboto', sans-serif;
  --df-font-size-base: 16px;

  // Spacing
  --df-spacing-md: 12px;
  --df-spacing-lg: 16px;

  // Borders
  --df-border-radius: 4px;
}
```

**Available CSS Variables:**

| Category | Variables |
|----------|-----------|
| Primary Colors | `--df-color-primary`, `--df-color-primary-dark`, `--df-color-primary-light` |
| Backgrounds | `--df-color-background`, `--df-color-background-light`, `--df-color-surface`, `--df-color-surface-alt` |
| Borders | `--df-color-border`, `--df-color-border-dark`, `--df-color-border-light` |
| Text | `--df-color-text`, `--df-color-text-muted`, `--df-color-text-disabled`, `--df-color-text-inverse` |
| State | `--df-color-error`, `--df-color-error-bg`, `--df-color-warning`, `--df-color-info` |
| Typography | `--df-font-family`, `--df-font-size-base`, `--df-font-size-sm`, `--df-font-size-xs`, `--df-font-size-lg` |
| Spacing | `--df-spacing-xs` (4px), `--df-spacing-sm` (6px), `--df-spacing-md` (8px), `--df-spacing-lg` (10px), `--df-spacing-xl` (12px), `--df-spacing-2xl` (16px) |
| Borders | `--df-border-radius`, `--df-border-radius-sm`, `--df-border-radius-md` |
| Shadows | `--df-shadow-focus`, `--df-shadow-popover`, `--df-shadow-tooltip` |
| Components | `--df-label-width`, `--df-input-min-height`, `--df-button-padding` |

#### Custom Styles with Data Attributes

Or create custom styles using `data-*` attribute selectors:

```scss
[data-form-id] {
  // Form container styles
}

[data-field-valid="false"] {
  // Invalid field styles
}

[data-field-touched="true"][data-field-valid="false"] {
  // Show errors only after interaction
}

[data-validation-error] {
  // Error message styles
}

[data-field-type="text"] {
  // Style specific field types
}
```

#### Form Builder Theme Customization

The form builder uses `.ngx-fb` wrapper class with its own CSS variables:

```scss
.ngx-fb {
  // Primary colors
  --fb-color-primary: #0066cc;
  --fb-color-primary-dark: #004d99;

  // Backgrounds
  --fb-color-background: #f0f4f8;
  --fb-color-surface: #ffffff;

  // Typography
  --fb-font-family: 'Roboto', sans-serif;
  --fb-font-size-base: 14px;

  // Spacing
  --fb-spacing-md: 8px;
  --fb-spacing-lg: 12px;

  // Layout
  --fb-left-panel-width: 350px;
}
```

**Available Form Builder CSS Variables:**

| Category | Variables |
|----------|-----------|
| Primary Colors | `--fb-color-primary`, `--fb-color-primary-dark`, `--fb-color-primary-light` |
| Backgrounds | `--fb-color-background`, `--fb-color-background-light`, `--fb-color-surface`, `--fb-color-surface-alt` |
| Borders | `--fb-color-border`, `--fb-color-border-dark`, `--fb-color-border-light` |
| Text | `--fb-color-text`, `--fb-color-text-muted`, `--fb-color-text-inverse` |
| State | `--fb-color-error`, `--fb-color-error-bg`, `--fb-color-success-bg` |
| Typography | `--fb-font-family`, `--fb-font-size-base`, `--fb-font-size-sm`, `--fb-font-size-xs`, `--fb-font-size-lg` |
| Spacing | `--fb-spacing-xs` through `--fb-spacing-2xl` |
| Layout | `--fb-left-panel-width`, `--fb-min-height`, `--fb-max-panel-height` |

## API

### DynamicForm Component

**Selector:** `ngx-dynamic-form`

**Content Projection:** Place your submit/save buttons inside the component tags.

| Input | Type | Description |
|-------|------|-------------|
| `config` | `FormConfig` | Form configuration |

| Output | Type | Description |
|--------|------|-------------|
| `formSubmit` | `EventEmitter<object>` | Emitted when submitForm() is called and form is valid |
| `formSave` | `EventEmitter<object>` | Emitted when saveForm() is called |
| `validationErrors` | `EventEmitter<FieldError[]>` | Emitted on validation changes |
| `valueChanges` | `EventEmitter<object>` | Emitted when any form value changes |

| Property | Type | Description |
|----------|------|-------------|
| `value` | `object` | Current form values (read-only) |
| `valid` | `boolean` | Whether form is valid (read-only) |
| `touched` | `boolean` | Whether form has been interacted with (read-only) |
| `dirty` | `boolean` | Whether form values have changed (read-only) |

| Method | Description |
|--------|-------------|
| `submitForm()` | Validates and submits the form, emits `formSubmit` if valid |
| `saveForm()` | Saves form data to local storage, emits `formSave` |

#### saveForm() vs submitForm()

These methods serve different purposes:

**`saveForm()` - Save Draft**
- **No validation** - saves regardless of form state
- Preserves work-in-progress, including incomplete/invalid data
- Saves to local storage for recovery
- Always emits `formSave` event
- Use case: "Save Draft" button

**`submitForm()` - Final Submission**
- **Full validation** - only proceeds if all fields are valid
- Marks all fields as touched (shows validation errors)
- Cleans data before emitting (removes empty table rows, etc.)
- Only emits `formSubmit` event if valid
- Use case: "Submit" button

```html
<ngx-dynamic-form [config]="config" #form (formSave)="onSave($event)" (formSubmit)="onSubmit($event)">
  <!-- Save draft: no validation, always saves -->
  <button type="button" (click)="form.saveForm()">Save Draft</button>

  <!-- Submit: validates first, only submits if valid -->
  <button type="button" (click)="form.submitForm()" [disabled]="!form.valid">Submit</button>
</ngx-dynamic-form>
```

| | `saveForm()` | `submitForm()` |
|---|---|---|
| Validates | No | Yes |
| Shows errors | No | Yes |
| Emits event | Always | Only if valid |
| Event | `formSave` | `formSubmit` |

### NgxFormBuilder Component

**Selector:** `ngx-form-builder`

| Input | Type | Description |
|-------|------|-------------|
| `config` | `FormConfig` | Two-way binding for form config |
| `showToolbar` | `boolean` | Show/hide toolbar (default: true) |
| `toolbarConfig` | `ToolbarConfig` | Configure toolbar buttons |

| Output | Type | Description |
|--------|------|-------------|
| `configChange` | `EventEmitter<FormConfig>` | Emitted when config changes |
| `saveRequested` | `EventEmitter<FormConfig>` | Emitted when save is clicked |
| `exportRequested` | `EventEmitter<FormConfig>` | Emitted when export is clicked |
| `shareRequested` | `EventEmitter<void>` | Emitted when share is clicked |

### FormConfig Interface

```typescript
interface FormConfig {
  id: string;
  fields: FormFieldConfig[];
  sections?: FormSection[];
  submitLabel?: string;    // For use by your custom buttons
  saveLabel?: string;      // For use by your custom buttons
  autoSave?: boolean;
  autoSaveInterval?: number;
}

interface FormFieldConfig {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  defaultValue?: any;
  validations?: ValidationRule[];
  options?: FieldOption[];        // For select, radio, checkbox
  sectionId?: string;
  order?: number;
  tableConfig?: TableConfig;      // For table fields
  datagridConfig?: DatagridConfig; // For datagrid fields
  phoneConfig?: PhoneConfig;      // For phone fields
  daterangeConfig?: DaterangeConfig; // For daterange fields
  formrefConfig?: FormrefConfig;  // For formref fields
  content?: string;               // For info fields (markdown)
}
```

### Field Types

| Type | Description |
|------|-------------|
| `text` | Single line text input |
| `email` | Email input with validation |
| `number` | Numeric input |
| `textarea` | Multi-line text input |
| `date` | Date picker |
| `daterange` | From/to date range |
| `select` | Dropdown select |
| `radio` | Radio button group |
| `checkbox` | Checkbox (single or multi) |
| `table` | Dynamic table with rows |
| `datagrid` | Fixed grid with computed columns |
| `phone` | Phone with country code |
| `info` | Static markdown content |
| `formref` | Embed another form's fields |

### Validation Types

| Type | Value | Description |
|------|-------|-------------|
| `required` | - | Field must have a value |
| `email` | - | Must be valid email format |
| `minLength` | number | Minimum character length |
| `maxLength` | number | Maximum character length |
| `min` | number | Minimum numeric value |
| `max` | number | Maximum numeric value |
| `pattern` | string | Regex pattern to match |

## Data Attributes

The headless UI exposes state via data attributes for CSS styling:

| Attribute | Values | Description |
|-----------|--------|-------------|
| `data-form-id` | string | Form identifier |
| `data-form-valid` | true/false | Overall form validity |
| `data-form-touched` | true/false | Form has been interacted with |
| `data-form-dirty` | true/false | Form values have changed |
| `data-field-name` | string | Field identifier |
| `data-field-type` | string | Field type |
| `data-field-valid` | true/false | Field validity |
| `data-field-touched` | true/false | Field interaction state |
| `data-field-required` | true/false | Field is required |
| `data-validation-error` | - | Error message container |

## Demo

See the live demo at: https://moe1399.github.io/ngx-dynamic-forms/

## Contributing

### Commit Messages

This project uses [Conventional Commits](https://www.conventionalcommits.org/) for commit messages. This enables automatic changelog generation.

**Format:** `<type>: <description>`

| Type | Description |
|------|-------------|
| `feat` | New feature (appears in changelog) |
| `fix` | Bug fix (appears in changelog) |
| `docs` | Documentation changes |
| `refactor` | Code refactoring |
| `perf` | Performance improvements |
| `test` | Adding or updating tests |
| `chore` | Build/tooling changes |

**Examples:**
```bash
feat: add file upload field type
fix: resolve validation error display on blur
feat!: remove deprecated API (breaking change)
```

### Changelog

The changelog is automatically generated from commit messages:

```bash
npm run changelog      # Append new commits
npm run changelog:all  # Regenerate entire changelog
```

The publish script automatically updates the changelog before each release.

## License

MIT
