import {
  FormConfig,
  FormFieldConfig,
  ValidationRule,
  FieldType,
  TableConfig,
  DataGridConfig,
} from './types.js';

/**
 * Config validation error
 */
export interface ConfigValidationError {
  path: string;
  message: string;
}

/**
 * Result of config validation
 */
export interface ConfigValidationResult {
  valid: boolean;
  errors: ConfigValidationError[];
  config?: FormConfig;
}

const VALID_FIELD_TYPES: FieldType[] = [
  'text',
  'email',
  'number',
  'textarea',
  'select',
  'checkbox',
  'radio',
  'date',
  'daterange',
  'table',
  'info',
  'datagrid',
  'phone',
  'formref',
];

const VALID_VALIDATION_TYPES = [
  'required',
  'email',
  'minLength',
  'maxLength',
  'min',
  'max',
  'pattern',
  'custom',
];

/**
 * Validate a validation rule
 */
function validateValidationRule(
  rule: any,
  path: string
): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];

  if (!rule || typeof rule !== 'object') {
    errors.push({ path, message: 'Validation rule must be an object' });
    return errors;
  }

  if (!rule.type) {
    errors.push({ path: `${path}.type`, message: 'Validation rule type is required' });
  } else if (!VALID_VALIDATION_TYPES.includes(rule.type)) {
    errors.push({
      path: `${path}.type`,
      message: `Invalid validation type "${rule.type}". Valid types: ${VALID_VALIDATION_TYPES.join(', ')}`,
    });
  }

  if (!rule.message || typeof rule.message !== 'string') {
    errors.push({ path: `${path}.message`, message: 'Validation rule message is required' });
  }

  // Validate value requirements for specific types
  if (['minLength', 'maxLength', 'min', 'max'].includes(rule.type) && rule.value === undefined) {
    errors.push({ path: `${path}.value`, message: `Validation type "${rule.type}" requires a value` });
  }

  if (rule.type === 'pattern' && !rule.value) {
    errors.push({ path: `${path}.value`, message: 'Pattern validation requires a regex value' });
  }

  if (rule.type === 'custom' && !rule.customValidatorName && !rule.validator) {
    errors.push({
      path: `${path}.customValidatorName`,
      message: 'Custom validation requires customValidatorName',
    });
  }

  return errors;
}

/**
 * Validate table config
 */
function validateTableConfig(
  config: any,
  path: string
): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];

  if (!config || typeof config !== 'object') {
    errors.push({ path, message: 'Table config must be an object' });
    return errors;
  }

  if (!Array.isArray(config.columns) || config.columns.length === 0) {
    errors.push({ path: `${path}.columns`, message: 'Table must have at least one column' });
  } else {
    config.columns.forEach((col: any, i: number) => {
      if (!col.name) {
        errors.push({ path: `${path}.columns[${i}].name`, message: 'Column name is required' });
      }
      if (!col.label) {
        errors.push({ path: `${path}.columns[${i}].label`, message: 'Column label is required' });
      }
      if (col.validations) {
        col.validations.forEach((rule: any, j: number) => {
          errors.push(...validateValidationRule(rule, `${path}.columns[${i}].validations[${j}]`));
        });
      }
    });
  }

  if (!config.rowMode || !['fixed', 'dynamic'].includes(config.rowMode)) {
    errors.push({
      path: `${path}.rowMode`,
      message: 'Table rowMode must be "fixed" or "dynamic"',
    });
  }

  return errors;
}

/**
 * Validate datagrid config
 */
function validateDataGridConfig(
  config: any,
  path: string
): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];

  if (!config || typeof config !== 'object') {
    errors.push({ path, message: 'DataGrid config must be an object' });
    return errors;
  }

  if (!Array.isArray(config.columns) || config.columns.length === 0) {
    errors.push({ path: `${path}.columns`, message: 'DataGrid must have at least one column' });
  } else {
    config.columns.forEach((col: any, i: number) => {
      if (!col.name) {
        errors.push({ path: `${path}.columns[${i}].name`, message: 'Column name is required' });
      }
      if (!col.label) {
        errors.push({ path: `${path}.columns[${i}].label`, message: 'Column label is required' });
      }
      if (col.validations) {
        col.validations.forEach((rule: any, j: number) => {
          errors.push(...validateValidationRule(rule, `${path}.columns[${i}].validations[${j}]`));
        });
      }
    });
  }

  if (!Array.isArray(config.rowLabels) || config.rowLabels.length === 0) {
    errors.push({ path: `${path}.rowLabels`, message: 'DataGrid must have at least one row label' });
  } else {
    config.rowLabels.forEach((row: any, i: number) => {
      if (!row.id) {
        errors.push({ path: `${path}.rowLabels[${i}].id`, message: 'Row label id is required' });
      }
      if (!row.label) {
        errors.push({ path: `${path}.rowLabels[${i}].label`, message: 'Row label is required' });
      }
    });
  }

  return errors;
}

/**
 * Validate a field config
 */
function validateFieldConfig(
  field: any,
  index: number,
  path: string
): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];
  const fieldPath = `${path}[${index}]`;

  if (!field || typeof field !== 'object') {
    errors.push({ path: fieldPath, message: 'Field must be an object' });
    return errors;
  }

  if (!field.name || typeof field.name !== 'string') {
    errors.push({ path: `${fieldPath}.name`, message: 'Field name is required' });
  }

  if (!field.label || typeof field.label !== 'string') {
    errors.push({ path: `${fieldPath}.label`, message: 'Field label is required' });
  }

  if (!field.type) {
    errors.push({ path: `${fieldPath}.type`, message: 'Field type is required' });
  } else if (!VALID_FIELD_TYPES.includes(field.type)) {
    errors.push({
      path: `${fieldPath}.type`,
      message: `Invalid field type "${field.type}". Valid types: ${VALID_FIELD_TYPES.join(', ')}`,
    });
  }

  // Validate type-specific requirements
  if (['select', 'radio', 'checkbox'].includes(field.type)) {
    if (field.type !== 'checkbox' || field.options) {
      // checkbox can be single (no options) or multi (with options)
      if (field.options && !Array.isArray(field.options)) {
        errors.push({ path: `${fieldPath}.options`, message: 'Options must be an array' });
      }
    }
  }

  if (field.type === 'table') {
    if (!field.tableConfig) {
      errors.push({ path: `${fieldPath}.tableConfig`, message: 'Table field requires tableConfig' });
    } else {
      errors.push(...validateTableConfig(field.tableConfig, `${fieldPath}.tableConfig`));
    }
  }

  if (field.type === 'datagrid') {
    if (!field.datagridConfig) {
      errors.push({ path: `${fieldPath}.datagridConfig`, message: 'DataGrid field requires datagridConfig' });
    } else {
      errors.push(...validateDataGridConfig(field.datagridConfig, `${fieldPath}.datagridConfig`));
    }
  }

  if (field.type === 'info' && !field.content) {
    errors.push({ path: `${fieldPath}.content`, message: 'Info field requires content' });
  }

  if (field.type === 'formref') {
    if (!field.formrefConfig?.formId) {
      errors.push({ path: `${fieldPath}.formrefConfig.formId`, message: 'FormRef field requires formrefConfig.formId' });
    }
  }

  // Validate validations array
  if (field.validations) {
    if (!Array.isArray(field.validations)) {
      errors.push({ path: `${fieldPath}.validations`, message: 'Validations must be an array' });
    } else {
      field.validations.forEach((rule: any, i: number) => {
        errors.push(...validateValidationRule(rule, `${fieldPath}.validations[${i}]`));
      });
    }
  }

  return errors;
}

/**
 * Validate a form config object
 */
export function validateConfig(config: any): ConfigValidationResult {
  const errors: ConfigValidationError[] = [];

  if (!config || typeof config !== 'object') {
    return {
      valid: false,
      errors: [{ path: '', message: 'Config must be an object' }],
    };
  }

  if (!config.id || typeof config.id !== 'string') {
    errors.push({ path: 'id', message: 'Form id is required' });
  }

  if (!Array.isArray(config.fields)) {
    errors.push({ path: 'fields', message: 'Fields must be an array' });
  } else {
    // Check for duplicate field names
    const fieldNames = new Set<string>();
    config.fields.forEach((field: any, i: number) => {
      errors.push(...validateFieldConfig(field, i, 'fields'));

      if (field.name) {
        if (fieldNames.has(field.name)) {
          errors.push({
            path: `fields[${i}].name`,
            message: `Duplicate field name "${field.name}"`,
          });
        }
        fieldNames.add(field.name);
      }
    });
  }

  // Validate sections if present
  if (config.sections) {
    if (!Array.isArray(config.sections)) {
      errors.push({ path: 'sections', message: 'Sections must be an array' });
    } else {
      const sectionIds = new Set<string>();
      config.sections.forEach((section: any, i: number) => {
        if (!section.id) {
          errors.push({ path: `sections[${i}].id`, message: 'Section id is required' });
        } else if (sectionIds.has(section.id)) {
          errors.push({ path: `sections[${i}].id`, message: `Duplicate section id "${section.id}"` });
        } else {
          sectionIds.add(section.id);
        }
        if (!section.title) {
          errors.push({ path: `sections[${i}].title`, message: 'Section title is required' });
        }
      });

      // Validate field sectionIds reference valid sections
      if (Array.isArray(config.fields)) {
        config.fields.forEach((field: any, i: number) => {
          if (field.sectionId && !sectionIds.has(field.sectionId)) {
            errors.push({
              path: `fields[${i}].sectionId`,
              message: `Field references non-existent section "${field.sectionId}"`,
            });
          }
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    config: errors.length === 0 ? (config as FormConfig) : undefined,
  };
}

/**
 * Parse and validate a JSON string as FormConfig
 *
 * @param json - JSON string containing form configuration
 * @returns Validation result with parsed config if valid
 *
 * @example
 * ```typescript
 * import { parseConfig } from '@moe1399/form-validation';
 *
 * const json = fs.readFileSync('form-config.json', 'utf-8');
 * const result = parseConfig(json);
 *
 * if (!result.valid) {
 *   console.error('Config errors:', result.errors);
 *   process.exit(1);
 * }
 *
 * // Use validated config
 * const formConfig = result.config;
 * ```
 */
export function parseConfig(json: string): ConfigValidationResult {
  let parsed: any;

  try {
    parsed = JSON.parse(json);
  } catch (e) {
    return {
      valid: false,
      errors: [{ path: '', message: `Invalid JSON: ${(e as Error).message}` }],
    };
  }

  return validateConfig(parsed);
}

/**
 * Load and validate a form config from a file (Node.js only)
 *
 * @param filePath - Path to JSON config file
 * @returns Promise with validation result
 *
 * @example
 * ```typescript
 * import { loadConfig } from '@moe1399/form-validation';
 *
 * const result = await loadConfig('./forms/contact-form.json');
 * if (result.valid) {
 *   // Use result.config
 * }
 * ```
 */
export async function loadConfig(filePath: string): Promise<ConfigValidationResult> {
  const fs = await import('fs/promises');

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return parseConfig(content);
  } catch (e) {
    return {
      valid: false,
      errors: [{ path: '', message: `Failed to read file: ${(e as Error).message}` }],
    };
  }
}

/**
 * Synchronously load and validate a form config from a file (Node.js only)
 *
 * @param filePath - Path to JSON config file
 * @returns Validation result
 */
export function loadConfigSync(filePath: string): ConfigValidationResult {
  const fs = require('fs');

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return parseConfig(content);
  } catch (e) {
    return {
      valid: false,
      errors: [{ path: '', message: `Failed to read file: ${(e as Error).message}` }],
    };
  }
}
