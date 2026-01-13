/**
 * @moe1399/ngx-dynamic-forms-validation
 *
 * Server-side form validation library compatible with @moe1399/ngx-dynamic-forms.
 * Use the same form configuration and validation rules on both client and server.
 *
 * @example
 * ```typescript
 * import { validateForm, validatorRegistry } from '@moe1399/ngx-dynamic-forms-validation';
 *
 * // Register custom validators (same implementation as Angular)
 * validatorRegistry.register('australianPhoneNumber', (value) => {
 *   if (!value) return true;
 *   return /^(\+61|0)[2-478]\d{8}$/.test(value.replace(/\s/g, ''));
 * });
 *
 * // Validate submitted form data
 * const result = validateForm(formConfig, formData);
 *
 * if (!result.valid) {
 *   // Return validation errors to client
 *   res.status(400).json({ errors: result.errors });
 * }
 * ```
 */

// Main validation functions
export { validateForm, validateFieldValue, validateFieldAsync, validateFormAsync } from './validator.js';

// Config loading and validation
export {
  parseConfig,
  validateConfig,
  loadConfig,
  loadConfigSync,
} from './config-loader.js';

// Validator registry
export { validatorRegistry, asyncValidatorRegistry } from './registry.js';

// Types
export type {
  // Form configuration types
  FormConfig,
  FormFieldConfig,
  FormSection,
  WizardPage,
  WizardConfig,
  FieldType,
  ValidationRule,
  ValidationRuleType,
  ValidationCondition,
  ValidationConditionOperator,
  // Phone types
  CountryCodeOption,
  PhoneConfig,
  // Date range types
  DateRangeConfig,
  // Form ref types
  FormRefConfig,
  // File upload types
  FileUploadTiming,
  FileUploadConfig,
  FileUploadValue,
  // Table types
  TableColumnType,
  TableRowMode,
  TableConfig,
  TableColumnConfig,
  // DataGrid types
  DataGridColumnType,
  DataGridColumnGroup,
  DataGridFormula,
  DataGridConfig,
  DataGridColumnConfig,
  DataGridRowLabel,
  DataGridTotalsConfig,
  // Validation types
  CustomValidatorFn,
  AsyncValidatorFn,
  AsyncValidationResult,
  AsyncValidationConfig,
  ValidationResult,
  FieldValidationError,
} from './types.js';

// Config validation types
export type {
  ConfigValidationError,
  ConfigValidationResult,
} from './config-loader.js';
