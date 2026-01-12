/**
 * Types for @moe1399/ngx-dynamic-forms-validation
 * Shared types between Angular library and server validation
 */

/**
 * Supported form field types
 */
export type FieldType =
  | 'text'
  | 'email'
  | 'number'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'date'
  | 'daterange'
  | 'table'
  | 'info'
  | 'datagrid'
  | 'phone'
  | 'formref'
  | 'fileupload';

/**
 * Country code option for phone field
 */
export interface CountryCodeOption {
  code: string;      // e.g., '+61'
  country: string;   // e.g., 'Australia'
  flag?: string;     // Optional emoji flag e.g., '🇦🇺'
}

/**
 * Phone field configuration
 */
export interface PhoneConfig {
  countryCodes: CountryCodeOption[];
  defaultCountryCode?: string;  // Default selected country code e.g., '+61'
}

/**
 * Date range field configuration
 */
export interface DateRangeConfig {
  fromLabel?: string;      // Label for "from" date input (default: 'From')
  toLabel?: string;        // Label for "to" date input (default: 'To')
  separatorText?: string;  // Text between the two inputs (default: 'to')
  toDateOptional?: boolean; // If true, "to date" can be empty even with required validation (default: false)
}

/**
 * Form reference field configuration - embeds fields from another form
 */
export interface FormRefConfig {
  formId: string;           // ID of the form to embed
  showSections?: boolean;   // Whether to show section headers from the embedded form (default: false)
  fieldPrefix?: string;     // Optional prefix for embedded field names to avoid conflicts
}

/**
 * File upload timing configuration
 */
export type FileUploadTiming = 'immediate' | 'manual';

/**
 * File upload field configuration
 */
export interface FileUploadConfig {
  maxFiles?: number;           // Maximum number of files (default: 1)
  minFiles?: number;           // Minimum number of files (default: 0)
  maxFileSize?: number;        // Maximum file size in bytes (default: 10MB)
  allowedExtensions?: string[]; // Allowed file extensions e.g., ['.pdf', '.doc']
  allowedMimeTypes?: string[]; // Allowed MIME types e.g., ['image/*', 'application/pdf']
  uploadTiming?: FileUploadTiming; // When to upload: 'immediate' or 'manual' (default: 'immediate')
  allowDragDrop?: boolean;     // Allow drag and drop (default: true)
  allowDownload?: boolean;     // Allow downloading completed files (default: true)
  uploadButtonLabel?: string;  // Label for upload button (default: 'Choose file')
  dragDropLabel?: string;      // Label for drag-drop zone (default: 'or drag and drop here')
  showFileSize?: boolean;      // Show file size in file list (default: true)
}

/**
 * Value stored in form for a successfully uploaded file
 */
export interface FileUploadValue {
  reference: string;           // Server file ID/URL
  fileName: string;            // Original file name
  fileSize: number;            // File size in bytes
  mimeType: string;            // MIME type
  metadata?: Record<string, unknown>; // Additional metadata
}

/**
 * Column types supported within tables (subset of FieldType)
 */
export type TableColumnType = 'text' | 'number' | 'date' | 'select';

/**
 * Table row mode configuration
 */
export type TableRowMode = 'fixed' | 'dynamic';

/**
 * Table column configuration
 */
export interface TableColumnConfig {
  name: string;
  label: string;
  type: TableColumnType;
  placeholder?: string;
  validations?: ValidationRule[];
  options?: { label: string; value: any }[]; // For select columns
  width?: number; // Column width as flex proportion (1-4)
}

/**
 * Table field configuration
 */
export interface TableConfig {
  columns: TableColumnConfig[];
  rowMode: TableRowMode;
  fixedRowCount?: number; // For fixed mode: number of rows to display (default: 3)
  minRows?: number; // For dynamic mode: minimum rows (default: 0)
  maxRows?: number; // For dynamic mode: maximum rows (default: 10)
  addRowLabel?: string; // Button text for adding rows (default: 'Add row')
  removeRowLabel?: string; // Button aria-label for removing rows (default: 'Remove')
}

/**
 * Column types supported within datagrids
 */
export type DataGridColumnType = 'text' | 'number' | 'date' | 'select';

/**
 * DataGrid column group configuration for two-tier headers
 */
export interface DataGridColumnGroup {
  id: string;
  label: string;
  columnIds: string[]; // References to DataGridColumnConfig.name
}

/**
 * Computed column formula configuration
 */
export interface DataGridFormula {
  type: 'expression';
  expression: string; // e.g., "students * 0.5" or "col1 + col2"
}

/**
 * DataGrid column configuration
 */
export interface DataGridColumnConfig {
  name: string;
  label: string;
  type: DataGridColumnType;
  placeholder?: string;
  validations?: ValidationRule[];
  options?: { label: string; value: any }[]; // For select columns
  width?: number; // Column width (1-4)
  computed?: boolean; // If true, column is read-only and calculated
  formula?: DataGridFormula; // Formula for computed columns
  showInColumnTotal?: boolean; // Include in total row calculation (default: true for number)
  showInRowTotal?: boolean; // Include in row total calculation (default: true for number)
}

/**
 * DataGrid row label configuration
 */
export interface DataGridRowLabel {
  id: string; // Unique identifier for the row
  label: string; // Display label (e.g., "Year 1", "13+")
}

/**
 * DataGrid totals configuration
 */
export interface DataGridTotalsConfig {
  showRowTotals?: boolean; // Add a total column on the right
  rowTotalLabel?: string; // Header for total column (default: "Total")
  showColumnTotals?: boolean; // Add a total row at the bottom
  columnTotalLabel?: string; // Label for total row (default: "Total")
}

/**
 * DataGrid field configuration
 */
export interface DataGridConfig {
  columns: DataGridColumnConfig[];
  rowLabels: DataGridRowLabel[];
  columnGroups?: DataGridColumnGroup[];
  rowLabelHeader?: string; // Header for the row label column (e.g., "Year Level")
  totals?: DataGridTotalsConfig;
}

/**
 * Form section configuration
 */
export interface FormSection {
  id: string;
  title: string;
  description?: string;
  anchorId?: string; // Custom anchor ID (auto-generated from title if not provided)
  order?: number;
  condition?: ValidationCondition; // Visibility condition - section hidden when condition is not met
}

/**
 * Comparison operators for validation conditions
 */
export type ValidationConditionOperator = 'equals' | 'notEquals' | 'isEmpty' | 'isNotEmpty';

/**
 * Condition that determines when a validation rule applies
 */
export interface ValidationCondition {
  /**
   * Field/column to evaluate.
   * - For standalone fields: field name (e.g., "tenure")
   * - For table columns: column name for same-row (e.g., "tenure")
   *   or "$form.fieldName" for form-level fields (e.g., "$form.employmentType")
   */
  field: string;
  operator: ValidationConditionOperator;
  /**
   * Value to compare against. Required for 'equals' and 'notEquals'.
   * Ignored for 'isEmpty' and 'isNotEmpty'.
   */
  value?: any;
}

/**
 * Validation rule type
 */
export type ValidationRuleType = 'required' | 'email' | 'minLength' | 'maxLength' | 'min' | 'max' | 'pattern' | 'custom';

/**
 * Validation rule configuration
 */
export interface ValidationRule {
  type: ValidationRuleType;
  value?: any;
  message: string;
  /**
   * Name of a registered custom validator (works on client and server)
   */
  customValidatorName?: string;
  /**
   * Parameters to pass to the custom validator
   */
  customValidatorParams?: Record<string, any>;
  /**
   * Optional condition that must be met for this validation to apply.
   * If not specified, validation always applies.
   */
  condition?: ValidationCondition;
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
  asyncValidation?: AsyncValidationConfig; // Async validation using named validator
  options?: { label: string; value: any }[]; // For select, radio, checkbox
  disabled?: boolean;
  archived?: boolean; // Archived fields are read-only, skip validation, and only visible if they contain data
  cssClass?: string;
  order?: number;
  inlineGroup?: string; // Fields with same group name render on same row
  width?: number; // Width as flex proportion (1-4), defaults to 1
  sectionId?: string; // Reference to FormSection.id
  tableConfig?: TableConfig; // Configuration for table field type
  datagridConfig?: DataGridConfig; // Configuration for datagrid field type
  content?: string; // Markdown content for info field type
  phoneConfig?: PhoneConfig; // Configuration for phone field type
  daterangeConfig?: DateRangeConfig; // Configuration for daterange field type
  formrefConfig?: FormRefConfig; // Configuration for formref field type
  fileuploadConfig?: FileUploadConfig; // Configuration for fileupload field type
  condition?: ValidationCondition; // Visibility condition - field hidden when condition is not met
}

/**
 * Complete form configuration
 */
export interface FormConfig {
  id: string;
  fields: FormFieldConfig[];
  sections?: FormSection[];
  /** Label for submit button (for use by consuming application) */
  submitLabel?: string;
  /** Label for save button (for use by consuming application) */
  saveLabel?: string;
  autoSave?: boolean;
  autoSaveInterval?: number; // milliseconds
}

/**
 * Custom validator function signature (for server-side validation)
 */
export type CustomValidatorFn = (
  value: any,
  params?: Record<string, any>,
  fieldConfig?: FormFieldConfig,
  formData?: Record<string, any>
) => boolean;

/**
 * Async validator function signature (for server-side validation)
 * Returns a promise that resolves to an AsyncValidationResult
 */
export type AsyncValidatorFn = (
  value: any,
  params?: Record<string, any>,
  fieldConfig?: FormFieldConfig,
  formData?: Record<string, any>
) => Promise<AsyncValidationResult>;

/**
 * Result of async validation
 */
export interface AsyncValidationResult {
  valid: boolean;
  message?: string;
}

/**
 * Async validation configuration using named validator pattern
 * Works across client and server by referencing registered validators
 */
export interface AsyncValidationConfig {
  /**
   * Name of the registered async validator
   * Must be registered on both client and server
   */
  validatorName: string;
  /**
   * Optional trigger for when validation should run
   * - 'blur': Validate when field loses focus (default)
   * - 'change': Validate on every change
   */
  trigger?: 'blur' | 'change';
  /**
   * Debounce delay in milliseconds (default: 300)
   * Only applies when trigger is 'change'
   */
  debounceMs?: number;
  /**
   * Optional parameters to pass to the async validator
   */
  params?: Record<string, any>;
}

/**
 * Field validation error
 */
export interface FieldValidationError {
  field: string;
  message: string;
  rule: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: FieldValidationError[];
}
