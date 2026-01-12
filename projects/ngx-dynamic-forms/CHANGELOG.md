# [0.0.0](https://github.com/moe1399/ngx-dynamic-forms/compare/v0.5.4...v0.0.0) (2026-01-12)


### Features

* add named async validators with loading indicator ([435be5d](https://github.com/moe1399/ngx-dynamic-forms/commit/435be5d4bfba1c6b00a435524ee7ff97af363b81))



# [0.0.0](https://github.com/moe1399/ngx-dynamic-forms/compare/v0.5.4...v0.0.0) (2026-01-12)


### Features

* add named async validators with loading indicator ([435be5d](https://github.com/moe1399/ngx-dynamic-forms/commit/435be5d4bfba1c6b00a435524ee7ff97af363b81))



# 0.0.0 (2026-01-11)



# Changelog

All notable changes to this project will be documented in this file.

This project uses [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.
The changelog is automatically generated using `npm run changelog`.

## [0.5.3] - 2026-01-12

### Changed

- Refactored to npm workspaces monorepo structure
- Renamed validation package from `@moe1399/form-validation` to `@moe1399/ngx-dynamic-forms-validation`
- Angular library now imports shared types from validation package

## [0.5.2] - 2026-01-10

### Added

- Conditional validation support for form fields
  - `conditions` property on `ValidationRule` to apply validation conditionally
  - Support for operators: `equals`, `notEquals`, `contains`, `greaterThan`, `lessThan`, `isEmpty`, `isNotEmpty`
  - `conditionLogic` property for combining multiple conditions (`and` or `or`)
- CSS design tokens for theme customization (colors, spacing, typography)
- `allowDownload` option for file upload fields
- `name` attributes on all form inputs for better accessibility

### Fixed

- File upload read-only mode display
- Consolidated theme styling

## [0.5.1] - 2026-01-09

### Fixed

- Validation error message not showing on blur

## [0.5.0] - 2026-01-08

### Added

- File upload field type with progress tracking, abort support, and download capability
- Server-side validation libraries for Node.js (`@moe1399/ngx-dynamic-forms-validation`) and .NET (`DynamicForms.FormValidation`)

### Changed

- Increased component style budget to 50kB

## [0.4.0] - 2026-01-08

### Added

- Archived field support (`archived: boolean` property)
- JSON preview in field configuration modal
- Info icon click behavior improvement

### Fixed

- README.md asset loading with symlink in public folder
- Info icon click no longer focuses input field on required fields

## [0.3.0] - 2026-01-07

### Added

- Async/API validation support for form fields
  - `asyncValidation` config option on `FormFieldConfig` with validator function, trigger ('blur' or 'change'), and debounce time
  - `AsyncValidationConfig` and `AsyncValidationResult` interfaces
- `validating` getter to check if any async validation is in progress
- `setErrors(errors: FieldError[])` method to set external validation errors (e.g., from API responses)
- `clearErrors()` method to clear all external validation errors
- `clearFieldError(fieldName: string)` method to clear error for a specific field
- `isFieldValidating(fieldName: string)` method to check if a specific field is validating
- `triggerAsyncValidation(fieldName: string)` method to manually trigger async validation
- `validateAllAsync()` method to run all async validations and wait for completion
- `data-form-validating` attribute on form element
- `data-field-validating` attribute on field elements

### Changed

- `valid` getter now returns false when form is validating or has external errors

## [0.2.0] - 2026-01-07

### Breaking Changes

- Removed built-in submit/save buttons from DynamicForm component
- Consuming applications must now render their own buttons via content projection

### Added

- `value` getter for accessing current form values
- `valid`, `touched`, `dirty` getters for form state
- `valueChanges` output that emits on every form value change
- Content projection support for custom buttons/actions

## [0.1.2] - 2026-01-07

### Changed

- Updated README with comprehensive usage documentation
- Added MIT license file

## [0.1.1] - 2026-01-07

### Fixed

- Fixed package scope to @moe1399/ngx-dynamic-forms

## [0.1.0] - 2026-01-07

### Added

- Initial release
- DynamicForm component - headless form renderer
- NgxFormBuilder component - visual form builder
- 14 field types: text, email, number, textarea, date, daterange, select, radio, checkbox, table, datagrid, phone, info, formref
- FormBuilderService for configuration management
- FormStorage service for form data persistence
- UrlSchemaService for URL-based form sharing
- Default theme with data-attribute based styling
