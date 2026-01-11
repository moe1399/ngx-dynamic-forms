import { validatorRegistry } from './registry.js';
import {
  FormConfig,
  FormFieldConfig,
  ValidationRule,
  ValidationCondition,
  ValidationResult,
  FieldValidationError,
  TableConfig,
  DataGridConfig,
} from './types.js';

/**
 * Email validation regex
 */
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Check if a value is empty (null, undefined, empty string, empty array)
 */
function isEmpty(value: any): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

/**
 * Evaluate a validation condition
 * @param condition - The condition to evaluate
 * @param formData - The full form data
 * @param rowData - Optional row data for table/datagrid context
 * @returns true if the condition is met, false otherwise
 */
function evaluateCondition(
  condition: ValidationCondition,
  formData: Record<string, any>,
  rowData?: Record<string, any>
): boolean {
  let fieldValue: any;

  if (condition.field.startsWith('$form.')) {
    // Form-level field reference (used from within table/datagrid context)
    const fieldName = condition.field.substring(6);
    fieldValue = formData[fieldName];
  } else if (rowData !== undefined) {
    // Same-row column reference (table/datagrid context)
    fieldValue = rowData[condition.field];
  } else {
    // Standalone field context
    fieldValue = formData[condition.field];
  }

  switch (condition.operator) {
    case 'equals':
      return fieldValue === condition.value;
    case 'notEquals':
      return fieldValue !== condition.value;
    case 'isEmpty':
      return fieldValue === null || fieldValue === undefined || fieldValue === '';
    case 'isNotEmpty':
      return fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
    default:
      return true;
  }
}

/**
 * Validate a single value against a validation rule
 * @param value - The value to validate
 * @param rule - The validation rule
 * @param fieldConfig - The field configuration
 * @param formData - The full form data
 * @param rowData - Optional row data for table/datagrid context (for condition evaluation)
 */
function validateRule(
  value: any,
  rule: ValidationRule,
  fieldConfig: FormFieldConfig,
  formData: Record<string, any>,
  rowData?: Record<string, any>
): boolean {
  // Check if validation has a condition and if it's met
  if (rule.condition) {
    if (!evaluateCondition(rule.condition, formData, rowData)) {
      return true; // Condition not met, validation passes (doesn't apply)
    }
  }

  switch (rule.type) {
    case 'required':
      return !isEmpty(value);

    case 'email':
      if (isEmpty(value)) return true; // Don't validate empty (use required for that)
      return EMAIL_REGEX.test(value);

    case 'minLength':
      if (isEmpty(value)) return true;
      return typeof value === 'string' && value.length >= rule.value;

    case 'maxLength':
      if (isEmpty(value)) return true;
      return typeof value === 'string' && value.length <= rule.value;

    case 'min':
      if (isEmpty(value)) return true;
      const numMin = typeof value === 'number' ? value : parseFloat(value);
      return !isNaN(numMin) && numMin >= rule.value;

    case 'max':
      if (isEmpty(value)) return true;
      const numMax = typeof value === 'number' ? value : parseFloat(value);
      return !isNaN(numMax) && numMax <= rule.value;

    case 'pattern':
      if (isEmpty(value)) return true;
      try {
        const regex = new RegExp(rule.value);
        return regex.test(value);
      } catch {
        console.warn(`Invalid regex pattern: ${rule.value}`);
        return true;
      }

    case 'custom':
      if (rule.customValidatorName) {
        const customValidator = validatorRegistry.get(rule.customValidatorName);
        if (customValidator) {
          return customValidator(value, rule.customValidatorParams, fieldConfig, formData);
        } else {
          console.warn(`Custom validator "${rule.customValidatorName}" not registered`);
          return true;
        }
      }
      return true;

    default:
      return true;
  }
}

/**
 * Validate a single field
 */
function validateField(
  field: FormFieldConfig,
  value: any,
  formData: Record<string, any>,
  fieldPath: string = field.name
): FieldValidationError[] {
  const errors: FieldValidationError[] = [];

  // Skip archived fields
  if (field.archived) {
    return errors;
  }

  // Skip fields without validations
  if (!field.validations || field.validations.length === 0) {
    return errors;
  }

  for (const rule of field.validations) {
    const isValid = validateRule(value, rule, field, formData);
    if (!isValid) {
      errors.push({
        field: fieldPath,
        message: rule.message,
        rule: rule.type,
      });
    }
  }

  return errors;
}

/**
 * Validate table field data
 */
function validateTableField(
  field: FormFieldConfig,
  tableData: any[],
  formData: Record<string, any>
): FieldValidationError[] {
  const errors: FieldValidationError[] = [];
  const config = field.tableConfig;

  if (!config || !Array.isArray(tableData)) {
    return errors;
  }

  tableData.forEach((row, rowIndex) => {
    if (!row || typeof row !== 'object') return;

    // Check if row is empty (all values empty)
    const isEmptyRow = config.columns.every((col) => isEmpty(row[col.name]));
    if (isEmptyRow) return; // Skip empty rows

    // Validate each column
    for (const column of config.columns) {
      if (!column.validations) continue;

      const cellValue = row[column.name];
      const cellPath = `${field.name}[${rowIndex}].${column.name}`;

      for (const rule of column.validations) {
        const isValid = validateRule(
          cellValue,
          rule,
          { ...field, name: column.name } as FormFieldConfig,
          formData,
          row // Pass row data for condition evaluation
        );
        if (!isValid) {
          errors.push({
            field: cellPath,
            message: rule.message,
            rule: rule.type,
          });
        }
      }
    }
  });

  return errors;
}

/**
 * Validate datagrid field data
 */
function validateDataGridField(
  field: FormFieldConfig,
  gridData: Record<string, any>,
  formData: Record<string, any>
): FieldValidationError[] {
  const errors: FieldValidationError[] = [];
  const config = field.datagridConfig;

  if (!config || !gridData || typeof gridData !== 'object') {
    return errors;
  }

  for (const rowLabel of config.rowLabels) {
    const rowData = gridData[rowLabel.id];
    if (!rowData) continue;

    for (const column of config.columns) {
      // Skip computed columns
      if (column.computed) continue;

      if (!column.validations) continue;

      const cellValue = rowData[column.name];
      const cellPath = `${field.name}.${rowLabel.id}.${column.name}`;

      for (const rule of column.validations) {
        const isValid = validateRule(
          cellValue,
          rule,
          { ...field, name: column.name } as FormFieldConfig,
          formData,
          rowData // Pass row data for condition evaluation
        );
        if (!isValid) {
          errors.push({
            field: cellPath,
            message: rule.message,
            rule: rule.type,
          });
        }
      }
    }
  }

  return errors;
}

/**
 * Validate phone field data
 */
function validatePhoneField(
  field: FormFieldConfig,
  phoneData: any,
  formData: Record<string, any>
): FieldValidationError[] {
  const errors: FieldValidationError[] = [];

  if (!field.validations) return errors;

  // For phone fields, check if required validation should fail
  const hasRequired = field.validations.some((v) => v.type === 'required');
  if (hasRequired) {
    const isPhoneEmpty =
      !phoneData || (!phoneData.number && !phoneData.countryCode) || !phoneData.number?.trim();
    if (isPhoneEmpty) {
      const requiredRule = field.validations.find((v) => v.type === 'required');
      errors.push({
        field: field.name,
        message: requiredRule?.message || 'This field is required',
        rule: 'required',
      });
    }
  }

  // Validate other rules on the phone number
  if (phoneData?.number) {
    for (const rule of field.validations) {
      if (rule.type === 'required') continue;

      const isValid = validateRule(phoneData.number, rule, field, formData);
      if (!isValid) {
        errors.push({
          field: field.name,
          message: rule.message,
          rule: rule.type,
        });
      }
    }
  }

  return errors;
}

/**
 * Validate daterange field data
 */
function validateDateRangeField(
  field: FormFieldConfig,
  dateRangeData: any,
  formData: Record<string, any>
): FieldValidationError[] {
  const errors: FieldValidationError[] = [];

  if (!field.validations) return errors;

  const config = field.daterangeConfig;
  const toDateOptional = config?.toDateOptional ?? false;

  // For daterange fields, check if required validation should fail
  const hasRequired = field.validations.some((v) => v.type === 'required');
  if (hasRequired) {
    const fromEmpty = !dateRangeData?.fromDate;
    const toEmpty = !dateRangeData?.toDate;

    if (fromEmpty || (!toDateOptional && toEmpty)) {
      const requiredRule = field.validations.find((v) => v.type === 'required');
      errors.push({
        field: field.name,
        message: requiredRule?.message || 'This field is required',
        rule: 'required',
      });
    }
  }

  return errors;
}

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
export function validateForm(
  config: FormConfig,
  data: Record<string, any>
): ValidationResult {
  const errors: FieldValidationError[] = [];

  for (const field of config.fields) {
    // Skip archived fields
    if (field.archived) continue;

    // Skip non-input field types
    if (field.type === 'info' || field.type === 'formref') continue;

    const value = data[field.name];

    // Handle special field types
    switch (field.type) {
      case 'table':
        errors.push(...validateTableField(field, value, data));
        break;

      case 'datagrid':
        errors.push(...validateDataGridField(field, value, data));
        break;

      case 'phone':
        errors.push(...validatePhoneField(field, value, data));
        break;

      case 'daterange':
        errors.push(...validateDateRangeField(field, value, data));
        break;

      default:
        errors.push(...validateField(field, value, data));
        break;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate a single field value
 *
 * @param fieldConfig - The field configuration
 * @param value - The value to validate
 * @param formData - Optional full form data for contextual validation
 * @returns ValidationResult for the single field
 */
export function validateFieldValue(
  fieldConfig: FormFieldConfig,
  value: any,
  formData: Record<string, any> = {}
): ValidationResult {
  const errors = validateField(fieldConfig, value, formData);
  return {
    valid: errors.length === 0,
    errors,
  };
}
