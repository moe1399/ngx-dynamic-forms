# CLAUDE.md

## Git Workflow

- **NEVER commit changes to git unless explicitly told to**
- Do not push to remote unless explicitly requested

### Conventional Commits

This project uses [Conventional Commits](https://www.conventionalcommits.org/) for commit messages. The changelog is automatically generated from these commits using `npm run changelog`.

**Commit Format:**
```
<type>: <description>

[optional body]

[optional footer]
```

**Types:**

| Type | Description | Changelog Section |
|------|-------------|-------------------|
| `feat` | New feature | Features |
| `fix` | Bug fix | Bug Fixes |
| `docs` | Documentation only | - |
| `style` | Formatting, no code change | - |
| `refactor` | Code change that neither fixes nor adds | - |
| `perf` | Performance improvement | Performance |
| `test` | Adding tests | - |
| `chore` | Build process, dependencies | - |

**Examples:**
```bash
feat: add conditional validation support
fix: resolve phone input validation on blur
docs: update README with new API examples
refactor: simplify table row rendering logic
perf: optimize form change detection
feat!: remove deprecated validation API
```

**Breaking Changes:**
- Add `!` after type: `feat!: remove old API`
- Or add `BREAKING CHANGE:` in footer

**Scope (optional):**
```bash
feat(table): add row reordering
fix(validation): handle empty date ranges
```

**Changelog Generation:**
- `npm run changelog` - Append new commits to changelog
- `npm run changelog:all` - Regenerate entire changelog
- Changelog is automatically updated during `npm run publish`

## Project Overview

Angular 21 app with standalone components, TypeScript strict mode, no NgModules.

## Angular Best Practices

**TypeScript**: Strict checking, prefer inference, avoid `any`

**Components**:
- Standalone components (no `standalone: true` - default in v20+)
- Signals for state, `computed()` for derived state
- `input()`/`output()` functions, not decorators
- `ChangeDetectionStrategy.OnPush`
- Host bindings in `host` object (not `@HostBinding`/`@HostListener`)
- Native control flow (`@if`, `@for`, `@switch`)
- Class bindings not `ngClass`, style bindings not `ngStyle`
- No arrow functions in templates
- Reactive forms preferred

**Services**: Single responsibility, `providedIn: 'root'`, `inject()` not constructor injection

**Accessibility**: Pass AXE checks, WCAG AA compliance

## Development Commands

- `ng serve` → http://localhost:19240/ (port 19240, 0.0.0.0)
- `npm start` → same
- `ng build` → production (dist/), budgets: 500kB warn, 1MB error
- `npm run watch` → dev watch mode
- `ng test` → Vitest

## Deployment

GitHub Actions auto-deploys to GitHub Pages on push to `main` (`.github/workflows/deploy.yml`)

## Architecture

- Entry: `src/main.ts`, Root: `src/app/app.ts` (class: `App`)
- Config: `src/app/app.config.ts`, Routes: `src/app/app.routes.ts`
- SCSS, component prefix: `app`, Prettier: 100 chars, single quotes
- TypeScript: ES2022, strict mode + `noImplicitOverride`, `noPropertyAccessFromIndexSignature`, `noImplicitReturns`, `noFallthroughCasesInSwitch`

## Headless Dynamic Form System

**Pattern**: Headless UI - zero styling, all state via `data-*` attributes for complete styling freedom.

### Core Components

**1. Dynamic Form** (`src/app/components/dynamic-form/`)
- Headless form renderer, JSON-driven config
- Auto-save, local storage, real-time validation
- **Input**: `config: FormConfig`
- **Outputs**: `formSubmit`, `formSave`, `validationErrors`
- **Data attrs**: `data-form-id`, `data-form-valid`, `data-form-dirty`, `data-form-touched`, `data-section-id`, `data-section-header`, `data-section-description`, `data-section-hidden`, `data-field-name`, `data-field-type`, `data-field-valid`, `data-field-touched`, `data-field-dirty`, `data-field-disabled`, `data-field-required`, `data-field-hidden`, `data-validation-error`, `data-action`

**2. Form Builder** (`src/app/components/form-builder/`)
- Visual builder UI: sections, fields, validations, drag-drop ordering
- Save/load, JSON import/export, URL sharing (compressed)
- Uses helper methods (no spread in templates), signals for state
- **Output**: `configChanged: FormConfig`

**3. Services**:
- `form-builder.ts`: Config persistence (storage key: `form_configs`)
  - Methods: `saveConfig`, `loadConfig`, `getAllConfigs`, `deleteConfig`, `createBlankConfig`, `exportConfig`, `importConfig`
- `form-storage.ts`: Form data persistence (key: `dynamic_form_{formId}`)
  - Methods: `saveForm`, `loadForm`, `clearForm`, `hasStoredForm`, `getAllForms`
- `url-schema.ts`: URL sharing with base64 compression (param: `schema`)
  - Methods: `encodeSchema`, `decodeSchema`, `generateShareUrl`, `getSchemaFromUrl`, `hasSchemaInUrl`, `clearSchemaFromUrl`, `copyShareUrlToClipboard`

### Theming

Default theme (`src/styles/form-themes/default.scss`): Purple headers (#512B58), lavender backgrounds (#E8E0ED), table layout, Arial font.
Style via attribute selectors: `form[data-form-id]`, `[data-field-row]`, `[data-field-valid="false"]`, etc.

### Field Types

- `text`, `email`, `number`, `textarea`, `date`, `select`
- `radio`: Mutually exclusive, requires `options: [{value, label}]`
- `checkbox`: Multi-select with `options`, or single boolean (no options)
  - Data attrs: `data-radio-group`, `data-radio-option`, `data-radio-input`, `data-radio-label`, `data-checkbox-group`, `data-checkbox-option`, `data-checkbox-input`, `data-checkbox-label`, `data-checkbox-single`, `data-option-value`, `data-option-selected`
- `info`: Static markdown block (`content` property)
  - Markdown: `**bold**`, `*italic*`, `[link](url)`
  - Data attrs: `data-info-block`, `data-info-content`
- `phone`: Country code select + numeric input
  - Config: `phoneConfig: {countryCodes: [{code, country, flag}], defaultCountryCode}`
  - Storage: `{countryCode: '+61', number: '0412345678'}`
  - Data attrs: `data-phone-container`, `data-phone-valid`, `data-phone-country-code`, `data-phone-number`
- `daterange`: From/to date inputs
  - Config: `daterangeConfig: {fromLabel, toLabel, separatorText, toDateOptional}`
  - Storage: `{fromDate: '2024-01-15', toDate: '2024-12-31'}`
  - Data attrs: `data-daterange-container`, `data-daterange-valid`, `data-daterange-field`, `data-daterange-from-field`, `data-daterange-to-field`, `data-daterange-label`, `data-daterange-from-label`, `data-daterange-to-label`, `data-daterange-input`, `data-daterange-from`, `data-daterange-to`, `data-daterange-separator`
- `formref`: Embed saved form fields
  - Config: `formrefConfig: {formId, showSections, fieldPrefix}`
  - Prevents recursion (`info`/`formref` types excluded), nested storage
  - Storage: `{contactInfo: {email: '...', phone: {...}}}`
  - Data attrs: `data-formref-container`, `data-formref-name`, `data-formref-form-id`, `data-formref-valid`, `data-formref-show-sections`, `data-formref-section`, `data-formref-section-id`, `data-formref-section-header`, `data-formref-section-description`, `data-formref-field`, `data-formref-field-name`, `data-formref-field-type`, `data-formref-label`, `data-formref-input-container`, `data-formref-input`, `data-formref-error`
- `table`: Repeatable rows with columns
  - Config: `tableConfig: {columns: [{name, label, type, placeholder, validations, options, width: 1-4}], rowMode: 'fixed'|'dynamic', fixedRowCount, minRows, maxRows, addRowLabel, removeRowLabel}`
  - Column widths: 1=15%, 2=25%, 3=35%, 4=45%
  - Validation: Empty rows ignored, cell errors as tooltips
  - Storage: Array of row objects (empty rows filtered)
  - Data attrs: `data-table-container`, `data-table-name`, `data-row-mode`, `data-table-valid`, `data-table`, `data-table-header`, `data-table-header-row`, `data-table-header-cell`, `data-column-name`, `data-column-type`, `data-column-width`, `data-table-body`, `data-table-row`, `data-row-index`, `data-row-empty`, `data-table-cell`, `data-column-label`, `data-cell-valid`, `data-table-input`, `data-cell-error-tooltip`, `data-table-footer`, `data-table-action`, `data-table-actions-column`, `data-table-actions-cell`
  - Responsive: >640px table, ≤640px cards with labels via `::before` + `attr(data-column-label)`
- `datagrid`: Fixed rows, column groups, computed columns, totals
  - Config: `datagridConfig: {columns: [{name, label, type, placeholder, validations, options, width, computed, formula, showInColumnTotal, showInRowTotal}], rowLabels: [{id, label}], columnGroups: [{id, label, columnIds}], rowLabelHeader, totals: {showRowTotals, rowTotalLabel, showColumnTotals, columnTotalLabel}}`
  - Formula: `{type: 'expression', expression: 'students * 0.5'}` (references other columns)
  - Storage: Object keyed by row ID (computed/totals not stored)
  - Data attrs: `data-datagrid-container`, `data-datagrid-name`, `data-datagrid-valid`, `data-datagrid`, `data-datagrid-header`, `data-column-group`, `data-column-group-id`, `data-row-label-header`, `data-datagrid-header-cell`, `data-column-computed`, `data-datagrid-body`, `data-datagrid-row`, `data-row-id`, `data-row-label-cell`, `data-datagrid-cell`, `data-datagrid-input`, `data-datagrid-computed-value`, `data-cell-valid`, `data-is-total-row`, `data-is-total-column`, `data-is-grand-total`, `data-datagrid-total-value`, `data-column-label`, `data-column-group-label`, `data-total-label`
  - Responsive: Same as table, card headers show row label + row label header

### Validation Types

`required`, `email`, `minLength` (+ value), `maxLength` (+ value), `min` (+ value), `max` (+ value), `pattern` (+ value), `custom` (+ validator function)

### Sections

Group fields with headers/descriptions. Sections and fields can be conditionally shown/hidden.
```typescript
interface FormSection {
  id: string;
  title: string;
  description?: string;
  anchorId?: string;  // Auto-generated from title if not set
  order?: number;
  condition?: ValidationCondition;  // Visibility condition - section hidden when condition is not met
}
```
Fields link via `sectionId`. Sections render as `<section id="anchorId">`. Data attrs: `data-section-id`, `data-section-header`, `data-section-description`, `data-section-hidden`.

### Conditional Visibility

Fields and sections support `condition?: ValidationCondition` for conditional visibility:
- Condition operators: `equals`, `notEquals`, `isEmpty`, `isNotEmpty`
- Hidden field/section values are preserved but excluded from submission
- Validation is skipped for hidden fields
- Data attrs: `data-field-hidden`, `data-section-hidden`

### File Structure

```
src/app/
  components/
    dynamic-form/  # Headless form (.ts, .html, .scss empty)
    form-builder/  # Visual builder (.ts, .html, .scss)
  models/form-config.interface.ts
  services/form-storage.ts, form-builder.ts, url-schema.ts
  app.ts, app.html, app.scss  # Test harness
src/styles/
  reset.scss
  form-themes/default.scss
```

### Extending

**New Field Type**: Add to `FieldType` in interface, render in `dynamic-form.html` (`@switch/@case`), update builder dropdown, add `data-field-type`, theme styles.
**New Validation**: Add to `ValidationRule`, update `getValidators()` in `dynamic-form.ts`, add to `validationTypes` in `form-builder.ts`, update validation UI.
**Theme**: Edit `default.scss`, use `data-*` selectors (`[data-field-row]`, `[data-inline-group]`, `[data-field-name]`, `[data-input-container]`).

### Template Limitations

- No spread operators (use helper methods)
- No arrow functions (use component methods)
- No complex expressions (move to component)

## Server Validation Packages

When making changes to form validation (ValidationRule, validation types, conditional validation, etc.), **always update both server validation packages**:

- `packages/form-validation/` - TypeScript/JavaScript package
  - `src/types.ts` - Type definitions
  - `src/validator.ts` - Validation logic
- `packages/form-validation-dotnet/` - .NET package
  - `src/Models/ValidationRule.cs` - Model classes
  - `src/FormValidator.cs` - Validation logic

Both packages must stay in sync with the Angular library's validation features.

## Issue Tracking

The `ISSUES/` folder contains markdown files for tracking bugs, features, and improvements.

### Creating Issues

1. Create a new markdown file in `ISSUES/` with a descriptive filename (e.g., `checkbox-radio-readonly-bug.md`)
2. Include the following sections:
   - **Description**: Clear summary of the issue
   - **Affected Components**: Which parts of the codebase are impacted
   - **Root Cause Analysis**: Detailed investigation of the problem
   - **Affected Code Locations**: Specific files and line numbers
   - **Recommended Fix**: Proposed solution

### Archiving Completed Issues

When an issue is resolved:
1. Move the file from `ISSUES/` to `ISSUES/done/`
2. Optionally add a `## Resolution` section documenting what was changed

### Example Issue Filename

- `checkbox-radio-readonly-bug.md` - Descriptive, kebab-case filenames

## Documentation Maintenance

- **Always update README.md** when adding new features or changing existing functionality
- Update CLAUDE.md when changing architecture, commands, or workflow
