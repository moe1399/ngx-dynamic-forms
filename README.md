# ngx-dynamic-forms

A headless Angular dynamic form system with matching server-side validation packages for Node.js and .NET.

## Packages

| Package | Description | Install |
|---------|-------------|---------|
| [@moe1399/ngx-dynamic-forms](./projects/ngx-dynamic-forms) | Angular headless form components | `npm install @moe1399/ngx-dynamic-forms` |
| [@moe1399/ngx-dynamic-forms-validation](./packages/form-validation) | Node.js/TypeScript server validation | `npm install @moe1399/ngx-dynamic-forms-validation` |
| [DynamicForms.FormValidation](./packages/form-validation-dotnet) | .NET server validation | `dotnet add package DynamicForms.FormValidation` |

## Features

- **Headless UI**: Zero styling, complete control via `data-*` attributes
- **JSON-driven**: Define forms as JSON configuration
- **16 Field Types**: text, email, number, textarea, date, daterange, select, radio, checkbox, table, datagrid, phone, info, formref, fileupload, autocomplete
- **Validation**: Built-in validators + custom validators with conditional validation
- **Server Validation**: Same validation rules on client and server
- **Form Builder**: Visual form builder with raw JSON editor and version history

## Quick Start

### Angular (Client)

```typescript
import { DynamicFormComponent } from '@moe1399/ngx-dynamic-forms';

@Component({
  imports: [DynamicFormComponent],
  template: `
    <ngx-dynamic-form
      [config]="formConfig"
      (formSubmit)="onSubmit($event)"
    />
  `
})
export class MyComponent {
  formConfig = {
    id: 'contact-form',
    fields: [
      {
        name: 'email',
        label: 'Email',
        type: 'email',
        validations: [
          { type: 'required', message: 'Email is required' },
          { type: 'email', message: 'Invalid email format' }
        ]
      },
      {
        name: 'endDate',
        label: 'End Date',
        type: 'date',
        validations: [
          {
            type: 'required',
            message: 'End date required for fixed term',
            condition: {
              field: 'tenure',
              operator: 'equals',
              value: 'fixedTerm'
            }
          }
        ]
      }
    ]
  };
}
```

### Node.js (Server)

```typescript
import { validateForm, validatorRegistry } from '@moe1399/ngx-dynamic-forms-validation';

// Register custom validators
validatorRegistry.register('australianPhone', (value) => {
  if (!value) return true;
  return /^(\+61|0)[2-478]\d{8}$/.test(value.replace(/\s/g, ''));
});

// Validate using same config as Angular
const result = validateForm(formConfig, req.body);

if (!result.valid) {
  return res.status(400).json({ errors: result.errors });
}
```

### .NET (Server)

```csharp
using DynamicForms.FormValidation;

// Register custom validators
ValidatorRegistry.Instance.Register("australianPhone", (value, _, _, _) => {
    if (value == null) return true;
    var phone = value.ToString()?.Replace(" ", "") ?? "";
    return Regex.IsMatch(phone, @"^(\+61|0)[2-478]\d{8}$");
});

// Validate using same config as Angular
var result = FormValidator.ValidateForm(formConfig, formData);

if (!result.Valid) {
    return Results.BadRequest(new { errors = result.Errors });
}
```

## Validation Types

| Type | Value | Description |
|------|-------|-------------|
| `required` | - | Non-empty value |
| `email` | - | Valid email format |
| `minLength` | number | String length >= value |
| `maxLength` | number | String length <= value |
| `min` | number | Numeric value >= value |
| `max` | number | Numeric value <= value |
| `pattern` | regex | Matches regex pattern |
| `custom` | - | Named custom validator |

### Conditional Validation

Validations can be applied conditionally based on other field values:

```typescript
{
  type: 'required',
  message: 'End date required for fixed term',
  condition: {
    field: 'tenure',           // Field to check
    operator: 'equals',        // equals, notEquals, isEmpty, isNotEmpty
    value: 'fixedTerm'         // Value to compare (for equals/notEquals)
  }
}
```

For table/datagrid columns, use `$form.fieldName` to reference form-level fields:

```typescript
condition: {
  field: '$form.employmentType',
  operator: 'equals',
  value: 'contractor'
}
```

### Conditional Visibility

Fields and sections can be shown/hidden based on other field values using the same condition syntax:

```typescript
// Conditional field - only shows when employmentType is 'contractor'
{
  name: 'contractorDetails',
  label: 'Contractor Details',
  type: 'textarea',
  condition: {
    field: 'employmentType',
    operator: 'equals',
    value: 'contractor'
  }
}

// Conditional section - all fields in section are hidden when condition is not met
const section: FormSection = {
  id: 'advanced-options',
  title: 'Advanced Options',
  condition: {
    field: 'showAdvanced',
    operator: 'equals',
    value: true
  }
}
```

When a field or section is hidden:
- Values are **preserved** in form state
- Values are **excluded** from submission
- Validation is **skipped** for hidden fields

Condition operators: `equals`, `notEquals`, `isEmpty`, `isNotEmpty`

## Theming

Both components are headless with optional default themes. Import themes in your global styles:

```scss
// Import both themes (dynamic form + form builder)
@import '@moe1399/ngx-dynamic-forms/src/styles/ngx-dynamic-forms';

// Or import individually
@import '@moe1399/ngx-dynamic-forms/src/styles/themes/default';              // Dynamic Form
@import '@moe1399/ngx-dynamic-forms/src/styles/themes/form-builder-default'; // Form Builder
```

### CUBE CSS Pattern

This library uses the CUBE CSS methodology:
- **Classes** (`df-*`) → Structural styling (layout, base appearance)
- **Data attributes** → State/modifiers (valid, dirty, disabled, etc.)

```html
<!-- Structure via class, state via data attribute -->
<div class="df-field"
     [attr.data-field-valid]="!hasError(field.name)"
     [attr.data-field-disabled]="isDisabled">
```

### Customizing Themes

Override CSS variables to customize:

```scss
// Dynamic Form - uses .ngx-df wrapper
.ngx-df {
  --df-color-primary: #0066cc;
  --df-color-background: #f5f5f5;
  --df-font-family: 'Roboto', sans-serif;
}

// Form Builder - uses .ngx-fb wrapper
.ngx-fb {
  --fb-color-primary: #0066cc;
  --fb-color-background: #f0f4f8;
  --fb-font-family: 'Roboto', sans-serif;
}
```

Style via classes for structure and data attributes for state:

```scss
/* Structure styling via classes */
.df-field { padding: 8px; }
.df-input { border: 1px solid var(--df-color-border); }

/* State styling via data attributes */
.df-field[data-field-valid="false"] .df-input { border-color: red; }
.df-field[data-field-disabled="true"] { opacity: 0.6; }
```

### Key Classes

| Class | Description |
|-------|-------------|
| `.df-form` | Form container |
| `.df-form-fields` | Fields section |
| `.df-form-actions` | Actions section |
| `.df-section` | Section container |
| `.df-field-row` | Row containing fields |
| `.df-field` | Individual field wrapper |
| `.df-label` | Field label |
| `.df-input-container` | Input wrapper |
| `.df-input` | Input element |
| `.df-validation-error` | Error message |

### State Attributes

| Attribute | Values | Description |
|-----------|--------|-------------|
| `data-form-valid` | `true`/`false` | Form validation state |
| `data-form-dirty` | `true`/`false` | Form has changes |
| `data-field-valid` | `true`/`false` | Field validation state |
| `data-field-touched` | `true`/`false` | Field has been touched |
| `data-field-disabled` | `true`/`false` | Field is disabled |
| `data-field-required` | `true`/`false` | Field is required |

## Form Builder

The form builder provides a visual interface for creating and editing form configurations.

```typescript
import { NgxFormBuilder } from '@moe1399/ngx-dynamic-forms';

@Component({
  imports: [NgxFormBuilder],
  template: `
    <ngx-form-builder
      [(config)]="formConfig"
      [showToolbar]="true"
      [showVersionHistory]="true"
    />
  `
})
export class FormEditorComponent {
  formConfig: FormConfig | null = null;
}
```

### Features

- **Visual Editor**: Add/edit fields, sections, validations, and wizard pages
- **Raw JSON Editor**: Edit form configuration as JSON with real-time validation
- **Version History**: Create and restore named versions of form configurations
- **Import/Export**: Import and export form configurations as JSON
- **URL Sharing**: Share form configurations via compressed URL parameters

### Toolbar Configuration

Control which toolbar buttons are visible:

```typescript
<ngx-form-builder
  [toolbarConfig]="{
    showNewForm: true,
    showSave: true,
    showExport: true,
    showImport: true,
    showEditJson: true,
    showShare: true
  }"
/>
```

## Development

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:19240)
npm start

# Build Angular library
ng build ngx-dynamic-forms

# Build server validation packages
cd packages/form-validation && npm run build
cd packages/form-validation-dotnet && dotnet build

# Run tests
ng test
```

## Documentation

- [Angular Library](./projects/ngx-dynamic-forms/README.md)
- [Node.js Validation](./packages/form-validation/README.md)
- [.NET Validation](./packages/form-validation-dotnet/README.md)

## License

MIT
