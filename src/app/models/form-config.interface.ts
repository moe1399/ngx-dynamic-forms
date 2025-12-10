/**
 * Supported form field types
 */
export type FieldType = 'text' | 'email' | 'number' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'date';

/**
 * Validation rule configuration
 */
export interface ValidationRule {
  type: 'required' | 'email' | 'minLength' | 'maxLength' | 'min' | 'max' | 'pattern' | 'custom';
  value?: any;
  message: string;
  validator?: (value: any) => boolean;
}

/**
 * Field configuration for dynamic form
 */
export interface FormFieldConfig {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  description?: string; // Help text shown via info icon popover
  value?: any;
  validations?: ValidationRule[];
  options?: { label: string; value: any }[]; // For select, radio, checkbox
  disabled?: boolean;
  cssClass?: string;
  order?: number;
}

/**
 * Complete form configuration
 */
export interface FormConfig {
  id: string;
  fields: FormFieldConfig[];
  submitLabel?: string;
  saveLabel?: string;
  autoSave?: boolean;
  autoSaveInterval?: number; // milliseconds
}

/**
 * Form submission data
 */
export interface FormSubmission {
  formId: string;
  data: { [key: string]: any };
  timestamp: Date;
  isComplete: boolean;
}

/**
 * Field validation error
 */
export interface FieldError {
  field: string;
  message: string;
}
