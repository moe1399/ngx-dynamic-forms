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
export { validateForm, validateFieldValue } from './validator.js';
export { parseConfig, validateConfig, loadConfig, loadConfigSync, } from './config-loader.js';
export { validatorRegistry } from './registry.js';
export type { FormConfig, FormFieldConfig, FormSection, FieldType, ValidationRule, ValidationRuleType, ValidationCondition, ValidationConditionOperator, CountryCodeOption, PhoneConfig, DateRangeConfig, FormRefConfig, FileUploadTiming, FileUploadConfig, FileUploadValue, TableColumnType, TableRowMode, TableConfig, TableColumnConfig, DataGridColumnType, DataGridColumnGroup, DataGridFormula, DataGridConfig, DataGridColumnConfig, DataGridRowLabel, DataGridTotalsConfig, CustomValidatorFn, ValidationResult, FieldValidationError, } from './types.js';
export type { ConfigValidationError, ConfigValidationResult, } from './config-loader.js';
