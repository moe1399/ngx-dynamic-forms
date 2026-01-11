/**
 * Re-export shared types from the validation package.
 * These types are compatible between Angular client and Node.js server validation.
 */
export type {
  FieldType,
  CountryCodeOption,
  PhoneConfig,
  DateRangeConfig,
  FormRefConfig,
  FileUploadTiming,
  FileUploadConfig,
  FileUploadValue,
  TableColumnType,
  TableRowMode,
  TableColumnConfig,
  TableConfig,
  DataGridColumnType,
  DataGridColumnGroup,
  DataGridFormula,
  DataGridColumnConfig,
  DataGridRowLabel,
  DataGridTotalsConfig,
  DataGridConfig,
  FormSection,
  ValidationConditionOperator,
  ValidationCondition,
  ValidationRuleType,
  CustomValidatorFn,
  FieldValidationError,
  ValidationResult,
} from '@moe1399/ngx-dynamic-forms-validation';

// Import base types for extension
import type {
  ValidationRule as BaseValidationRule,
  FormFieldConfig as BaseFormFieldConfig,
  FormSection,
} from '@moe1399/ngx-dynamic-forms-validation';

/**
 * Progress callback for file upload
 */
export type FileUploadProgressCallback = (progress: number) => void;

/**
 * Result of a file upload operation
 */
export interface FileUploadResult {
  success: boolean;
  reference?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * File upload handler function type (client-side only)
 */
export type FileUploadHandler = (
  file: File,
  onProgress: FileUploadProgressCallback,
  abortSignal: AbortSignal
) => Promise<FileUploadResult>;

/**
 * File download handler function type (client-side only)
 */
export type FileDownloadHandler = (
  fileValue: import('@moe1399/ngx-dynamic-forms-validation').FileUploadValue
) => Promise<void> | void;

/**
 * Status of a file in the upload queue
 */
export type FileUploadStatus = 'pending' | 'uploading' | 'completed' | 'failed' | 'cancelled';

/**
 * Internal state for tracking a file upload (client-side only)
 */
export interface FileUploadState {
  id: string;
  file?: File;
  fileName: string;
  fileSize: number;
  mimeType: string;
  status: FileUploadStatus;
  progress: number;
  reference?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Result of async validation
 */
export interface AsyncValidationResult {
  valid: boolean;
  message?: string;
}

/**
 * Async validation configuration for a field (client-side only)
 */
export interface AsyncValidationConfig {
  validator: (value: any, formValues: Record<string, any>) => Promise<AsyncValidationResult>;
  trigger?: 'blur' | 'change';
  debounceMs?: number;
}

/**
 * Validation rule configuration.
 * Extends base validation rule with client-only validator function.
 */
export interface ValidationRule extends BaseValidationRule {
  /**
   * Inline validator function (client-side only, not serializable)
   * @deprecated Use customValidatorName for cross-platform validation
   */
  validator?: (value: any) => boolean;
}

/**
 * Field configuration for dynamic form.
 * Extends base field config with client-only async validation.
 */
export interface FormFieldConfig extends Omit<BaseFormFieldConfig, 'validations'> {
  validations?: ValidationRule[];
  asyncValidation?: AsyncValidationConfig;
}

/**
 * Complete form configuration.
 * Uses the Angular-specific FormFieldConfig with async validation support.
 */
export interface FormConfig {
  id: string;
  fields: FormFieldConfig[];
  sections?: FormSection[];
  submitLabel?: string;
  saveLabel?: string;
  autoSave?: boolean;
  autoSaveInterval?: number;
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
 * Field validation error (client-side format)
 */
export interface FieldError {
  field: string;
  message: string;
}
