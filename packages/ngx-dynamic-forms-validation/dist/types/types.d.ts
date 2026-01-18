/**
 * Types for @moe1399/ngx-dynamic-forms-validation
 * Shared types between Angular library and server validation
 */
/**
 * Supported form field types
 */
export type FieldType = 'text' | 'email' | 'number' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'date' | 'daterange' | 'table' | 'info' | 'datagrid' | 'phone' | 'formref' | 'fileupload' | 'autocomplete';
/**
 * Country code option for phone field
 */
export interface CountryCodeOption {
    code: string;
    country: string;
    flag?: string;
}
/**
 * Phone field configuration
 */
export interface PhoneConfig {
    countryCodes: CountryCodeOption[];
    defaultCountryCode?: string;
}
/**
 * Date range field configuration
 */
export interface DateRangeConfig {
    fromLabel?: string;
    toLabel?: string;
    separatorText?: string;
    toDateOptional?: boolean;
}
/**
 * Form reference field configuration - embeds fields from another form
 */
export interface FormRefConfig {
    formId: string;
    showSections?: boolean;
    fieldPrefix?: string;
}
/**
 * File upload timing configuration
 */
export type FileUploadTiming = 'immediate' | 'manual';
/**
 * File upload field configuration
 */
export interface FileUploadConfig {
    maxFiles?: number;
    minFiles?: number;
    minFileSize?: number;
    maxFileSize?: number;
    allowedExtensions?: string[];
    allowedMimeTypes?: string[];
    uploadTiming?: FileUploadTiming;
    allowDragDrop?: boolean;
    allowDownload?: boolean;
    uploadButtonLabel?: string;
    dragDropLabel?: string;
    showFileSize?: boolean;
}
/**
 * Value stored in form for a successfully uploaded file
 */
export interface FileUploadValue {
    reference: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    metadata?: Record<string, unknown>;
}
/**
 * Autocomplete option returned by fetch handler
 */
export interface AutocompleteOption {
    value: any;
    label: string;
}
/**
 * Value stored for an autocomplete field
 * Stores both value and label to display selection without re-fetching
 */
export interface AutocompleteValue {
    value: any;
    label: string;
}
/**
 * Autocomplete field configuration
 */
export interface AutocompleteConfig {
    fetchHandlerName: string;
    minSearchLength?: number;
    debounceMs?: number;
    noResultsMessage?: string;
    loadingMessage?: string;
    placeholder?: string;
    params?: Record<string, any>;
}
/**
 * Autocomplete fetch handler function signature.
 * Returns a promise that resolves to an array of options.
 *
 * @example
 * ```typescript
 * const searchUsers: AutocompleteFetchHandler = async (searchText, params) => {
 *   const response = await fetch(`/api/users?q=${encodeURIComponent(searchText)}`);
 *   const users = await response.json();
 *   return users.map(u => ({ value: u.id, label: u.name }));
 * };
 * ```
 */
export type AutocompleteFetchHandler = (searchText: string, params?: Record<string, any>, fieldConfig?: FormFieldConfig, formData?: Record<string, any>) => Promise<AutocompleteOption[]>;
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
    options?: {
        label: string;
        value: any;
    }[];
    width?: number;
}
/**
 * Table field configuration
 */
export interface TableConfig {
    columns: TableColumnConfig[];
    rowMode: TableRowMode;
    fixedRowCount?: number;
    minRows?: number;
    maxRows?: number;
    addRowLabel?: string;
    removeRowLabel?: string;
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
    columnIds: string[];
}
/**
 * Computed column formula configuration
 */
export interface DataGridFormula {
    type: 'expression';
    expression: string;
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
    options?: {
        label: string;
        value: any;
    }[];
    width?: number;
    computed?: boolean;
    formula?: DataGridFormula;
    showInColumnTotal?: boolean;
    showInRowTotal?: boolean;
}
/**
 * DataGrid row label configuration
 */
export interface DataGridRowLabel {
    id: string;
    label: string;
}
/**
 * DataGrid totals configuration
 */
export interface DataGridTotalsConfig {
    showRowTotals?: boolean;
    rowTotalLabel?: string;
    showColumnTotals?: boolean;
    columnTotalLabel?: string;
}
/**
 * DataGrid field configuration
 */
export interface DataGridConfig {
    columns: DataGridColumnConfig[];
    rowLabels: DataGridRowLabel[];
    columnGroups?: DataGridColumnGroup[];
    rowLabelHeader?: string;
    totals?: DataGridTotalsConfig;
}
/**
 * Form section configuration
 */
export interface FormSection {
    id: string;
    title: string;
    description?: string;
    anchorId?: string;
    order?: number;
    condition?: ValidationCondition;
}
/**
 * Wizard page configuration - groups sections into navigable pages
 */
export interface WizardPage {
    id: string;
    title: string;
    description?: string;
    sectionIds: string[];
    order?: number;
    condition?: ValidationCondition;
}
/**
 * Wizard configuration settings
 */
export interface WizardConfig {
    pages: WizardPage[];
    allowFreeNavigation?: boolean;
    showProgressBar?: boolean;
    showPageNumbers?: boolean;
    nextLabel?: string;
    prevLabel?: string;
    submitLabel?: string;
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
    description?: string;
    value?: any;
    validations?: ValidationRule[];
    asyncValidation?: AsyncValidationConfig;
    options?: {
        label: string;
        value: any;
    }[];
    disabled?: boolean;
    archived?: boolean;
    cssClass?: string;
    order?: number;
    inlineGroup?: string;
    width?: number;
    sectionId?: string;
    tableConfig?: TableConfig;
    datagridConfig?: DataGridConfig;
    content?: string;
    phoneConfig?: PhoneConfig;
    daterangeConfig?: DateRangeConfig;
    formrefConfig?: FormRefConfig;
    fileuploadConfig?: FileUploadConfig;
    autocompleteConfig?: AutocompleteConfig;
    condition?: ValidationCondition;
}
/**
 * Complete form configuration
 */
export interface FormConfig {
    id: string;
    fields: FormFieldConfig[];
    sections?: FormSection[];
    /** Wizard mode configuration - splits form into multi-page wizard */
    wizard?: WizardConfig;
    /** Label for submit button (for use by consuming application) */
    submitLabel?: string;
    /** Label for save button (for use by consuming application) */
    saveLabel?: string;
    autoSave?: boolean;
    autoSaveInterval?: number;
}
/**
 * Custom validator function signature (for server-side validation)
 */
export type CustomValidatorFn = (value: any, params?: Record<string, any>, fieldConfig?: FormFieldConfig, formData?: Record<string, any>) => boolean;
/**
 * Async validator function signature (for server-side validation)
 * Returns a promise that resolves to an AsyncValidationResult
 */
export type AsyncValidatorFn = (value: any, params?: Record<string, any>, fieldConfig?: FormFieldConfig, formData?: Record<string, any>) => Promise<AsyncValidationResult>;
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
