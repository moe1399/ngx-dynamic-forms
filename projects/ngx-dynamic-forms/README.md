# @moe1399/ngx-dynamic-forms

Dynamic form builder and renderer for Angular with a headless UI pattern.

## Features

- **Headless UI Pattern**: Zero default styling, complete styling freedom via `data-*` attributes
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

```typescript
import { Component } from '@angular/core';
import { DynamicForm, FormConfig } from '@moe1399/ngx-dynamic-forms';

@Component({
  selector: 'app-my-form',
  imports: [DynamicForm],
  template: `<ngx-dynamic-form [config]="formConfig" (formSubmit)="onSubmit($event)" />`
})
export class MyFormComponent {
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

Import the default theme in your `styles.scss`:

```scss
@use '@moe1399/ngx-dynamic-forms/src/styles/themes/default';
```

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

## API

### DynamicForm Component

**Selector:** `ngx-dynamic-form`

| Input | Type | Description |
|-------|------|-------------|
| `config` | `FormConfig` | Form configuration |

| Output | Type | Description |
|--------|------|-------------|
| `formSubmit` | `EventEmitter<object>` | Emitted on form submit |
| `formSave` | `EventEmitter<object>` | Emitted on form save |
| `validationErrors` | `EventEmitter<FieldError[]>` | Emitted on validation changes |

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
  submitLabel?: string;
  saveLabel?: string;
  showSaveButton?: boolean;
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
| `data-action` | submit/save | Button action type |

## Demo

See the live demo at: https://moe1399.github.io/ngx-dynamic-forms/

## License

MIT
