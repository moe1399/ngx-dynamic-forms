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
  AutocompleteOption,
  AutocompleteValue,
  AutocompleteConfig,
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
  WizardPage,
  WizardConfig,
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
  WizardConfig,
  AsyncValidatorFn,
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
 * Re-exported from validation package for consistency
 */
export type {
  AsyncValidationResult,
  AsyncValidationConfig,
  AsyncValidatorFn,
} from '@moe1399/ngx-dynamic-forms-validation';

/**
 * Async validator registry for client-side validation
 * Register async validators here to use them with AsyncValidationConfig.validatorName
 *
 * @example
 * ```typescript
 * import { asyncValidatorRegistry } from '@moe1399/ngx-dynamic-forms';
 *
 * asyncValidatorRegistry.register('checkEmailExists', async (value) => {
 *   const response = await fetch(`/api/validate/email?email=${encodeURIComponent(value)}`);
 *   const result = await response.json();
 *   return { valid: result.available, message: result.available ? undefined : 'Email already exists' };
 * });
 * ```
 */
export interface AsyncValidatorRegistry {
  register(name: string, validator: AsyncValidatorFn): void;
  get(name: string): AsyncValidatorFn | undefined;
  has(name: string): boolean;
  list(): string[];
  unregister(name: string): boolean;
  clear(): void;
}

/**
 * Global async validator registry instance
 */
export declare const asyncValidatorRegistry: AsyncValidatorRegistry;

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
export interface FormFieldConfig extends Omit<BaseFormFieldConfig, 'validations' | 'asyncValidation'> {
  validations?: ValidationRule[];
  asyncValidation?: import('@moe1399/ngx-dynamic-forms-validation').AsyncValidationConfig;
}

/**
 * Complete form configuration.
 * Uses the Angular-specific FormFieldConfig with async validation support.
 */
export interface FormConfig {
  id: string;
  fields: FormFieldConfig[];
  sections?: FormSection[];
  /** Wizard mode configuration - splits form into multi-page wizard */
  wizard?: WizardConfig;
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

/**
 * Represents a single version snapshot of a form configuration.
 * Used to track changes over time for version history.
 */
export interface FormConfigVersion {
  /** Unique version ID (timestamp-based, e.g., 'v_1704067200000') */
  id: string;
  /** Complete form config snapshot at this version */
  config: FormConfig;
  /** Unix timestamp when version was created */
  timestamp: number;
  /** ISO date string for display (e.g., '2024-01-01T00:00:00.000Z') */
  createdAt: string;
  /** Optional description/note for this version */
  description?: string;
  /** Optional user attribution */
  createdBy?: string;
  /** Sequential version number (1, 2, 3...) */
  versionNumber: number;
  /** Distinguishes manual saves from auto-saves */
  isAutoSave?: boolean;
}

/**
 * Complete form configuration with version history.
 * Used by external consumers who manage their own storage (backend/API).
 */
export interface FormConfigWithHistory {
  /** The current/active form configuration */
  current: FormConfig;
  /** Array of previous versions, newest first */
  versions: FormConfigVersion[];
  /** Maximum versions to retain (default: 50) */
  maxVersions?: number;
}

/**
 * Configuration options for version history behavior.
 */
export interface VersionHistoryConfig {
  /** Enable/disable version history (default: true) */
  enabled?: boolean;
  /** Maximum versions to keep (default: 50) */
  maxVersions?: number;
}
