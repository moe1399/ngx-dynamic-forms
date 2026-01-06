# Changelog

All notable changes to this project will be documented in this file.

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
