import { FormConfig, FormFieldConfig, ValidationResult } from './types.js';
/**
 * Validate an entire form against its configuration
 *
 * @param config - The form configuration
 * @param data - The form data to validate
 * @returns ValidationResult with valid boolean and any errors
 *
 * @example
 * ```typescript
 * import { validateForm, validatorRegistry } from '@moe1399/form-validation';
 *
 * // Register custom validators first
 * validatorRegistry.register('australianPhoneNumber', (value) => {
 *   if (!value) return true;
 *   return /^(\+61|0)[2-478]\d{8}$/.test(value.replace(/\s/g, ''));
 * });
 *
 * // Validate form data
 * const result = validateForm(formConfig, formData);
 * if (!result.valid) {
 *   console.log('Validation errors:', result.errors);
 * }
 * ```
 */
export declare function validateForm(config: FormConfig, data: Record<string, any>): ValidationResult;
/**
 * Validate a single field value
 *
 * @param fieldConfig - The field configuration
 * @param value - The value to validate
 * @param formData - Optional full form data for contextual validation
 * @returns ValidationResult for the single field
 */
export declare function validateFieldValue(fieldConfig: FormFieldConfig, value: any, formData?: Record<string, any>): ValidationResult;
