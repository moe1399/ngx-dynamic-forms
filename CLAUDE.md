# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Form Builder is an Angular 21 application using standalone components with TypeScript strict mode enabled. The project uses Angular's modern architecture without NgModules.

## Angular Best Practices

### TypeScript Best Practices
- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain

### Angular Best Practices
- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v20+.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images (does not work for inline base64 images)

### Accessibility Requirements
- Must pass all AXE checks
- Must follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes

### Components
- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `computed()` for derived state
- Set `changeDetection: ChangeDetectionStrategy.OnPush` in `@Component` decorator
- Prefer inline templates for small components
- Prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead
- When using external templates/styles, use paths relative to the component TS file

### State Management
- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

### Templates
- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables
- Do not assume globals like (`new Date()`) are available
- Do not write arrow functions in templates (they are not supported)

### Services
- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Use the `inject()` function instead of constructor injection

## Development Commands

### Development Server
```bash
ng serve
```
- Runs on port **19240** (custom configuration)
- Listens on **0.0.0.0** (all network interfaces)
- Access at: http://localhost:19240/

Alternative using npm script:
```bash
npm start
```

### Building
```bash
ng build                                    # Production build
ng build --watch --configuration development # Watch mode for development
npm run watch                               # Same as above
```
Production builds output to `dist/` with:
- Bundle size budgets: 500kB warning, 1MB error for initial bundles
- 8kB warning, 12kB error for component styles

### Testing
```bash
ng test        # Run unit tests with Vitest
```

### Code Generation
```bash
ng generate component component-name        # Generate new component
ng generate --help                          # List all available schematics
```

## Deployment

### GitHub Pages
The application is configured to deploy automatically to GitHub Pages via GitHub Actions.

**Workflow**: `.github/workflows/deploy.yml`
- **Triggers**: Automatically on push to `main` branch, or manually via workflow dispatch
- **Build**: Automatically configures `base-href` based on repository type (user/org vs project page)
- **Output**: Deploys `dist/ai-form-builder/browser` to GitHub Pages

**Setup Requirements**:
1. Enable GitHub Pages in repository settings
2. Set source to "GitHub Actions"
3. Ensure workflow has proper permissions (configured in workflow file)

**Manual Deployment**:
- Navigate to Actions tab → Deploy to GitHub Pages → Run workflow

## Architecture

### Application Structure
- **Entry Point**: `src/main.ts` - Bootstraps the application with `appConfig`
- **Root Component**: `src/app/app.ts` (class name: `App`) - Uses signals for reactive state
- **Configuration**: `src/app/app.config.ts` - Provides router and global error listeners
- **Routing**: `src/app/app.routes.ts` - Route definitions
- **Styles**: SCSS with global styles in `src/styles.scss`

### Key Architectural Patterns
1. **Standalone Components**: All components are standalone (no NgModules)
2. **Signal-based State**: Uses Angular signals for reactive state management
3. **Functional Providers**: Configuration via provider functions in `appConfig`
4. **Component Naming**: Root component class is `App` (not `AppComponent`)

### TypeScript Configuration
- **Strict Mode**: Enabled with additional strictness flags
  - `noImplicitOverride`, `noPropertyAccessFromIndexSignature`, `noImplicitReturns`, `noFallthroughCasesInSwitch`
- **Angular Compiler**: Strict templates and injection parameters enabled
- **Target**: ES2022

### Styling
- **Preprocessor**: SCSS
- **Component Prefix**: `app`
- **Default Style**: New components generated with SCSS files

### Code Formatting
Prettier is configured with:
- Print width: 100 characters
- Single quotes
- Angular parser for HTML files

## Headless Dynamic Form System

### Overview
This application provides a **headless, configuration-driven dynamic form system** designed for complete styling flexibility. The architecture separates form logic from presentation, allowing business users to create custom forms and apply different visual themes.

### Architecture: Headless UI Pattern

The form component is completely **headless** - it contains zero styling and exposes all state through `data-*` attributes. This allows:
- Complete styling freedom without component modifications
- Easy integration into any design system
- Business users can create forms without developer involvement
- Multiple visual themes can be applied to the same form

### Core Components

#### 1. Dynamic Form Component (`src/app/components/dynamic-form/`)
The headless form renderer that generates forms from configuration.

**Key Features**:
- **Headless**: No default styling, empty CSS file
- **State Exposure**: All component state exposed via `data-*` attributes
- **Configuration-Driven**: Forms generated from JSON configuration objects
- **Validation**: Built-in validators with real-time error feedback
- **Local Storage**: Automatic save/load of incomplete forms
- **Auto-Save**: Configurable interval-based saving
- **Reactive**: Uses Angular signals for state management

**Component API**:
- **Input**: `config: FormConfig` - Form configuration object
- **Outputs**:
  - `formSubmit` - Emitted on successful validation with form data
  - `formSave` - Emitted on save (manual or auto-save) with form data
  - `validationErrors` - Emitted on validation state changes with error array

**Data Attributes for Styling**:

Form-level attributes:
- `data-form-id`: Unique form identifier
- `data-form-valid`: "true" | "false" - Overall form validation state
- `data-form-dirty`: "true" | "false" - Whether form has been modified
- `data-form-touched`: "true" | "false" - Whether form has been interacted with

Section-level attributes:
- `data-section-id`: Section identifier
- `data-section-header`: Present on section title elements
- `data-section-description`: Present on section description elements
- Section containers are rendered as `<section>` elements with `id` attribute for anchor navigation

Field-level attributes:
- `data-field-name`: Field identifier (e.g., "email", "firstName")
- `data-field-type`: Field type ("text", "email", "number", "textarea", "date", "select", "radio", "checkbox")
- `data-field-valid`: "true" | "false" - Field validation state
- `data-field-touched`: "true" | "false" - Whether field has been focused
- `data-field-dirty`: "true" | "false" - Whether field value has changed
- `data-field-disabled`: "true" | "false" - Whether field is disabled
- `data-field-required`: "true" | "false" - Whether field is required

Error and action attributes:
- `data-validation-error`: Present on validation error containers
- `data-action`: Button type ("submit" | "save")

#### 2. Form Builder Component (`src/app/components/form-builder/`)
Visual form builder UI for business users to create custom forms without coding.

**Key Features**:
- Section management (add, edit, remove, reorder sections)
- Visual drag-and-drop field ordering
- Field configuration (name, label, type, placeholder, disabled state)
- Field-to-section assignment
- Validation rule builder with multiple validation types
- Save/load form configurations from local storage
- JSON import/export for sharing configurations
- Real-time preview integration
- Message notifications for user actions

**Important Implementation Details**:
- Uses helper methods instead of inline spread operators (Angular template limitation)
- Initialization happens in constructor (not at declaration) to avoid dependency issues
- All state managed with signals for reactivity

**Form Builder API**:
- **Output**: `configChanged: FormConfig` - Emitted when form configuration changes

#### 3. Form Builder Service (`src/app/services/form-builder.ts`)
Manages persistence of custom form configurations.

**Key Methods**:
- `saveConfig(config: FormConfig)`: Save configuration to local storage
- `loadConfig(id: string)`: Load configuration by ID
- `getAllConfigs()`: Get all saved configurations
- `deleteConfig(id: string)`: Delete a configuration
- `createBlankConfig()`: Create new blank form template
- `exportConfig(config: FormConfig)`: Export as JSON string
- `importConfig(json: string)`: Import from JSON string

**Storage Key**: `form_configs` - Stores array of all configurations

#### 4. Form Storage Service (`src/app/services/form-storage.ts`)
Manages persistence of form submission data.

**Key Methods**:
- `saveForm(formId, data, isComplete)`: Save form data
- `loadForm(formId)`: Load saved form data
- `clearForm(formId)`: Delete saved data
- `hasStoredForm(formId)`: Check if data exists
- `getAllForms()`: Get all saved form submissions

**Storage Key Pattern**: `dynamic_form_{formId}` - Individual form data

### Theming System

The application uses a single default theme with a government/official form style:

#### Default Theme (`src/styles/form-themes/default.scss`)
- Purple headers (#512B58) with white text
- Lavender backgrounds (#E8E0ED) for field rows
- Table-like layout with labels on the left
- Clean borders and professional styling
- Arial font family

**Styling Pattern**:
The theme uses attribute selectors to style the headless component:
```scss
// Target forms by data attribute
form[data-form-id] {
  /* form styles */
}

// Target field rows and inline groups
[data-field-row] {
  /* row styles */
}

[data-field-row][data-inline-group] {
  /* inline group specific styles */
}

// Target fields by state
[data-field-valid="false"] input {
  border-color: red;
}

// Target buttons by action type
button[data-action="submit"] {
  background: #512B58;
}
```

### Test Harness

The main application (`src/app/app.ts` and `src/app/app.html`) provides a test harness with two views:

#### Builder View
- Visual form builder interface
- Add/edit/remove fields
- Configure validations and inline groups
- Save/load configurations
- Import/export JSON

#### Preview & Test View
- Live form preview with default theme
- Functional form submission
- Display submission results
- Documentation of data attributes

### Supported Field Types
- `text`: Standard text input
- `email`: Email input with validation
- `number`: Number input
- `textarea`: Multi-line text area
- `date`: Date picker
- `select`: Dropdown selection with options
- `radio`: Radio button group (mutually exclusive single selection)
- `checkbox`: Checkbox group (multiple selection) or single boolean toggle
- `table`: Repeatable table with configurable columns

#### Radio and Checkbox Groups

For `radio` and `checkbox` field types, use the `options` property to define choices:

```typescript
// Radio - mutually exclusive (single selection)
{
  name: 'applicationType',
  label: 'Application type',
  type: 'radio',
  sectionId: 'application-type',
  options: [
    { value: 'first-year', label: 'First year (less than 12 months teaching experience)' },
    { value: 'second-year', label: 'Second year (more than 12 months but less than 24 months)' }
  ],
  validations: [{ type: 'required', message: 'Please select an application type' }]
}

// Checkbox group - multiple selection
{
  name: 'additionalInfo',
  label: 'Additional information',
  type: 'checkbox',
  sectionId: 'additional-info',
  options: [
    { value: 'part-time', label: 'Part time teacher' },
    { value: 'term-only', label: 'Term time only' },
    { value: 'relieving', label: 'Relieving teacher' }
  ]
}

// Single checkbox (boolean toggle) - no options
{
  name: 'agreeToTerms',
  label: 'I agree to the terms and conditions',
  type: 'checkbox'
}
```

**Data Attributes for Radio/Checkbox Styling**:
- `data-radio-group`: Container for radio options
- `data-radio-option`: Individual radio option label
- `data-radio-input`: Radio input element
- `data-radio-label`: Radio option text
- `data-checkbox-group`: Container for checkbox options
- `data-checkbox-option`: Individual checkbox option label
- `data-checkbox-input`: Checkbox input element
- `data-checkbox-label`: Checkbox option text
- `data-checkbox-single`: Single boolean checkbox (no options)
- `data-option-value`: The value of the option
- `data-option-selected`: "true" | "false" for checkbox selection state

#### Table Field Type

The `table` field type creates a repeatable table structure with configurable columns. Each column can have its own field type and validations.

**Table Configuration**:
```typescript
{
  name: 'teachingHistory',
  label: 'Teaching Experience',
  type: 'table',
  sectionId: 'teaching-experience',
  tableConfig: {
    columns: [
      {
        name: 'school',
        label: 'School',
        type: 'text',
        placeholder: 'Enter school name',
        width: 2,
        validations: [{ type: 'required', message: 'School is required' }]
      },
      {
        name: 'startDate',
        label: 'Start date',
        type: 'date',
        validations: [{ type: 'required', message: 'Start date is required' }]
      },
      {
        name: 'endDate',
        label: 'End date',
        type: 'date'
      },
      {
        name: 'tenure',
        label: 'Tenure',
        type: 'select',
        options: [
          { value: 'full-time', label: 'Full-time' },
          { value: 'part-time', label: 'Part-time' },
          { value: 'casual', label: 'Casual' }
        ]
      }
    ],
    rowMode: 'fixed',      // 'fixed' or 'dynamic'
    fixedRowCount: 3,      // For fixed mode (default: 3)
    minRows: 0,            // For dynamic mode (default: 0)
    maxRows: 10,           // For dynamic mode (default: 10)
    addRowLabel: 'Add row' // Button text for dynamic mode
  }
}
```

**TableConfig Interface**:
```typescript
interface TableConfig {
  columns: TableColumnConfig[];
  rowMode: 'fixed' | 'dynamic';
  fixedRowCount?: number;   // For fixed mode
  minRows?: number;         // For dynamic mode
  maxRows?: number;         // For dynamic mode
  addRowLabel?: string;     // Button text
  removeRowLabel?: string;  // Remove button aria-label
}

interface TableColumnConfig {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select';
  placeholder?: string;
  validations?: ValidationRule[];
  options?: { label: string; value: any }[];  // For select columns
  width?: number;  // Column width (1-4)
}
```

**Row Modes**:
- **fixed**: Displays a set number of empty rows (configurable via `fixedRowCount`)
- **dynamic**: Users can add/remove rows with buttons (constrained by `minRows`/`maxRows`)

**Validation Behavior**:
- Empty rows are ignored during validation
- Only non-empty rows are validated against column rules
- Cell errors shown as tooltips on hover/focus

**Data Storage Format**:
```typescript
// Table value is an array of row objects
[
  { school: 'Lincoln High', startDate: '2020-01-15', endDate: '2022-06-30', tenure: 'full-time' },
  { school: 'Washington Middle', startDate: '2022-08-01', endDate: '', tenure: 'part-time' }
]
// Empty rows are filtered out on form submission
```

**Data Attributes for Table Styling**:
- `data-table-container`: Container wrapper
- `data-table-name`: Field name on container
- `data-row-mode`: "fixed" | "dynamic"
- `data-table-valid`: "true" | "false" - Overall table validity
- `data-table`: Table element
- `data-table-header`: Thead element
- `data-table-header-row`: Header tr
- `data-table-header-cell`: Header th
- `data-column-name`: Column identifier
- `data-column-type`: Column input type
- `data-column-width`: Column width (1-4)
- `data-table-body`: Tbody element
- `data-table-row`: Row tr element
- `data-row-index`: Row index (0-based)
- `data-row-empty`: "true" | "false" - Whether row is empty
- `data-table-cell`: Cell td element
- `data-cell-valid`: "true" | "false" - Cell validity
- `data-table-input`: Input within cell
- `data-cell-error-tooltip`: Error tooltip element
- `data-table-footer`: Footer container (dynamic mode)
- `data-table-action`: "add" | "remove" - Button action type
- `data-table-actions-column`: Actions column header
- `data-table-actions-cell`: Actions cell (remove button)

### Validation Types
- `required`: Field must have a value
- `email`: Must be valid email format
- `minLength`: Minimum character length (requires value)
- `maxLength`: Maximum character length (requires value)
- `min`: Minimum numeric value (requires value)
- `max`: Maximum numeric value (requires value)
- `pattern`: Must match regex pattern (requires value)
- `custom`: Custom validation function (requires validator function)

### Sections

Sections allow grouping form fields into logical groups with headers and descriptions:

**FormSection Interface**:
```typescript
interface FormSection {
  id: string;           // Unique identifier
  title: string;        // Display title (e.g., "School Information")
  description?: string; // Optional description below header
  anchorId?: string;    // Custom anchor ID (auto-generated from title if not provided)
  order?: number;       // Section ordering
}
```

**Section Features**:
- Fields reference sections via `sectionId` property
- Fields without `sectionId` render as ungrouped (outside sections)
- Section containers use `<section>` HTML element with anchor `id`
- Anchor IDs auto-generated from title (e.g., "School Information" → "school-information")
- Custom anchor IDs can override auto-generated ones

**Section Data Attributes**:
- `data-section-id`: Section identifier on container
- `data-section-header`: Section title element
- `data-section-description`: Section description element

**Section Styling** (in theme):
```scss
[data-section-id] {
  /* section container styles */
}

[data-section-header] {
  background: #512B58;
  color: #ffffff;
  padding: 8px 12px;
  font-weight: bold;
}

[data-section-description] {
  background: #512B58;
  color: #ffffff;
  padding: 6px 12px;
  font-size: 13px;
}
```

### File Structure
```
src/
├── app/
│   ├── components/
│   │   ├── dynamic-form/            # Headless form component
│   │   │   ├── dynamic-form.ts
│   │   │   ├── dynamic-form.html
│   │   │   └── dynamic-form.scss    # Empty (headless)
│   │   └── form-builder/            # Visual form builder
│   │       ├── form-builder.ts
│   │       ├── form-builder.html
│   │       └── form-builder.scss
│   ├── models/
│   │   └── form-config.interface.ts # Type definitions
│   ├── services/
│   │   ├── form-storage.ts          # Form data persistence
│   │   └── form-builder.ts          # Config persistence
│   ├── app.ts                       # Test harness component
│   ├── app.html                     # Test harness template
│   └── app.scss                     # Test harness styles
└── styles/
    └── form-themes/
        └── default.scss             # Default theme (government style)
```

### Usage Example

```typescript
// 1. Create form configuration with sections
const applicationForm = signal<FormConfig>({
  id: 'application-form',
  submitLabel: 'Submit Application',
  saveLabel: 'Save Draft',
  autoSave: true,
  autoSaveInterval: 5000,
  sections: [
    {
      id: 'personal-info',
      title: 'Personal Information',
      description: 'Please provide your contact details',
      order: 0
    },
    {
      id: 'message-section',
      title: 'Your Message',
      order: 1
    }
  ],
  fields: [
    {
      name: 'email',
      label: 'Email Address',
      type: 'email',
      placeholder: 'you@example.com',
      order: 0,
      sectionId: 'personal-info',  // Assign to section
      validations: [
        { type: 'required', message: 'Email is required' },
        { type: 'email', message: 'Please enter a valid email' }
      ]
    },
    {
      name: 'message',
      label: 'Message',
      type: 'textarea',
      placeholder: 'Your message here...',
      order: 1,
      sectionId: 'message-section',  // Assign to section
      validations: [
        { type: 'required', message: 'Message is required' },
        { type: 'minLength', value: 10, message: 'Message must be at least 10 characters' }
      ]
    }
  ]
});

// 2. Use in template
<app-dynamic-form
  [config]="applicationForm()"
  (formSubmit)="handleSubmit($event)"
  (formSave)="handleSave($event)"
  (validationErrors)="handleErrors($event)"
/>

// 3. Create custom theme (in your SCSS file)
form[data-form-id="application-form"] {
  padding: 2rem;
  background: white;
  border-radius: 8px;

  // Section styling
  [data-section-header] {
    background: #512B58;
    color: white;
    padding: 0.75rem 1rem;
    font-weight: bold;
  }

  [data-section-description] {
    background: #512B58;
    color: white;
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
  }

  [data-field-name] {
    margin-bottom: 1rem;
  }

  [data-field-required="true"] label::after {
    content: " *";
    color: red;
  }

  [data-field-valid="false"] input {
    border: 2px solid red;
  }

  [data-validation-error] {
    color: red;
    font-size: 0.875rem;
  }

  button[data-action="submit"] {
    background: blue;
    color: white;
    padding: 0.75rem 2rem;
  }
}
```

### Extending the System

**Adding New Field Types**:
1. Add type to `FieldType` in `form-config.interface.ts`
2. Add rendering logic in `dynamic-form.html` using `@switch/@case`
3. Update form-builder field type dropdown
4. Add corresponding `data-field-type` attribute
5. Create theme styles for new field type

**Adding New Validation Types**:
1. Add type to `ValidationRule` in `form-config.interface.ts`
2. Update `getValidators()` method in `dynamic-form.ts`
3. Add to `validationTypes` array in `form-builder.ts`
4. Update validation editor UI in `form-builder.html`

**Customizing the Theme**:
1. Edit `src/styles/form-themes/default.scss`
2. Use attribute selectors targeting `data-*` attributes
3. Key selectors: `[data-field-row]`, `[data-inline-group]`, `[data-field-name]`, `[data-input-container]`

### Important Angular Template Limitations

When working with Angular templates in this project, be aware:
- **No spread operators**: Use helper methods instead of `{ ...obj, prop: value }`
- **No arrow functions**: Create component methods instead of inline `() => {}`
- **No complex expressions**: Keep template expressions simple, move logic to component

## Design Documents
Design documents and architecture diagrams should be placed in the `design-docs/` directory.

## Documentation Maintenance
**Important**: When making significant changes to the codebase:
- Update this CLAUDE.md file to reflect new architectural patterns, commands, or configurations
- Update relevant documentation in `design-docs/` when modifying system design or architecture
- Keep README.md synchronized with any changes to development workflow or setup instructions
