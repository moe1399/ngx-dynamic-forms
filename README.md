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
- **15 Field Types**: text, email, number, textarea, date, daterange, select, radio, checkbox, table, datagrid, phone, info, formref, fileupload
- **Validation**: Built-in validators + custom validators with conditional validation
- **Server Validation**: Same validation rules on client and server
- **Form Builder**: Visual form builder UI included

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
