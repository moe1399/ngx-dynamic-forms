# @moe1399/ngx-dynamic-forms-validation

Server-side form validation library compatible with `@moe1399/ngx-dynamic-forms`. Use the same form configuration and validation rules on both client and server.

## Installation

```bash
npm install @moe1399/ngx-dynamic-forms-validation
```

## Usage

```typescript
import { validateForm, validatorRegistry } from '@moe1399/ngx-dynamic-forms-validation';

// Register custom validators (same implementation as Angular client)
validatorRegistry.register('australianPhoneNumber', (value) => {
  if (!value) return true;
  return /^(\+61|0)[2-478]\d{8}$/.test(value.replace(/\s/g, ''));
});

// Use the same form config as your Angular app
const formConfig = {
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
      name: 'phone',
      label: 'Phone',
      type: 'text',
      validations: [
        {
          type: 'custom',
          customValidatorName: 'australianPhoneNumber',
          message: 'Invalid Australian phone number'
        }
      ]
    }
  ]
};

// Validate submitted form data
const formData = {
  email: 'test@example.com',
  phone: '0412345678'
};

const result = validateForm(formConfig, formData);

if (!result.valid) {
  console.log('Validation errors:', result.errors);
  // [{ field: 'email', message: 'Email is required', rule: 'required' }]
}
```

## API

### `validateForm(config, data)`

Validates form data against a form configuration.

**Parameters:**
- `config: FormConfig` - The form configuration (same as `@moe1399/ngx-dynamic-forms`)
- `data: Record<string, any>` - The form data to validate

**Returns:** `ValidationResult`
```typescript
interface ValidationResult {
  valid: boolean;
  errors: FieldValidationError[];
}

interface FieldValidationError {
  field: string;      // e.g., "email" or "contacts[0].phone"
  message: string;
  rule: string;       // Validation type that failed
}
```

### `validateFieldValue(fieldConfig, value, formData?)`

Validates a single field value.

**Parameters:**
- `fieldConfig: FormFieldConfig` - The field configuration
- `value: any` - The value to validate
- `formData?: Record<string, any>` - Optional full form data for contextual validation

**Returns:** `ValidationResult`

### `validatorRegistry`

Registry for custom validators.

```typescript
// Register a single validator
validatorRegistry.register('validatorName', (value, params, fieldConfig, formData) => {
  return true; // or false
});

// Register multiple validators
validatorRegistry.registerAll({
  validator1: (value) => true,
  validator2: (value) => true,
});

// Check if validator exists
validatorRegistry.has('validatorName');

// List all registered validators
validatorRegistry.list();

// Remove a validator
validatorRegistry.unregister('validatorName');

// Clear all validators
validatorRegistry.clear();
```

## Built-in Validators

| Type | Value | Behavior |
|------|-------|----------|
| `required` | - | Non-empty value |
| `email` | - | Valid email format |
| `minLength` | number | String length >= value |
| `maxLength` | number | String length <= value |
| `min` | number | Numeric value >= value |
| `max` | number | Numeric value <= value |
| `pattern` | regex | Matches regex pattern |
| `custom` | - | Uses customValidatorName |

## Express.js Example

```typescript
import express from 'express';
import { validateForm, validatorRegistry } from '@moe1399/ngx-dynamic-forms-validation';

const app = express();
app.use(express.json());

// Register validators at startup
validatorRegistry.register('australianPhoneNumber', (value) => {
  if (!value) return true;
  return /^(\+61|0)[2-478]\d{8}$/.test(value.replace(/\s/g, ''));
});

// Form config (could be loaded from database)
const formConfig = { /* ... */ };

app.post('/api/submit', (req, res) => {
  const result = validateForm(formConfig, req.body);

  if (!result.valid) {
    return res.status(400).json({ errors: result.errors });
  }

  // Process valid form data
  res.json({ success: true });
});
```

## License

MIT
