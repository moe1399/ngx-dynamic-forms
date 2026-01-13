import { Component, output, signal, computed, input, effect, model, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  FormConfig,
  FormFieldConfig,
  FormSection,
  WizardPage,
  WizardConfig,
  ValidationRule,
  ValidationCondition,
  ValidationConditionOperator,
  FieldType,
  TableColumnType,
  TableRowMode,
  TableColumnConfig,
  TableConfig,
  DataGridColumnType,
  DataGridColumnConfig,
  DataGridColumnGroup,
  DataGridRowLabel,
  DataGridConfig,
  PhoneConfig,
  CountryCodeOption,
  DateRangeConfig,
  FormRefConfig,
  FileUploadConfig,
  FileUploadTiming,
  AutocompleteConfig,
} from '../../models/form-config.interface';
import { FormBuilderService } from '../../services/form-builder.service';
import { AsyncValidatorRegistry, AutocompleteFetchRegistry } from '../../services/validator-registry.service';

/**
 * Configuration options for toolbar buttons
 */
export interface ToolbarConfig {
  showNewForm?: boolean;
  showSave?: boolean;
  showExport?: boolean;
  showImport?: boolean;
  showShare?: boolean;
}

@Component({
  selector: 'ngx-form-builder',
  imports: [CommonModule, FormsModule],
  templateUrl: './form-builder.html',
  styleUrl: './form-builder.scss',
  host: {
    class: 'ngx-fb',
  },
})
export class NgxFormBuilder {
  // Inject services using inject()
  private formBuilderService = inject(FormBuilderService);
  private asyncValidatorRegistry = inject(AsyncValidatorRegistry);
  private autocompleteFetchRegistry = inject(AutocompleteFetchRegistry);

  // Two-way binding for config - the primary API for reusable usage
  config = model<FormConfig | null>(null);

  // Feature visibility inputs
  showToolbar = input<boolean>(true);
  showSavedConfigs = input<boolean>(true);
  toolbarConfig = input<ToolbarConfig>({
    showNewForm: true,
    showSave: true,
    showExport: true,
    showImport: true,
    showShare: true,
  });

  // Output events for parent to handle actions
  saveRequested = output<FormConfig>();
  newFormRequested = output<void>();
  shareRequested = output<void>();
  exportRequested = output<FormConfig>();
  importCompleted = output<FormConfig>();

  // Internal config signal for component state management
  private internalConfig = signal<FormConfig>(this.formBuilderService.createBlankConfig());

  // Computed to get the current config (from model or internal)
  currentConfig = computed(() => this.config() ?? this.internalConfig());

  // Saved configurations
  savedConfigs = computed(() => this.formBuilderService.savedConfigs());

  // UI state
  selectedFieldIndex = signal<number | null>(null);
  selectedSectionId = signal<string | null>(null);
  selectedWizardPageId = signal<string | null>(null);
  showJsonEditor = signal(false);
  jsonEditorMode = signal<'import' | 'export'>('import');
  jsonEditorContent = signal('');
  copyButtonText = signal('Copy to Clipboard');
  message = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  // Field types for dropdown
  fieldTypes: FieldType[] = ['text', 'email', 'number', 'textarea', 'date', 'daterange', 'select', 'radio', 'checkbox', 'table', 'info', 'datagrid', 'phone', 'formref', 'fileupload', 'autocomplete'];

  // Default country codes for phone field
  defaultCountryCodes: CountryCodeOption[] = [
    { code: '+61', country: 'Australia', flag: '🇦🇺' },
    { code: '+64', country: 'New Zealand', flag: '🇳🇿' },
    { code: '+1', country: 'USA/Canada', flag: '🇺🇸' },
    { code: '+44', country: 'United Kingdom', flag: '🇬🇧' },
    { code: '+91', country: 'India', flag: '🇮🇳' },
    { code: '+86', country: 'China', flag: '🇨🇳' },
    { code: '+81', country: 'Japan', flag: '🇯🇵' },
    { code: '+82', country: 'South Korea', flag: '🇰🇷' },
    { code: '+65', country: 'Singapore', flag: '🇸🇬' },
    { code: '+60', country: 'Malaysia', flag: '🇲🇾' },
    { code: '+63', country: 'Philippines', flag: '🇵🇭' },
    { code: '+66', country: 'Thailand', flag: '🇹🇭' },
    { code: '+84', country: 'Vietnam', flag: '🇻🇳' },
    { code: '+62', country: 'Indonesia', flag: '🇮🇩' },
    { code: '+49', country: 'Germany', flag: '🇩🇪' },
    { code: '+33', country: 'France', flag: '🇫🇷' },
    { code: '+39', country: 'Italy', flag: '🇮🇹' },
    { code: '+34', country: 'Spain', flag: '🇪🇸' },
    { code: '+31', country: 'Netherlands', flag: '🇳🇱' },
    { code: '+27', country: 'South Africa', flag: '🇿🇦' },
    { code: '+55', country: 'Brazil', flag: '🇧🇷' },
    { code: '+52', country: 'Mexico', flag: '🇲🇽' },
  ];

  // DataGrid column types for dropdown
  datagridColumnTypes: DataGridColumnType[] = ['text', 'number', 'date', 'select'];

  // Table column types for dropdown
  tableColumnTypes: TableColumnType[] = ['text', 'number', 'date', 'select'];

  // Validation types
  validationTypes = ['required', 'email', 'minLength', 'maxLength', 'min', 'max', 'pattern'];

  // Condition operators for conditional validations
  conditionOperators: ValidationConditionOperator[] = ['equals', 'notEquals', 'isEmpty', 'isNotEmpty'];

  constructor() {
    // Sync model with internal state when model changes externally
    effect(() => {
      const modelConfig = this.config();
      if (modelConfig) {
        this.internalConfig.set(modelConfig);
      }
    });
  }

  /**
   * Helper to get toolbar button visibility
   */
  isToolbarButtonVisible(button: keyof ToolbarConfig): boolean {
    const config = this.toolbarConfig();
    return config[button] !== false;
  }

  /**
   * Create a new blank form
   */
  createNewForm(): void {
    const newConfig = this.formBuilderService.createBlankConfig();
    this.updateConfig(newConfig);
    this.selectedFieldIndex.set(null);
    this.newFormRequested.emit();
    this.showMessage('success', 'New form created');
  }

  /**
   * Update the config (internal and model)
   */
  private updateConfig(config: FormConfig): void {
    this.internalConfig.set(config);
    this.config.set(config);
  }

  /**
   * Add a new field to the form
   */
  addField(): void {
    const config = { ...this.currentConfig() };
    const newField: FormFieldConfig = {
      name: `field_${Date.now()}`,
      label: 'New Field',
      type: 'text',
      order: config.fields.length,
      validations: [],
    };

    config.fields = [...config.fields, newField];
    this.updateConfig(config);
    this.selectedFieldIndex.set(config.fields.length - 1);
  }

  /**
   * Update a field
   */
  updateField(index: number, field: FormFieldConfig): void {
    const config = { ...this.currentConfig() };
    config.fields = [...config.fields];
    config.fields[index] = { ...field };
    this.updateConfig(config);
  }

  /**
   * Remove a field
   */
  removeField(index: number): void {
    const config = { ...this.currentConfig() };
    config.fields = config.fields.filter((_, i) => i !== index);
    this.updateConfig(config);
    this.selectedFieldIndex.set(null);
  }

  /**
   * Move field up
   */
  moveFieldUp(index: number): void {
    if (index === 0) return;
    const config = { ...this.currentConfig() };
    config.fields = [...config.fields];
    [config.fields[index - 1], config.fields[index]] = [
      config.fields[index],
      config.fields[index - 1],
    ];
    // Update order
    config.fields.forEach((field, i) => (field.order = i));
    this.updateConfig(config);
    this.selectedFieldIndex.set(index - 1);
  }

  /**
   * Move field down
   */
  moveFieldDown(index: number): void {
    const config = this.currentConfig();
    if (index === config.fields.length - 1) return;
    const newConfig = { ...config };
    newConfig.fields = [...config.fields];
    [newConfig.fields[index], newConfig.fields[index + 1]] = [
      newConfig.fields[index + 1],
      newConfig.fields[index],
    ];
    // Update order
    newConfig.fields.forEach((field, i) => (field.order = i));
    this.updateConfig(newConfig);
    this.selectedFieldIndex.set(index + 1);
  }

  /**
   * Add validation to field
   */
  addValidation(fieldIndex: number): void {
    const config = { ...this.currentConfig() };
    config.fields = [...config.fields];
    const field = { ...config.fields[fieldIndex] };
    field.validations = [
      ...(field.validations || []),
      { type: 'required', message: 'This field is required' } as ValidationRule,
    ];
    config.fields[fieldIndex] = field;
    this.updateConfig(config);
  }

  /**
   * Update validation
   */
  updateValidation(fieldIndex: number, validationIndex: number, validation: ValidationRule): void {
    const config = { ...this.currentConfig() };
    config.fields = [...config.fields];
    const field = { ...config.fields[fieldIndex] };
    field.validations = [...(field.validations || [])];
    field.validations[validationIndex] = validation;
    config.fields[fieldIndex] = field;
    this.updateConfig(config);
  }

  /**
   * Remove validation
   */
  removeValidation(fieldIndex: number, validationIndex: number): void {
    const config = { ...this.currentConfig() };
    config.fields = [...config.fields];
    const field = { ...config.fields[fieldIndex] };
    field.validations = (field.validations || []).filter((_, i) => i !== validationIndex);
    config.fields[fieldIndex] = field;
    this.updateConfig(config);
  }

  // ============================================
  // Async Validation Methods
  // ============================================

  /**
   * Check if field type supports async validation
   */
  shouldShowAsyncValidation(field: import('../../models').FormFieldConfig): boolean {
    const typesWithoutValidation: (typeof field.type)[] = ['info', 'formref'];
    return !typesWithoutValidation.includes(field.type);
  }

  /**
   * Check if field has async validation enabled
   */
  hasAsyncValidation(field: import('../../models').FormFieldConfig): boolean {
    return !!field.asyncValidation;
  }

  /**
   * Toggle async validation on/off for a field
   */
  toggleAsyncValidation(fieldIndex: number, event: Event): void {
    const config = { ...this.currentConfig() };
    config.fields = [...config.fields];
    const field = { ...config.fields[fieldIndex] };

    const checkbox = event.target as HTMLInputElement;
    if (checkbox.checked) {
      // Enable async validation with defaults
      field.asyncValidation = {
        validatorName: '',
        trigger: 'blur',
        debounceMs: 300,
        params: undefined,
      };
    } else {
      // Disable async validation
      field.asyncValidation = undefined;
    }

    config.fields[fieldIndex] = field;
    this.updateConfig(config);
  }

  /**
   * Get list of available async validators from registry
   */
  availableAsyncValidators(): string[] {
    return this.asyncValidatorRegistry.list();
  }

  /**
   * Get list of available autocomplete fetch handlers from registry
   */
  availableFetchHandlers(): string[] {
    return this.autocompleteFetchRegistry.list();
  }

  /**
   * Update async validator name
   */
  updateAsyncValidatorName(fieldIndex: number, name: string): void {
    const config = { ...this.currentConfig() };
    config.fields = [...config.fields];
    const field = { ...config.fields[fieldIndex] };

    if (field.asyncValidation) {
      field.asyncValidation = { ...field.asyncValidation, validatorName: name };
    }

    config.fields[fieldIndex] = field;
    this.updateConfig(config);
  }

  /**
   * Update async validation trigger
   */
  updateAsyncValidationTrigger(fieldIndex: number, trigger: 'blur' | 'change'): void {
    const config = { ...this.currentConfig() };
    config.fields = [...config.fields];
    const field = { ...config.fields[fieldIndex] };

    if (field.asyncValidation) {
      field.asyncValidation = { ...field.asyncValidation, trigger };
      // Reset debounce to default when switching to blur
      if (trigger === 'blur') {
        field.asyncValidation.debounceMs = undefined;
      }
    }

    config.fields[fieldIndex] = field;
    this.updateConfig(config);
  }

  /**
   * Update async validation debounce
   */
  updateAsyncValidationDebounce(fieldIndex: number, ms: number): void {
    const config = { ...this.currentConfig() };
    config.fields = [...config.fields];
    const field = { ...config.fields[fieldIndex] };

    if (field.asyncValidation) {
      field.asyncValidation = { ...field.asyncValidation, debounceMs: ms || undefined };
    }

    config.fields[fieldIndex] = field;
    this.updateConfig(config);
  }

  /**
   * Get async validation parameter keys
   */
  getAsyncValidationParamKeys(field: import('../../models').FormFieldConfig): string[] {
    return field.asyncValidation?.params ? Object.keys(field.asyncValidation.params) : [];
  }

  /**
   * Add a new parameter to async validation
   */
  addAsyncValidationParam(fieldIndex: number): void {
    const config = { ...this.currentConfig() };
    config.fields = [...config.fields];
    const field = { ...config.fields[fieldIndex] };

    if (field.asyncValidation) {
      const params = field.asyncValidation.params || {};
      const newKey = `param_${Object.keys(params).length + 1}`;
      field.asyncValidation = {
        ...field.asyncValidation,
        params: { ...params, [newKey]: '' },
      };
    }

    config.fields[fieldIndex] = field;
    this.updateConfig(config);
  }

  /**
   * Update async validation parameter key
   */
  updateAsyncValidationParamKey(fieldIndex: number, oldKey: string, newKey: string): void {
    const config = { ...this.currentConfig() };
    config.fields = [...config.fields];
    const field = { ...config.fields[fieldIndex] };

    if (field.asyncValidation?.params && oldKey in field.asyncValidation.params) {
      const params = { ...field.asyncValidation.params };
      const value = params[oldKey];
      delete params[oldKey];
      params[newKey] = value;
      field.asyncValidation = { ...field.asyncValidation, params };
    }

    config.fields[fieldIndex] = field;
    this.updateConfig(config);
  }

  /**
   * Update async validation parameter value
   */
  updateAsyncValidationParamValue(fieldIndex: number, key: string, value: string): void {
    const config = { ...this.currentConfig() };
    config.fields = [...config.fields];
    const field = { ...config.fields[fieldIndex] };

    if (field.asyncValidation?.params) {
      field.asyncValidation = {
        ...field.asyncValidation,
        params: { ...field.asyncValidation.params, [key]: value },
      };
    }

    config.fields[fieldIndex] = field;
    this.updateConfig(config);
  }

  /**
   * Remove async validation parameter
   */
  removeAsyncValidationParam(fieldIndex: number, key: string): void {
    const config = { ...this.currentConfig() };
    config.fields = [...config.fields];
    const field = { ...config.fields[fieldIndex] };

    if (field.asyncValidation?.params) {
      const params = { ...field.asyncValidation.params };
      delete params[key];
      field.asyncValidation = {
        ...field.asyncValidation,
        params: Object.keys(params).length > 0 ? params : undefined,
      };
    }

    config.fields[fieldIndex] = field;
    this.updateConfig(config);
  }

  /**
   * Save current configuration
   */
  saveConfiguration(): void {
    const config = this.currentConfig();
    if (!config.id || config.fields.length === 0) {
      this.showMessage('error', 'Form must have an ID and at least one field');
      return;
    }

    this.formBuilderService.saveConfig(config);
    this.saveRequested.emit(config);
    this.showMessage('success', 'Configuration saved successfully');
  }

  /**
   * Load a configuration
   */
  loadConfiguration(id: string): void {
    const config = this.formBuilderService.loadConfig(id);
    if (config) {
      this.updateConfig(config);
      this.selectedFieldIndex.set(null);
      this.showMessage('success', 'Configuration loaded');
    }
  }

  /**
   * Delete a configuration
   */
  deleteConfiguration(id: string): void {
    if (confirm('Are you sure you want to delete this configuration?')) {
      this.formBuilderService.deleteConfig(id);
      this.showMessage('success', 'Configuration deleted');
    }
  }

  /**
   * Export configuration as JSON
   */
  exportJson(): void {
    const config = this.currentConfig();
    const json = this.formBuilderService.exportConfig(config);
    this.jsonEditorContent.set(json);
    this.jsonEditorMode.set('export');
    this.copyButtonText.set('Copy to Clipboard');
    this.showJsonEditor.set(true);
    this.exportRequested.emit(config);
  }

  /**
   * Open import JSON modal
   */
  openImportJson(): void {
    this.jsonEditorContent.set('');
    this.jsonEditorMode.set('import');
    this.showJsonEditor.set(true);
  }

  /**
   * Copy JSON to clipboard
   */
  async copyJsonToClipboard(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.jsonEditorContent());
      this.copyButtonText.set('Copied!');
      setTimeout(() => this.copyButtonText.set('Copy to Clipboard'), 2000);
    } catch {
      this.copyButtonText.set('Failed to copy');
      setTimeout(() => this.copyButtonText.set('Copy to Clipboard'), 2000);
    }
  }

  /**
   * Import configuration from JSON
   */
  importJson(): void {
    const config = this.formBuilderService.importConfig(this.jsonEditorContent());
    if (config) {
      this.updateConfig(config);
      this.selectedFieldIndex.set(null);
      this.showJsonEditor.set(false);
      this.importCompleted.emit(config);
      this.showMessage('success', 'Configuration imported successfully');
    } else {
      this.showMessage('error', 'Invalid JSON format');
    }
  }

  /**
   * Update form settings
   */
  updateFormSettings(updates: Partial<FormConfig>): void {
    const config = { ...this.currentConfig(), ...updates };
    this.updateConfig(config);
  }

  /**
   * Show a message
   */
  private showMessage(type: 'success' | 'error', text: string): void {
    this.message.set({ type, text });
    setTimeout(() => this.message.set(null), 3000);
  }

  /**
   * Select a field
   */
  selectField(index: number): void {
    this.selectedFieldIndex.set(index);
    this.selectedSectionId.set(null);
    this.selectedWizardPageId.set(null);
  }

  /**
   * Get selected field
   */
  getSelectedField(): FormFieldConfig | null {
    const index = this.selectedFieldIndex();
    return index !== null ? this.currentConfig().fields[index] : null;
  }

  /**
   * Helper methods for template updates without spread operators
   */
  updateFieldName(index: number, name: string): void {
    const field = { ...this.currentConfig().fields[index], name };
    this.updateField(index, field);
  }

  updateFieldLabel(index: number, label: string): void {
    const field = { ...this.currentConfig().fields[index], label };
    this.updateField(index, field);
  }

  updateFieldType(index: number, type: FieldType): void {
    const field = { ...this.currentConfig().fields[index], type };

    // Initialize tableConfig when switching to table type
    if (type === 'table' && !field.tableConfig) {
      field.tableConfig = {
        columns: [{ name: 'column_1', label: 'Column 1', type: 'text' }],
        rowMode: 'fixed',
        fixedRowCount: 3,
      };
    }

    // Clear tableConfig when switching away from table type
    if (type !== 'table') {
      delete field.tableConfig;
    }

    // Initialize datagridConfig when switching to datagrid type
    if (type === 'datagrid' && !field.datagridConfig) {
      field.datagridConfig = {
        columns: [{ name: 'column_1', label: 'Column 1', type: 'number' }],
        rowLabels: [{ id: 'row_1', label: 'Row 1' }],
        rowLabelHeader: 'Row',
        totals: {
          showRowTotals: false,
          showColumnTotals: false,
        },
      };
    }

    // Clear datagridConfig when switching away from datagrid type
    if (type !== 'datagrid') {
      delete field.datagridConfig;
    }

    // Initialize content when switching to info type
    if (type === 'info' && !field.content) {
      field.content = '';
      // Info fields don't have validations or options
      delete field.validations;
      delete field.options;
    }

    // Clear content when switching away from info type
    if (type !== 'info') {
      delete field.content;
    }

    // Initialize phoneConfig when switching to phone type
    if (type === 'phone' && !field.phoneConfig) {
      field.phoneConfig = {
        countryCodes: [...this.defaultCountryCodes],
        defaultCountryCode: '+61',
      };
    }

    // Clear phoneConfig when switching away from phone type
    if (type !== 'phone') {
      delete field.phoneConfig;
    }

    // Initialize daterangeConfig when switching to daterange type
    if (type === 'daterange' && !field.daterangeConfig) {
      field.daterangeConfig = {
        separatorText: 'to',
        toDateOptional: false,
      };
    }

    // Clear daterangeConfig when switching away from daterange type
    if (type !== 'daterange') {
      delete field.daterangeConfig;
    }

    // Initialize formrefConfig when switching to formref type
    if (type === 'formref' && !field.formrefConfig) {
      field.formrefConfig = {
        formId: '',
        showSections: false,
      };
      // Formref fields don't have validations or options
      delete field.validations;
      delete field.options;
    }

    // Clear formrefConfig when switching away from formref type
    if (type !== 'formref') {
      delete field.formrefConfig;
    }

    // Initialize fileuploadConfig when switching to fileupload type
    if (type === 'fileupload' && !field.fileuploadConfig) {
      field.fileuploadConfig = {
        maxFiles: 1,
        maxFileSize: 10 * 1024 * 1024, // 10MB
        uploadTiming: 'immediate',
        allowDragDrop: true,
        showFileSize: true,
      };
    }

    // Clear fileuploadConfig when switching away from fileupload type
    if (type !== 'fileupload') {
      delete field.fileuploadConfig;
    }

    // Initialize autocompleteConfig when switching to autocomplete type
    if (type === 'autocomplete' && !field.autocompleteConfig) {
      field.autocompleteConfig = {
        fetchHandlerName: '',
        minSearchLength: 2,
        debounceMs: 300,
      };
    }

    // Clear autocompleteConfig when switching away from autocomplete type
    if (type !== 'autocomplete') {
      delete field.autocompleteConfig;
    }

    // Initialize options when switching to select, radio, or checkbox type
    if ((type === 'select' || type === 'radio' || type === 'checkbox') && !field.options) {
      field.options = [{ value: 'option_1', label: 'Option 1' }];
    }

    // Clear options when switching away from select, radio, or checkbox type
    if (type !== 'select' && type !== 'radio' && type !== 'checkbox') {
      delete field.options;
    }

    this.updateField(index, field);
  }

  updateFieldPlaceholder(index: number, placeholder: string): void {
    const field = { ...this.currentConfig().fields[index], placeholder };
    this.updateField(index, field);
  }

  updateFieldDisabled(index: number, disabled: boolean): void {
    const field = { ...this.currentConfig().fields[index], disabled };
    this.updateField(index, field);
  }

  updateFieldDescription(index: number, description: string): void {
    const field = { ...this.currentConfig().fields[index], description };
    this.updateField(index, field);
  }

  updateFieldContent(index: number, content: string): void {
    const field = { ...this.currentConfig().fields[index], content };
    this.updateField(index, field);
  }

  updateFieldInlineGroup(index: number, inlineGroup: string): void {
    const field = { ...this.currentConfig().fields[index], inlineGroup: inlineGroup || undefined };
    this.updateField(index, field);
  }

  updateFieldWidth(index: number, width: number): void {
    const field = { ...this.currentConfig().fields[index], width: Number(width) };
    this.updateField(index, field);
  }

  updateValidationType(fieldIndex: number, validationIndex: number, type: string): void {
    const validation = {
      ...this.currentConfig().fields[fieldIndex].validations![validationIndex],
      type: type as any,
    };
    this.updateValidation(fieldIndex, validationIndex, validation);
  }

  updateValidationValue(fieldIndex: number, validationIndex: number, value: any): void {
    const validation = {
      ...this.currentConfig().fields[fieldIndex].validations![validationIndex],
      value,
    };
    this.updateValidation(fieldIndex, validationIndex, validation);
  }

  updateValidationMessage(fieldIndex: number, validationIndex: number, message: string): void {
    const validation = {
      ...this.currentConfig().fields[fieldIndex].validations![validationIndex],
      message,
    };
    this.updateValidation(fieldIndex, validationIndex, validation);
  }

  /**
   * Toggle conditional validation on/off for a field validation
   */
  toggleValidationCondition(fieldIndex: number, validationIndex: number): void {
    const validation = { ...this.currentConfig().fields[fieldIndex].validations![validationIndex] };
    if (validation.condition) {
      delete validation.condition;
    } else {
      // Get available fields for condition
      const availableFields = this.getAvailableConditionFields(fieldIndex);
      const firstField = availableFields.length > 0 ? availableFields[0].value : '';
      validation.condition = {
        field: firstField,
        operator: 'equals',
        value: '',
      };
    }
    this.updateValidation(fieldIndex, validationIndex, validation);
  }

  /**
   * Update the field reference for a validation condition
   */
  updateValidationConditionField(fieldIndex: number, validationIndex: number, field: string): void {
    const validation = { ...this.currentConfig().fields[fieldIndex].validations![validationIndex] };
    if (validation.condition) {
      validation.condition = { ...validation.condition, field };
      this.updateValidation(fieldIndex, validationIndex, validation);
    }
  }

  /**
   * Update the operator for a validation condition
   */
  updateValidationConditionOperator(fieldIndex: number, validationIndex: number, operator: ValidationConditionOperator): void {
    const validation = { ...this.currentConfig().fields[fieldIndex].validations![validationIndex] };
    if (validation.condition) {
      validation.condition = { ...validation.condition, operator };
      // Clear value for isEmpty/isNotEmpty operators
      if (operator === 'isEmpty' || operator === 'isNotEmpty') {
        delete validation.condition.value;
      }
      this.updateValidation(fieldIndex, validationIndex, validation);
    }
  }

  /**
   * Update the value for a validation condition
   */
  updateValidationConditionValue(fieldIndex: number, validationIndex: number, value: any): void {
    const validation = { ...this.currentConfig().fields[fieldIndex].validations![validationIndex] };
    if (validation.condition) {
      validation.condition = { ...validation.condition, value };
      this.updateValidation(fieldIndex, validationIndex, validation);
    }
  }

  /**
   * Get available fields for validation condition dropdown (for standalone fields)
   */
  getAvailableConditionFields(fieldIndex: number): { value: string; label: string }[] {
    const config = this.currentConfig();
    const currentField = config.fields[fieldIndex];
    const result: { value: string; label: string }[] = [];

    config.fields.forEach((field) => {
      // Skip the current field and non-value fields
      if (field.name === currentField.name || field.type === 'info' || field.type === 'formref') {
        return;
      }
      result.push({
        value: field.name,
        label: field.label || field.name,
      });
    });

    return result;
  }

  /**
   * Get available fields for validation condition dropdown (for table/datagrid columns)
   * Includes both same-row columns and form-level fields
   */
  getAvailableColumnConditionFields(
    fieldIndex: number,
    columnIndex: number,
    fieldType: 'table' | 'datagrid'
  ): { value: string; label: string }[] {
    const config = this.currentConfig();
    const tableField = config.fields[fieldIndex];
    const result: { value: string; label: string }[] = [];

    // Add same-row columns (for tables/datagrids)
    if (fieldType === 'table' && tableField.tableConfig) {
      tableField.tableConfig.columns.forEach((column, idx) => {
        if (idx !== columnIndex) {
          result.push({
            value: column.name,
            label: `${column.label} (same row)`,
          });
        }
      });
    } else if (fieldType === 'datagrid' && tableField.datagridConfig) {
      tableField.datagridConfig.columns.forEach((column, idx) => {
        if (idx !== columnIndex && !column.computed) {
          result.push({
            value: column.name,
            label: `${column.label} (same row)`,
          });
        }
      });
    }

    // Add form-level fields
    config.fields.forEach((field) => {
      // Skip the current table/datagrid field and non-value fields
      if (field.name === tableField.name || field.type === 'info' || field.type === 'formref' ||
          field.type === 'table' || field.type === 'datagrid') {
        return;
      }
      result.push({
        value: `$form.${field.name}`,
        label: `${field.label || field.name} (form field)`,
      });
    });

    return result;
  }

  // ============================================
  // Field Visibility Condition Methods
  // ============================================

  /**
   * Toggle visibility condition on/off for a field
   */
  toggleFieldCondition(fieldIndex: number): void {
    const field = { ...this.currentConfig().fields[fieldIndex] };
    if (field.condition) {
      delete field.condition;
    } else {
      const availableFields = this.getAvailableFieldConditionFields(fieldIndex);
      const firstField = availableFields.length > 0 ? availableFields[0].value : '';
      field.condition = {
        field: firstField,
        operator: 'equals',
        value: '',
      };
    }
    this.updateField(fieldIndex, field);
  }

  /**
   * Update the field reference for a field visibility condition
   */
  updateFieldConditionField(fieldIndex: number, conditionField: string): void {
    const field = { ...this.currentConfig().fields[fieldIndex] };
    if (field.condition) {
      field.condition = { ...field.condition, field: conditionField };
      this.updateField(fieldIndex, field);
    }
  }

  /**
   * Update the operator for a field visibility condition
   */
  updateFieldConditionOperator(fieldIndex: number, operator: ValidationConditionOperator): void {
    const field = { ...this.currentConfig().fields[fieldIndex] };
    if (field.condition) {
      field.condition = { ...field.condition, operator };
      // Clear value for isEmpty/isNotEmpty operators
      if (operator === 'isEmpty' || operator === 'isNotEmpty') {
        delete field.condition.value;
      }
      this.updateField(fieldIndex, field);
    }
  }

  /**
   * Update the value for a field visibility condition
   */
  updateFieldConditionValue(fieldIndex: number, value: any): void {
    const field = { ...this.currentConfig().fields[fieldIndex] };
    if (field.condition) {
      field.condition = { ...field.condition, value };
      this.updateField(fieldIndex, field);
    }
  }

  /**
   * Get available fields for field visibility condition dropdown
   */
  getAvailableFieldConditionFields(fieldIndex: number): { value: string; label: string }[] {
    const config = this.currentConfig();
    const currentField = config.fields[fieldIndex];
    const result: { value: string; label: string }[] = [];

    config.fields.forEach((field) => {
      // Skip the current field and non-value fields
      if (field.name === currentField.name || field.type === 'info' || field.type === 'formref') {
        return;
      }
      result.push({
        value: field.name,
        label: field.label || field.name,
      });
    });

    return result;
  }

  // ============================================
  // Section Management Methods
  // ============================================

  addSection(): void {
    const config = { ...this.currentConfig() };
    const sections = config.sections || [];
    const newSection: FormSection = {
      id: `section_${Date.now()}`,
      title: 'New Section',
      order: sections.length,
    };

    config.sections = [...sections, newSection];
    this.updateConfig(config);
    this.selectedSectionId.set(newSection.id);
  }

  updateSection(id: string, updates: Partial<FormSection>): void {
    const config = { ...this.currentConfig() };
    config.sections = (config.sections || []).map((section) =>
      section.id === id ? { ...section, ...updates } : section
    );
    this.updateConfig(config);
  }

  removeSection(id: string): void {
    const config = { ...this.currentConfig() };
    config.sections = (config.sections || []).filter((s) => s.id !== id);
    config.fields = config.fields.map((field) =>
      field.sectionId === id ? { ...field, sectionId: undefined } : field
    );
    this.updateConfig(config);
    this.selectedSectionId.set(null);
  }

  moveSectionUp(id: string): void {
    const config = { ...this.currentConfig() };
    const sections = [...(config.sections || [])];
    const index = sections.findIndex((s) => s.id === id);
    if (index <= 0) return;

    [sections[index - 1], sections[index]] = [sections[index], sections[index - 1]];
    sections.forEach((section, i) => (section.order = i));
    config.sections = sections;
    this.updateConfig(config);
  }

  moveSectionDown(id: string): void {
    const config = { ...this.currentConfig() };
    const sections = [...(config.sections || [])];
    const index = sections.findIndex((s) => s.id === id);
    if (index < 0 || index >= sections.length - 1) return;

    [sections[index], sections[index + 1]] = [sections[index + 1], sections[index]];
    sections.forEach((section, i) => (section.order = i));
    config.sections = sections;
    this.updateConfig(config);
  }

  selectSection(id: string | null): void {
    this.selectedSectionId.set(id);
    this.selectedFieldIndex.set(null);
    this.selectedWizardPageId.set(null);
  }

  getSelectedSection(): FormSection | null {
    const id = this.selectedSectionId();
    return id ? (this.currentConfig().sections || []).find((s) => s.id === id) || null : null;
  }

  getSortedSections(): FormSection[] {
    return [...(this.currentConfig().sections || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  isSectionIdDuplicate(id: string, excludeId?: string): boolean {
    const sections = this.currentConfig().sections || [];
    return sections.some((s) => s.id === id && s.id !== excludeId);
  }

  updateFieldSectionId(index: number, sectionId: string): void {
    const field = { ...this.currentConfig().fields[index], sectionId: sectionId || undefined };
    this.updateField(index, field);
  }

  updateSectionTitle(id: string, title: string): void {
    this.updateSection(id, { title });
  }

  updateSectionDescription(id: string, description: string): void {
    this.updateSection(id, { description: description || undefined });
  }

  updateSectionAnchorId(id: string, anchorId: string): void {
    this.updateSection(id, { anchorId: anchorId || undefined });
  }

  updateSectionId(oldId: string, newId: string): void {
    if (!newId || newId === oldId) return;

    // Check for duplicate
    if (this.isSectionIdDuplicate(newId, oldId)) {
      return;
    }

    const config = { ...this.currentConfig() };

    // Update section id
    config.sections = (config.sections || []).map((section) =>
      section.id === oldId ? { ...section, id: newId } : section
    );

    // Update all fields referencing this section
    config.fields = config.fields.map((field) =>
      field.sectionId === oldId ? { ...field, sectionId: newId } : field
    );

    this.updateConfig(config);
    this.selectedSectionId.set(newId);
  }

  // ============================================
  // Section Visibility Condition Methods
  // ============================================

  /**
   * Toggle visibility condition on/off for a section
   */
  toggleSectionCondition(sectionId: string): void {
    const config = { ...this.currentConfig() };
    const sections = [...(config.sections || [])];
    const index = sections.findIndex((s) => s.id === sectionId);
    if (index === -1) return;

    const section = { ...sections[index] };
    if (section.condition) {
      delete section.condition;
    } else {
      const availableFields = this.getAvailableSectionConditionFields();
      const firstField = availableFields.length > 0 ? availableFields[0].value : '';
      section.condition = {
        field: firstField,
        operator: 'equals',
        value: '',
      };
    }
    sections[index] = section;
    config.sections = sections;
    this.updateConfig(config);
  }

  /**
   * Update the field reference for a section visibility condition
   */
  updateSectionConditionField(sectionId: string, conditionField: string): void {
    const section = this.getSelectedSection();
    if (section?.condition) {
      this.updateSection(sectionId, {
        condition: { ...section.condition, field: conditionField },
      });
    }
  }

  /**
   * Update the operator for a section visibility condition
   */
  updateSectionConditionOperator(sectionId: string, operator: ValidationConditionOperator): void {
    const section = this.getSelectedSection();
    if (section?.condition) {
      const updatedCondition = { ...section.condition, operator };
      // Clear value for isEmpty/isNotEmpty operators
      if (operator === 'isEmpty' || operator === 'isNotEmpty') {
        delete updatedCondition.value;
      }
      this.updateSection(sectionId, { condition: updatedCondition });
    }
  }

  /**
   * Update the value for a section visibility condition
   */
  updateSectionConditionValue(sectionId: string, value: any): void {
    const section = this.getSelectedSection();
    if (section?.condition) {
      this.updateSection(sectionId, {
        condition: { ...section.condition, value },
      });
    }
  }

  /**
   * Get available fields for section visibility condition dropdown
   */
  getAvailableSectionConditionFields(): { value: string; label: string }[] {
    const config = this.currentConfig();
    const result: { value: string; label: string }[] = [];

    config.fields.forEach((field) => {
      // Skip non-value fields
      if (field.type === 'info' || field.type === 'formref') {
        return;
      }
      result.push({
        value: field.name,
        label: field.label || field.name,
      });
    });

    return result;
  }

  // ============================================
  // Wizard Mode Management Methods
  // ============================================

  /**
   * Check if wizard mode is enabled
   */
  isWizardModeEnabled(): boolean {
    return !!this.currentConfig().wizard;
  }

  /**
   * Toggle wizard mode on/off
   */
  toggleWizardMode(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const config = { ...this.currentConfig() };

    if (checkbox.checked) {
      config.wizard = {
        pages: [],
        showProgressBar: true,
        showPageNumbers: true,
      };
    } else {
      delete config.wizard;
      this.selectedWizardPageId.set(null);
    }

    this.updateConfig(config);
  }

  /**
   * Add a new wizard page
   */
  addWizardPage(): void {
    const config = { ...this.currentConfig() };
    if (!config.wizard) return;

    const newPage: WizardPage = {
      id: `page_${Date.now()}`,
      title: 'New Page',
      sectionIds: [],
      order: config.wizard.pages.length,
    };

    config.wizard = {
      ...config.wizard,
      pages: [...config.wizard.pages, newPage],
    };

    this.updateConfig(config);
    this.selectedWizardPageId.set(newPage.id);
  }

  /**
   * Update a wizard page
   */
  updateWizardPage(id: string, updates: Partial<WizardPage>): void {
    const config = { ...this.currentConfig() };
    if (!config.wizard) return;

    config.wizard = {
      ...config.wizard,
      pages: config.wizard.pages.map((page: WizardPage) =>
        page.id === id ? { ...page, ...updates } : page
      ),
    };
    this.updateConfig(config);
  }

  /**
   * Remove a wizard page
   */
  removeWizardPage(id: string): void {
    const config = { ...this.currentConfig() };
    if (!config.wizard) return;

    config.wizard = {
      ...config.wizard,
      pages: config.wizard.pages.filter((p: WizardPage) => p.id !== id),
    };

    // Reorder remaining pages
    config.wizard.pages.forEach((page: WizardPage, i: number) => (page.order = i));

    this.updateConfig(config);
    if (this.selectedWizardPageId() === id) {
      this.selectedWizardPageId.set(null);
    }
  }

  /**
   * Move a wizard page up in order
   */
  moveWizardPageUp(id: string): void {
    const config = { ...this.currentConfig() };
    if (!config.wizard) return;

    const pages = [...config.wizard.pages].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const index = pages.findIndex((p) => p.id === id);
    if (index <= 0) return;

    [pages[index - 1], pages[index]] = [pages[index], pages[index - 1]];
    pages.forEach((page, i) => (page.order = i));
    config.wizard = { ...config.wizard, pages };
    this.updateConfig(config);
  }

  /**
   * Move a wizard page down in order
   */
  moveWizardPageDown(id: string): void {
    const config = { ...this.currentConfig() };
    if (!config.wizard) return;

    const pages = [...config.wizard.pages].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const index = pages.findIndex((p) => p.id === id);
    if (index < 0 || index >= pages.length - 1) return;

    [pages[index], pages[index + 1]] = [pages[index + 1], pages[index]];
    pages.forEach((page, i) => (page.order = i));
    config.wizard = { ...config.wizard, pages };
    this.updateConfig(config);
  }

  /**
   * Select a wizard page for editing
   */
  selectWizardPage(id: string | null): void {
    this.selectedWizardPageId.set(id);
    this.selectedFieldIndex.set(null);
    this.selectedSectionId.set(null);
  }

  /**
   * Get the currently selected wizard page
   */
  getSelectedWizardPage(): WizardPage | null {
    const id = this.selectedWizardPageId();
    if (!id) return null;
    return this.currentConfig().wizard?.pages.find((p: WizardPage) => p.id === id) || null;
  }

  /**
   * Get wizard pages sorted by order
   */
  getWizardPages(): WizardPage[] {
    const wizard = this.currentConfig().wizard;
    if (!wizard) return [];
    return [...wizard.pages].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  /**
   * Toggle a section's inclusion in a wizard page
   */
  toggleSectionInPage(pageId: string, sectionId: string): void {
    const config = { ...this.currentConfig() };
    if (!config.wizard) return;

    config.wizard = {
      ...config.wizard,
      pages: config.wizard.pages.map((page: WizardPage) => {
        if (page.id !== pageId) return page;

        const sectionIds = [...page.sectionIds];
        const index = sectionIds.indexOf(sectionId);

        if (index >= 0) {
          sectionIds.splice(index, 1);
        } else {
          sectionIds.push(sectionId);
        }

        return { ...page, sectionIds };
      }),
    };
    this.updateConfig(config);
  }

  /**
   * Check if a section is assigned to a specific wizard page
   */
  isSectionInPage(pageId: string, sectionId: string): boolean {
    const page = this.currentConfig().wizard?.pages.find((p: WizardPage) => p.id === pageId);
    return page?.sectionIds.includes(sectionId) ?? false;
  }

  /**
   * Get sections not assigned to any wizard page
   */
  getUnassignedSections(): FormSection[] {
    const config = this.currentConfig();
    if (!config.wizard) return [];

    const assignedSectionIds = new Set<string>();
    config.wizard.pages.forEach((page: WizardPage) => {
      page.sectionIds.forEach((id: string) => assignedSectionIds.add(id));
    });

    return (config.sections || []).filter((s) => !assignedSectionIds.has(s.id));
  }

  /**
   * Update wizard page title
   */
  updateWizardPageTitle(id: string, title: string): void {
    this.updateWizardPage(id, { title });
  }

  /**
   * Update wizard page description
   */
  updateWizardPageDescription(id: string, description: string): void {
    this.updateWizardPage(id, { description: description || undefined });
  }

  /**
   * Update wizard page ID
   */
  updateWizardPageId(oldId: string, newId: string): void {
    if (!newId || newId === oldId) return;

    const config = { ...this.currentConfig() };
    if (!config.wizard) return;

    // Check for duplicate
    if (config.wizard.pages.some((p: WizardPage) => p.id === newId)) {
      return;
    }

    config.wizard = {
      ...config.wizard,
      pages: config.wizard.pages.map((page: WizardPage) =>
        page.id === oldId ? { ...page, id: newId } : page
      ),
    };
    this.updateConfig(config);
    this.selectedWizardPageId.set(newId);
  }

  /**
   * Toggle wizard page visibility condition
   */
  toggleWizardPageCondition(pageId: string): void {
    const page = this.getSelectedWizardPage();
    if (!page) return;

    if (page.condition) {
      this.updateWizardPage(pageId, { condition: undefined });
    } else {
      this.updateWizardPage(pageId, {
        condition: { field: '', operator: 'equals', value: '' },
      });
    }
  }

  /**
   * Update wizard page condition field
   */
  updateWizardPageConditionField(pageId: string, field: string): void {
    const page = this.getSelectedWizardPage();
    if (page?.condition) {
      this.updateWizardPage(pageId, {
        condition: { ...page.condition, field },
      });
    }
  }

  /**
   * Update wizard page condition operator
   */
  updateWizardPageConditionOperator(pageId: string, operator: ValidationConditionOperator): void {
    const page = this.getSelectedWizardPage();
    if (page?.condition) {
      this.updateWizardPage(pageId, {
        condition: { ...page.condition, operator },
      });
    }
  }

  /**
   * Update wizard page condition value
   */
  updateWizardPageConditionValue(pageId: string, value: any): void {
    const page = this.getSelectedWizardPage();
    if (page?.condition) {
      this.updateWizardPage(pageId, {
        condition: { ...page.condition, value },
      });
    }
  }

  /**
   * Update wizard config allow free navigation
   */
  updateWizardAllowFreeNavigation(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const config = { ...this.currentConfig() };
    if (!config.wizard) return;

    config.wizard = { ...config.wizard, allowFreeNavigation: checkbox.checked };
    this.updateConfig(config);
  }

  /**
   * Update wizard config show progress bar
   */
  updateWizardShowProgressBar(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const config = { ...this.currentConfig() };
    if (!config.wizard) return;

    config.wizard = { ...config.wizard, showProgressBar: checkbox.checked };
    this.updateConfig(config);
  }

  /**
   * Update wizard config show page numbers
   */
  updateWizardShowPageNumbers(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const config = { ...this.currentConfig() };
    if (!config.wizard) return;

    config.wizard = { ...config.wizard, showPageNumbers: checkbox.checked };
    this.updateConfig(config);
  }

  /**
   * Update wizard next button label
   */
  updateWizardNextLabel(label: string): void {
    const config = { ...this.currentConfig() };
    if (!config.wizard) return;

    config.wizard = { ...config.wizard, nextLabel: label || undefined };
    this.updateConfig(config);
  }

  /**
   * Update wizard previous button label
   */
  updateWizardPrevLabel(label: string): void {
    const config = { ...this.currentConfig() };
    if (!config.wizard) return;

    config.wizard = { ...config.wizard, prevLabel: label || undefined };
    this.updateConfig(config);
  }

  /**
   * Update wizard submit button label
   */
  updateWizardSubmitLabel(label: string): void {
    const config = { ...this.currentConfig() };
    if (!config.wizard) return;

    config.wizard = { ...config.wizard, submitLabel: label || undefined };
    this.updateConfig(config);
  }

  // ============================================
  // Select Options Management Methods
  // ============================================

  addOption(fieldIndex: number): void {
    const field = { ...this.currentConfig().fields[fieldIndex] };
    field.options = [...(field.options || []), { label: 'New Option', value: '' }];
    this.updateField(fieldIndex, field);
  }

  updateOption(fieldIndex: number, optionIndex: number, updates: { label?: string; value?: string }): void {
    const field = { ...this.currentConfig().fields[fieldIndex] };
    field.options = [...(field.options || [])];
    field.options[optionIndex] = { ...field.options[optionIndex], ...updates };
    this.updateField(fieldIndex, field);
  }

  removeOption(fieldIndex: number, optionIndex: number): void {
    const field = { ...this.currentConfig().fields[fieldIndex] };
    field.options = (field.options || []).filter((_, i) => i !== optionIndex);
    this.updateField(fieldIndex, field);
  }

  updateOptionLabel(fieldIndex: number, optionIndex: number, label: string): void {
    this.updateOption(fieldIndex, optionIndex, { label });
  }

  updateOptionValue(fieldIndex: number, optionIndex: number, value: string): void {
    this.updateOption(fieldIndex, optionIndex, { value });
  }

  // ============================================
  // Table Configuration Methods
  // ============================================

  updateTableConfig(fieldIndex: number, updates: Partial<TableConfig>): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.tableConfig) return;

    const updatedField = {
      ...field,
      tableConfig: { ...field.tableConfig, ...updates },
    };
    this.updateField(fieldIndex, updatedField);
  }

  updateTableRowMode(fieldIndex: number, rowMode: TableRowMode): void {
    this.updateTableConfig(fieldIndex, { rowMode });
  }

  updateTableFixedRowCount(fieldIndex: number, count: number): void {
    this.updateTableConfig(fieldIndex, { fixedRowCount: Number(count) });
  }

  updateTableMinRows(fieldIndex: number, minRows: number): void {
    this.updateTableConfig(fieldIndex, { minRows: Number(minRows) });
  }

  updateTableMaxRows(fieldIndex: number, maxRows: number): void {
    this.updateTableConfig(fieldIndex, { maxRows: Number(maxRows) });
  }

  updateTableAddRowLabel(fieldIndex: number, label: string): void {
    this.updateTableConfig(fieldIndex, { addRowLabel: label || undefined });
  }

  addTableColumn(fieldIndex: number): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.tableConfig) return;

    const newColumn: TableColumnConfig = {
      name: `column_${Date.now()}`,
      label: 'New Column',
      type: 'text',
    };

    const columns = [...field.tableConfig.columns, newColumn];
    this.updateTableConfig(fieldIndex, { columns });
  }

  updateTableColumn(fieldIndex: number, columnIndex: number, updates: Partial<TableColumnConfig>): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.tableConfig) return;

    const columns = [...field.tableConfig.columns];
    columns[columnIndex] = { ...columns[columnIndex], ...updates };
    this.updateTableConfig(fieldIndex, { columns });
  }

  removeTableColumn(fieldIndex: number, columnIndex: number): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.tableConfig || field.tableConfig.columns.length <= 1) return;

    const columns = field.tableConfig.columns.filter((_, i) => i !== columnIndex);
    this.updateTableConfig(fieldIndex, { columns });
  }

  moveTableColumnUp(fieldIndex: number, columnIndex: number): void {
    if (columnIndex === 0) return;
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.tableConfig) return;

    const columns = [...field.tableConfig.columns];
    [columns[columnIndex - 1], columns[columnIndex]] = [columns[columnIndex], columns[columnIndex - 1]];
    this.updateTableConfig(fieldIndex, { columns });
  }

  moveTableColumnDown(fieldIndex: number, columnIndex: number): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.tableConfig) return;
    if (columnIndex >= field.tableConfig.columns.length - 1) return;

    const columns = [...field.tableConfig.columns];
    [columns[columnIndex], columns[columnIndex + 1]] = [columns[columnIndex + 1], columns[columnIndex]];
    this.updateTableConfig(fieldIndex, { columns });
  }

  updateColumnName(fieldIndex: number, columnIndex: number, name: string): void {
    this.updateTableColumn(fieldIndex, columnIndex, { name });
  }

  updateColumnLabel(fieldIndex: number, columnIndex: number, label: string): void {
    this.updateTableColumn(fieldIndex, columnIndex, { label });
  }

  updateColumnType(fieldIndex: number, columnIndex: number, type: TableColumnType): void {
    this.updateTableColumn(fieldIndex, columnIndex, { type });
  }

  updateColumnPlaceholder(fieldIndex: number, columnIndex: number, placeholder: string): void {
    this.updateTableColumn(fieldIndex, columnIndex, { placeholder: placeholder || undefined });
  }

  updateColumnWidth(fieldIndex: number, columnIndex: number, width: number): void {
    this.updateTableColumn(fieldIndex, columnIndex, { width: Number(width) });
  }

  addColumnValidation(fieldIndex: number, columnIndex: number): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.tableConfig) return;

    const column = field.tableConfig.columns[columnIndex];
    const validations = [
      ...(column.validations || []),
      { type: 'required', message: 'This field is required' } as ValidationRule,
    ];
    this.updateTableColumn(fieldIndex, columnIndex, { validations });
  }

  updateColumnValidation(
    fieldIndex: number,
    columnIndex: number,
    validationIndex: number,
    updates: Partial<ValidationRule>
  ): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.tableConfig) return;

    const column = field.tableConfig.columns[columnIndex];
    const validations = [...(column.validations || [])];
    validations[validationIndex] = { ...validations[validationIndex], ...updates };
    this.updateTableColumn(fieldIndex, columnIndex, { validations });
  }

  removeColumnValidation(fieldIndex: number, columnIndex: number, validationIndex: number): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.tableConfig) return;

    const column = field.tableConfig.columns[columnIndex];
    const validations = (column.validations || []).filter((_, i) => i !== validationIndex);
    this.updateTableColumn(fieldIndex, columnIndex, { validations });
  }

  updateColumnValidationType(
    fieldIndex: number,
    columnIndex: number,
    validationIndex: number,
    type: string
  ): void {
    this.updateColumnValidation(fieldIndex, columnIndex, validationIndex, { type: type as any });
  }

  updateColumnValidationValue(
    fieldIndex: number,
    columnIndex: number,
    validationIndex: number,
    value: any
  ): void {
    this.updateColumnValidation(fieldIndex, columnIndex, validationIndex, { value });
  }

  updateColumnValidationMessage(
    fieldIndex: number,
    columnIndex: number,
    validationIndex: number,
    message: string
  ): void {
    this.updateColumnValidation(fieldIndex, columnIndex, validationIndex, { message });
  }

  /**
   * Toggle conditional validation on/off for a table column validation
   */
  toggleColumnValidationCondition(
    fieldIndex: number,
    columnIndex: number,
    validationIndex: number
  ): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.tableConfig) return;

    const column = field.tableConfig.columns[columnIndex];
    const validation = { ...column.validations![validationIndex] };

    if (validation.condition) {
      delete validation.condition;
    } else {
      const availableFields = this.getAvailableColumnConditionFields(fieldIndex, columnIndex, 'table');
      const firstField = availableFields.length > 0 ? availableFields[0].value : '';
      validation.condition = {
        field: firstField,
        operator: 'equals',
        value: '',
      };
    }
    this.updateColumnValidation(fieldIndex, columnIndex, validationIndex, validation);
  }

  /**
   * Update the field reference for a table column validation condition
   */
  updateColumnValidationConditionField(
    fieldIndex: number,
    columnIndex: number,
    validationIndex: number,
    field: string
  ): void {
    const tableField = this.currentConfig().fields[fieldIndex];
    if (!tableField.tableConfig) return;

    const column = tableField.tableConfig.columns[columnIndex];
    const validation = { ...column.validations![validationIndex] };
    if (validation.condition) {
      validation.condition = { ...validation.condition, field };
      this.updateColumnValidation(fieldIndex, columnIndex, validationIndex, validation);
    }
  }

  /**
   * Update the operator for a table column validation condition
   */
  updateColumnValidationConditionOperator(
    fieldIndex: number,
    columnIndex: number,
    validationIndex: number,
    operator: ValidationConditionOperator
  ): void {
    const tableField = this.currentConfig().fields[fieldIndex];
    if (!tableField.tableConfig) return;

    const column = tableField.tableConfig.columns[columnIndex];
    const validation = { ...column.validations![validationIndex] };
    if (validation.condition) {
      validation.condition = { ...validation.condition, operator };
      if (operator === 'isEmpty' || operator === 'isNotEmpty') {
        delete validation.condition.value;
      }
      this.updateColumnValidation(fieldIndex, columnIndex, validationIndex, validation);
    }
  }

  /**
   * Update the value for a table column validation condition
   */
  updateColumnValidationConditionValue(
    fieldIndex: number,
    columnIndex: number,
    validationIndex: number,
    value: any
  ): void {
    const tableField = this.currentConfig().fields[fieldIndex];
    if (!tableField.tableConfig) return;

    const column = tableField.tableConfig.columns[columnIndex];
    const validation = { ...column.validations![validationIndex] };
    if (validation.condition) {
      validation.condition = { ...validation.condition, value };
      this.updateColumnValidation(fieldIndex, columnIndex, validationIndex, validation);
    }
  }

  addColumnOption(fieldIndex: number, columnIndex: number): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.tableConfig) return;

    const column = field.tableConfig.columns[columnIndex];
    const options = [...(column.options || []), { label: 'New Option', value: '' }];
    this.updateTableColumn(fieldIndex, columnIndex, { options });
  }

  updateColumnOption(
    fieldIndex: number,
    columnIndex: number,
    optionIndex: number,
    updates: { label?: string; value?: string }
  ): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.tableConfig) return;

    const column = field.tableConfig.columns[columnIndex];
    const options = [...(column.options || [])];
    options[optionIndex] = { ...options[optionIndex], ...updates };
    this.updateTableColumn(fieldIndex, columnIndex, { options });
  }

  removeColumnOption(fieldIndex: number, columnIndex: number, optionIndex: number): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.tableConfig) return;

    const column = field.tableConfig.columns[columnIndex];
    const options = (column.options || []).filter((_, i) => i !== optionIndex);
    this.updateTableColumn(fieldIndex, columnIndex, { options });
  }

  updateColumnOptionLabel(fieldIndex: number, columnIndex: number, optionIndex: number, label: string): void {
    this.updateColumnOption(fieldIndex, columnIndex, optionIndex, { label });
  }

  updateColumnOptionValue(fieldIndex: number, columnIndex: number, optionIndex: number, value: string): void {
    this.updateColumnOption(fieldIndex, columnIndex, optionIndex, { value });
  }

  // ============================================
  // DataGrid Configuration Methods
  // ============================================

  updateDataGridConfig(fieldIndex: number, updates: Partial<DataGridConfig>): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.datagridConfig) return;

    const updatedField = {
      ...field,
      datagridConfig: { ...field.datagridConfig, ...updates },
    };
    this.updateField(fieldIndex, updatedField);
  }

  updateDataGridRowLabelHeader(fieldIndex: number, header: string): void {
    this.updateDataGridConfig(fieldIndex, { rowLabelHeader: header || undefined });
  }

  addDataGridRowLabel(fieldIndex: number): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.datagridConfig) return;

    const newRowLabel: DataGridRowLabel = {
      id: `row_${Date.now()}`,
      label: 'New Row',
    };

    const rowLabels = [...field.datagridConfig.rowLabels, newRowLabel];
    this.updateDataGridConfig(fieldIndex, { rowLabels });
  }

  updateDataGridRowLabel(fieldIndex: number, rowIndex: number, updates: Partial<DataGridRowLabel>): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.datagridConfig) return;

    const rowLabels = [...field.datagridConfig.rowLabels];
    rowLabels[rowIndex] = { ...rowLabels[rowIndex], ...updates };
    this.updateDataGridConfig(fieldIndex, { rowLabels });
  }

  removeDataGridRowLabel(fieldIndex: number, rowIndex: number): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.datagridConfig || field.datagridConfig.rowLabels.length <= 1) return;

    const rowLabels = field.datagridConfig.rowLabels.filter((_, i) => i !== rowIndex);
    this.updateDataGridConfig(fieldIndex, { rowLabels });
  }

  moveDataGridRowLabelUp(fieldIndex: number, rowIndex: number): void {
    if (rowIndex === 0) return;
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.datagridConfig) return;

    const rowLabels = [...field.datagridConfig.rowLabels];
    [rowLabels[rowIndex - 1], rowLabels[rowIndex]] = [rowLabels[rowIndex], rowLabels[rowIndex - 1]];
    this.updateDataGridConfig(fieldIndex, { rowLabels });
  }

  moveDataGridRowLabelDown(fieldIndex: number, rowIndex: number): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.datagridConfig) return;
    if (rowIndex >= field.datagridConfig.rowLabels.length - 1) return;

    const rowLabels = [...field.datagridConfig.rowLabels];
    [rowLabels[rowIndex], rowLabels[rowIndex + 1]] = [rowLabels[rowIndex + 1], rowLabels[rowIndex]];
    this.updateDataGridConfig(fieldIndex, { rowLabels });
  }

  updateDataGridRowLabelId(fieldIndex: number, rowIndex: number, id: string): void {
    this.updateDataGridRowLabel(fieldIndex, rowIndex, { id });
  }

  updateDataGridRowLabelText(fieldIndex: number, rowIndex: number, label: string): void {
    this.updateDataGridRowLabel(fieldIndex, rowIndex, { label });
  }

  addDataGridColumn(fieldIndex: number): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.datagridConfig) return;

    const newColumn: DataGridColumnConfig = {
      name: `column_${Date.now()}`,
      label: 'New Column',
      type: 'number',
    };

    const columns = [...field.datagridConfig.columns, newColumn];
    this.updateDataGridConfig(fieldIndex, { columns });
  }

  updateDataGridColumn(fieldIndex: number, columnIndex: number, updates: Partial<DataGridColumnConfig>): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.datagridConfig) return;

    const columns = [...field.datagridConfig.columns];
    columns[columnIndex] = { ...columns[columnIndex], ...updates };
    this.updateDataGridConfig(fieldIndex, { columns });
  }

  removeDataGridColumn(fieldIndex: number, columnIndex: number): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.datagridConfig || field.datagridConfig.columns.length <= 1) return;

    const column = field.datagridConfig.columns[columnIndex];
    const columns = field.datagridConfig.columns.filter((_, i) => i !== columnIndex);

    let columnGroups = field.datagridConfig.columnGroups;
    if (columnGroups) {
      columnGroups = columnGroups
        .map((group) => ({
          ...group,
          columnIds: group.columnIds.filter((id) => id !== column.name),
        }))
        .filter((group) => group.columnIds.length > 0);
    }

    this.updateDataGridConfig(fieldIndex, { columns, columnGroups });
  }

  moveDataGridColumnUp(fieldIndex: number, columnIndex: number): void {
    if (columnIndex === 0) return;
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.datagridConfig) return;

    const columns = [...field.datagridConfig.columns];
    [columns[columnIndex - 1], columns[columnIndex]] = [columns[columnIndex], columns[columnIndex - 1]];
    this.updateDataGridConfig(fieldIndex, { columns });
  }

  moveDataGridColumnDown(fieldIndex: number, columnIndex: number): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.datagridConfig) return;
    if (columnIndex >= field.datagridConfig.columns.length - 1) return;

    const columns = [...field.datagridConfig.columns];
    [columns[columnIndex], columns[columnIndex + 1]] = [columns[columnIndex + 1], columns[columnIndex]];
    this.updateDataGridConfig(fieldIndex, { columns });
  }

  updateDataGridColumnName(fieldIndex: number, columnIndex: number, name: string): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.datagridConfig) return;

    const oldName = field.datagridConfig.columns[columnIndex].name;
    this.updateDataGridColumn(fieldIndex, columnIndex, { name });

    const columnGroups = field.datagridConfig.columnGroups;
    if (columnGroups) {
      const updatedGroups = columnGroups.map((group) => ({
        ...group,
        columnIds: group.columnIds.map((id) => (id === oldName ? name : id)),
      }));
      this.updateDataGridConfig(fieldIndex, { columnGroups: updatedGroups });
    }
  }

  updateDataGridColumnLabel(fieldIndex: number, columnIndex: number, label: string): void {
    this.updateDataGridColumn(fieldIndex, columnIndex, { label });
  }

  updateDataGridColumnType(fieldIndex: number, columnIndex: number, type: DataGridColumnType): void {
    this.updateDataGridColumn(fieldIndex, columnIndex, { type });
  }

  updateDataGridColumnPlaceholder(fieldIndex: number, columnIndex: number, placeholder: string): void {
    this.updateDataGridColumn(fieldIndex, columnIndex, { placeholder: placeholder || undefined });
  }

  updateDataGridColumnWidth(fieldIndex: number, columnIndex: number, width: number): void {
    this.updateDataGridColumn(fieldIndex, columnIndex, { width: Number(width) });
  }

  updateDataGridColumnComputed(fieldIndex: number, columnIndex: number, computed: boolean): void {
    const updates: Partial<DataGridColumnConfig> = { computed };
    if (computed) {
      updates.formula = { type: 'expression', expression: '' };
    } else {
      updates.formula = undefined;
    }
    this.updateDataGridColumn(fieldIndex, columnIndex, updates);
  }

  updateDataGridColumnFormula(fieldIndex: number, columnIndex: number, expression: string): void {
    this.updateDataGridColumn(fieldIndex, columnIndex, {
      formula: { type: 'expression', expression },
    });
  }

  updateDataGridColumnShowInColumnTotal(fieldIndex: number, columnIndex: number, show: boolean): void {
    this.updateDataGridColumn(fieldIndex, columnIndex, { showInColumnTotal: show });
  }

  updateDataGridColumnShowInRowTotal(fieldIndex: number, columnIndex: number, show: boolean): void {
    this.updateDataGridColumn(fieldIndex, columnIndex, { showInRowTotal: show });
  }

  addDataGridColumnValidation(fieldIndex: number, columnIndex: number): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.datagridConfig) return;

    const column = field.datagridConfig.columns[columnIndex];
    const validations = [
      ...(column.validations || []),
      { type: 'required', message: 'This field is required' } as ValidationRule,
    ];
    this.updateDataGridColumn(fieldIndex, columnIndex, { validations });
  }

  updateDataGridColumnValidation(
    fieldIndex: number,
    columnIndex: number,
    validationIndex: number,
    updates: Partial<ValidationRule>
  ): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.datagridConfig) return;

    const column = field.datagridConfig.columns[columnIndex];
    const validations = [...(column.validations || [])];
    validations[validationIndex] = { ...validations[validationIndex], ...updates };
    this.updateDataGridColumn(fieldIndex, columnIndex, { validations });
  }

  removeDataGridColumnValidation(fieldIndex: number, columnIndex: number, validationIndex: number): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.datagridConfig) return;

    const column = field.datagridConfig.columns[columnIndex];
    const validations = (column.validations || []).filter((_, i) => i !== validationIndex);
    this.updateDataGridColumn(fieldIndex, columnIndex, { validations });
  }

  updateDataGridColumnValidationType(
    fieldIndex: number,
    columnIndex: number,
    validationIndex: number,
    type: string
  ): void {
    this.updateDataGridColumnValidation(fieldIndex, columnIndex, validationIndex, { type: type as any });
  }

  updateDataGridColumnValidationValue(
    fieldIndex: number,
    columnIndex: number,
    validationIndex: number,
    value: any
  ): void {
    this.updateDataGridColumnValidation(fieldIndex, columnIndex, validationIndex, { value });
  }

  updateDataGridColumnValidationMessage(
    fieldIndex: number,
    columnIndex: number,
    validationIndex: number,
    message: string
  ): void {
    this.updateDataGridColumnValidation(fieldIndex, columnIndex, validationIndex, { message });
  }

  /**
   * Toggle conditional validation on/off for a datagrid column validation
   */
  toggleDataGridColumnValidationCondition(
    fieldIndex: number,
    columnIndex: number,
    validationIndex: number
  ): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.datagridConfig) return;

    const column = field.datagridConfig.columns[columnIndex];
    const validation = { ...column.validations![validationIndex] };

    if (validation.condition) {
      delete validation.condition;
    } else {
      const availableFields = this.getAvailableColumnConditionFields(fieldIndex, columnIndex, 'datagrid');
      const firstField = availableFields.length > 0 ? availableFields[0].value : '';
      validation.condition = {
        field: firstField,
        operator: 'equals',
        value: '',
      };
    }
    this.updateDataGridColumnValidation(fieldIndex, columnIndex, validationIndex, validation);
  }

  /**
   * Update the field reference for a datagrid column validation condition
   */
  updateDataGridColumnValidationConditionField(
    fieldIndex: number,
    columnIndex: number,
    validationIndex: number,
    field: string
  ): void {
    const datagridField = this.currentConfig().fields[fieldIndex];
    if (!datagridField.datagridConfig) return;

    const column = datagridField.datagridConfig.columns[columnIndex];
    const validation = { ...column.validations![validationIndex] };
    if (validation.condition) {
      validation.condition = { ...validation.condition, field };
      this.updateDataGridColumnValidation(fieldIndex, columnIndex, validationIndex, validation);
    }
  }

  /**
   * Update the operator for a datagrid column validation condition
   */
  updateDataGridColumnValidationConditionOperator(
    fieldIndex: number,
    columnIndex: number,
    validationIndex: number,
    operator: ValidationConditionOperator
  ): void {
    const datagridField = this.currentConfig().fields[fieldIndex];
    if (!datagridField.datagridConfig) return;

    const column = datagridField.datagridConfig.columns[columnIndex];
    const validation = { ...column.validations![validationIndex] };
    if (validation.condition) {
      validation.condition = { ...validation.condition, operator };
      if (operator === 'isEmpty' || operator === 'isNotEmpty') {
        delete validation.condition.value;
      }
      this.updateDataGridColumnValidation(fieldIndex, columnIndex, validationIndex, validation);
    }
  }

  /**
   * Update the value for a datagrid column validation condition
   */
  updateDataGridColumnValidationConditionValue(
    fieldIndex: number,
    columnIndex: number,
    validationIndex: number,
    value: any
  ): void {
    const datagridField = this.currentConfig().fields[fieldIndex];
    if (!datagridField.datagridConfig) return;

    const column = datagridField.datagridConfig.columns[columnIndex];
    const validation = { ...column.validations![validationIndex] };
    if (validation.condition) {
      validation.condition = { ...validation.condition, value };
      this.updateDataGridColumnValidation(fieldIndex, columnIndex, validationIndex, validation);
    }
  }

  addDataGridColumnOption(fieldIndex: number, columnIndex: number): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.datagridConfig) return;

    const column = field.datagridConfig.columns[columnIndex];
    const options = [...(column.options || []), { label: 'New Option', value: '' }];
    this.updateDataGridColumn(fieldIndex, columnIndex, { options });
  }

  updateDataGridColumnOption(
    fieldIndex: number,
    columnIndex: number,
    optionIndex: number,
    updates: { label?: string; value?: string }
  ): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.datagridConfig) return;

    const column = field.datagridConfig.columns[columnIndex];
    const options = [...(column.options || [])];
    options[optionIndex] = { ...options[optionIndex], ...updates };
    this.updateDataGridColumn(fieldIndex, columnIndex, { options });
  }

  removeDataGridColumnOption(fieldIndex: number, columnIndex: number, optionIndex: number): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.datagridConfig) return;

    const column = field.datagridConfig.columns[columnIndex];
    const options = (column.options || []).filter((_, i) => i !== optionIndex);
    this.updateDataGridColumn(fieldIndex, columnIndex, { options });
  }

  updateDataGridColumnOptionLabel(
    fieldIndex: number,
    columnIndex: number,
    optionIndex: number,
    label: string
  ): void {
    this.updateDataGridColumnOption(fieldIndex, columnIndex, optionIndex, { label });
  }

  updateDataGridColumnOptionValue(
    fieldIndex: number,
    columnIndex: number,
    optionIndex: number,
    value: string
  ): void {
    this.updateDataGridColumnOption(fieldIndex, columnIndex, optionIndex, { value });
  }

  addDataGridColumnGroup(fieldIndex: number): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.datagridConfig) return;

    const newGroup: DataGridColumnGroup = {
      id: `group_${Date.now()}`,
      label: 'New Group',
      columnIds: [],
    };

    const columnGroups = [...(field.datagridConfig.columnGroups || []), newGroup];
    this.updateDataGridConfig(fieldIndex, { columnGroups });
  }

  updateDataGridColumnGroup(
    fieldIndex: number,
    groupIndex: number,
    updates: Partial<DataGridColumnGroup>
  ): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.datagridConfig?.columnGroups) return;

    const columnGroups = [...field.datagridConfig.columnGroups];
    columnGroups[groupIndex] = { ...columnGroups[groupIndex], ...updates };
    this.updateDataGridConfig(fieldIndex, { columnGroups });
  }

  removeDataGridColumnGroup(fieldIndex: number, groupIndex: number): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.datagridConfig?.columnGroups) return;

    const columnGroups = field.datagridConfig.columnGroups.filter((_, i) => i !== groupIndex);
    this.updateDataGridConfig(fieldIndex, { columnGroups: columnGroups.length > 0 ? columnGroups : undefined });
  }

  updateDataGridColumnGroupId(fieldIndex: number, groupIndex: number, id: string): void {
    this.updateDataGridColumnGroup(fieldIndex, groupIndex, { id });
  }

  updateDataGridColumnGroupLabel(fieldIndex: number, groupIndex: number, label: string): void {
    this.updateDataGridColumnGroup(fieldIndex, groupIndex, { label });
  }

  toggleDataGridColumnInGroup(fieldIndex: number, groupIndex: number, columnName: string): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.datagridConfig?.columnGroups) return;

    const group = field.datagridConfig.columnGroups[groupIndex];
    let columnIds: string[];

    if (group.columnIds.includes(columnName)) {
      columnIds = group.columnIds.filter((id) => id !== columnName);
    } else {
      const columnGroups = field.datagridConfig.columnGroups.map((g, i) => {
        if (i === groupIndex) return g;
        return {
          ...g,
          columnIds: g.columnIds.filter((id) => id !== columnName),
        };
      });
      this.updateDataGridConfig(fieldIndex, { columnGroups });
      columnIds = [...group.columnIds, columnName];
    }

    this.updateDataGridColumnGroup(fieldIndex, groupIndex, { columnIds });
  }

  isDataGridColumnInGroup(fieldIndex: number, groupIndex: number, columnName: string): boolean {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.datagridConfig?.columnGroups) return false;

    const group = field.datagridConfig.columnGroups[groupIndex];
    return group?.columnIds.includes(columnName) || false;
  }

  getDataGridColumnGroupId(fieldIndex: number, columnName: string): string | null {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.datagridConfig?.columnGroups) return null;

    for (const group of field.datagridConfig.columnGroups) {
      if (group.columnIds.includes(columnName)) {
        return group.id;
      }
    }
    return null;
  }

  updateDataGridTotalsConfig(fieldIndex: number, updates: Partial<DataGridConfig['totals']>): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.datagridConfig) return;

    const totals = { ...field.datagridConfig.totals, ...updates };
    this.updateDataGridConfig(fieldIndex, { totals });
  }

  updateDataGridShowRowTotals(fieldIndex: number, show: boolean): void {
    this.updateDataGridTotalsConfig(fieldIndex, { showRowTotals: show });
  }

  updateDataGridRowTotalLabel(fieldIndex: number, label: string): void {
    this.updateDataGridTotalsConfig(fieldIndex, { rowTotalLabel: label || undefined });
  }

  updateDataGridShowColumnTotals(fieldIndex: number, show: boolean): void {
    this.updateDataGridTotalsConfig(fieldIndex, { showColumnTotals: show });
  }

  updateDataGridColumnTotalLabel(fieldIndex: number, label: string): void {
    this.updateDataGridTotalsConfig(fieldIndex, { columnTotalLabel: label || undefined });
  }

  // ============================================
  // Phone Configuration Methods
  // ============================================

  updatePhoneConfig(fieldIndex: number, updates: Partial<PhoneConfig>): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.phoneConfig) return;

    const updatedField = {
      ...field,
      phoneConfig: { ...field.phoneConfig, ...updates },
    };
    this.updateField(fieldIndex, updatedField);
  }

  updatePhoneDefaultCountryCode(fieldIndex: number, code: string): void {
    this.updatePhoneConfig(fieldIndex, { defaultCountryCode: code || undefined });
  }

  addPhoneCountryCode(fieldIndex: number): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.phoneConfig) return;

    const newCountry: CountryCodeOption = {
      code: '+00',
      country: 'New Country',
    };

    const countryCodes = [...field.phoneConfig.countryCodes, newCountry];
    this.updatePhoneConfig(fieldIndex, { countryCodes });
  }

  updatePhoneCountryCode(
    fieldIndex: number,
    countryIndex: number,
    updates: Partial<CountryCodeOption>
  ): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.phoneConfig) return;

    const countryCodes = [...field.phoneConfig.countryCodes];
    countryCodes[countryIndex] = { ...countryCodes[countryIndex], ...updates };
    this.updatePhoneConfig(fieldIndex, { countryCodes });
  }

  removePhoneCountryCode(fieldIndex: number, countryIndex: number): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.phoneConfig || field.phoneConfig.countryCodes.length <= 1) return;

    const countryCodes = field.phoneConfig.countryCodes.filter((_, i) => i !== countryIndex);
    this.updatePhoneConfig(fieldIndex, { countryCodes });
  }

  movePhoneCountryCodeUp(fieldIndex: number, countryIndex: number): void {
    if (countryIndex === 0) return;
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.phoneConfig) return;

    const countryCodes = [...field.phoneConfig.countryCodes];
    [countryCodes[countryIndex - 1], countryCodes[countryIndex]] = [
      countryCodes[countryIndex],
      countryCodes[countryIndex - 1],
    ];
    this.updatePhoneConfig(fieldIndex, { countryCodes });
  }

  movePhoneCountryCodeDown(fieldIndex: number, countryIndex: number): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.phoneConfig) return;
    if (countryIndex >= field.phoneConfig.countryCodes.length - 1) return;

    const countryCodes = [...field.phoneConfig.countryCodes];
    [countryCodes[countryIndex], countryCodes[countryIndex + 1]] = [
      countryCodes[countryIndex + 1],
      countryCodes[countryIndex],
    ];
    this.updatePhoneConfig(fieldIndex, { countryCodes });
  }

  updatePhoneCountryCodeCode(fieldIndex: number, countryIndex: number, code: string): void {
    this.updatePhoneCountryCode(fieldIndex, countryIndex, { code });
  }

  updatePhoneCountryCodeCountry(fieldIndex: number, countryIndex: number, country: string): void {
    this.updatePhoneCountryCode(fieldIndex, countryIndex, { country });
  }

  updatePhoneCountryCodeFlag(fieldIndex: number, countryIndex: number, flag: string): void {
    this.updatePhoneCountryCode(fieldIndex, countryIndex, { flag: flag || undefined });
  }

  // ============================================
  // Date Range Field Methods
  // ============================================

  updateDateRangeConfig(fieldIndex: number, updates: Partial<DateRangeConfig>): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.daterangeConfig) return;

    const updatedField = {
      ...field,
      daterangeConfig: { ...field.daterangeConfig, ...updates },
    };
    this.updateField(fieldIndex, updatedField);
  }

  updateDateRangeFromLabel(fieldIndex: number, fromLabel: string): void {
    this.updateDateRangeConfig(fieldIndex, { fromLabel: fromLabel || undefined });
  }

  updateDateRangeToLabel(fieldIndex: number, toLabel: string): void {
    this.updateDateRangeConfig(fieldIndex, { toLabel: toLabel || undefined });
  }

  updateDateRangeSeparator(fieldIndex: number, separatorText: string): void {
    this.updateDateRangeConfig(fieldIndex, { separatorText: separatorText || undefined });
  }

  updateDateRangeToDateOptional(fieldIndex: number, toDateOptional: boolean): void {
    this.updateDateRangeConfig(fieldIndex, { toDateOptional });
  }

  // ============================================
  // Form Reference Field Methods
  // ============================================

  updateFormRefConfig(fieldIndex: number, updates: Partial<FormRefConfig>): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.formrefConfig) return;

    const updatedField = {
      ...field,
      formrefConfig: { ...field.formrefConfig, ...updates },
    };
    this.updateField(fieldIndex, updatedField);
  }

  updateFormRefFormId(fieldIndex: number, formId: string): void {
    this.updateFormRefConfig(fieldIndex, { formId });
  }

  updateFormRefShowSections(fieldIndex: number, showSections: boolean): void {
    this.updateFormRefConfig(fieldIndex, { showSections });
  }

  updateFormRefFieldPrefix(fieldIndex: number, fieldPrefix: string): void {
    this.updateFormRefConfig(fieldIndex, { fieldPrefix: fieldPrefix || undefined });
  }

  getAvailableFormsForFormRef(): FormConfig[] {
    const currentId = this.currentConfig().id;
    return this.savedConfigs().filter((config) => config.id !== currentId);
  }

  // ============================================
  // File Upload Configuration Methods
  // ============================================

  updateFileUploadConfig(fieldIndex: number, updates: Partial<FileUploadConfig>): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.fileuploadConfig) return;

    const updatedField = {
      ...field,
      fileuploadConfig: { ...field.fileuploadConfig, ...updates },
    };
    this.updateField(fieldIndex, updatedField);
  }

  updateFileUploadMaxFiles(fieldIndex: number, maxFiles: number): void {
    this.updateFileUploadConfig(fieldIndex, { maxFiles: Number(maxFiles) || 1 });
  }

  updateFileUploadMinFiles(fieldIndex: number, minFiles: number): void {
    this.updateFileUploadConfig(fieldIndex, { minFiles: Number(minFiles) || 0 });
  }

  updateFileUploadMaxFileSize(fieldIndex: number, maxFileSizeMB: number): void {
    const sizeInBytes = (Number(maxFileSizeMB) || 10) * 1024 * 1024;
    this.updateFileUploadConfig(fieldIndex, { maxFileSize: sizeInBytes });
  }

  updateFileUploadAllowedExtensions(fieldIndex: number, extensions: string): void {
    const extArray = extensions
      .split(',')
      .map((e) => e.trim())
      .filter((e) => e.length > 0)
      .map((e) => (e.startsWith('.') ? e : '.' + e));
    this.updateFileUploadConfig(fieldIndex, {
      allowedExtensions: extArray.length > 0 ? extArray : undefined,
    });
  }

  updateFileUploadAllowedMimeTypes(fieldIndex: number, mimeTypes: string): void {
    const mimeArray = mimeTypes
      .split(',')
      .map((m) => m.trim())
      .filter((m) => m.length > 0);
    this.updateFileUploadConfig(fieldIndex, {
      allowedMimeTypes: mimeArray.length > 0 ? mimeArray : undefined,
    });
  }

  updateFileUploadTiming(fieldIndex: number, timing: FileUploadTiming): void {
    this.updateFileUploadConfig(fieldIndex, { uploadTiming: timing });
  }

  updateFileUploadAllowDragDrop(fieldIndex: number, allow: boolean): void {
    this.updateFileUploadConfig(fieldIndex, { allowDragDrop: allow });
  }

  updateFileUploadAllowDownload(fieldIndex: number, allow: boolean): void {
    this.updateFileUploadConfig(fieldIndex, { allowDownload: allow });
  }

  updateFileUploadShowFileSize(fieldIndex: number, show: boolean): void {
    this.updateFileUploadConfig(fieldIndex, { showFileSize: show });
  }

  updateFileUploadButtonLabel(fieldIndex: number, label: string): void {
    this.updateFileUploadConfig(fieldIndex, { uploadButtonLabel: label || undefined });
  }

  updateFileUploadDragDropLabel(fieldIndex: number, label: string): void {
    this.updateFileUploadConfig(fieldIndex, { dragDropLabel: label || undefined });
  }

  getFileUploadMaxFileSizeMB(field: FormFieldConfig): number {
    const bytes = field.fileuploadConfig?.maxFileSize ?? 10 * 1024 * 1024;
    return Math.round(bytes / (1024 * 1024));
  }

  getFileUploadAllowedExtensionsString(field: FormFieldConfig): string {
    return field.fileuploadConfig?.allowedExtensions?.join(', ') ?? '';
  }

  getFileUploadAllowedMimeTypesString(field: FormFieldConfig): string {
    return field.fileuploadConfig?.allowedMimeTypes?.join(', ') ?? '';
  }

  // ============================================
  // Autocomplete Config Methods
  // ============================================

  updateAutocompleteConfig(fieldIndex: number, updates: Partial<AutocompleteConfig>): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.autocompleteConfig) return;

    const updatedField = {
      ...field,
      autocompleteConfig: { ...field.autocompleteConfig, ...updates },
    };
    this.updateField(fieldIndex, updatedField);
  }

  updateAutocompleteFetchHandlerName(fieldIndex: number, fetchHandlerName: string): void {
    this.updateAutocompleteConfig(fieldIndex, { fetchHandlerName });
  }

  updateAutocompleteMinSearchLength(fieldIndex: number, minSearchLength: number): void {
    this.updateAutocompleteConfig(fieldIndex, { minSearchLength: Number(minSearchLength) || 2 });
  }

  updateAutocompleteDebounceMs(fieldIndex: number, debounceMs: number): void {
    this.updateAutocompleteConfig(fieldIndex, { debounceMs: Number(debounceMs) || 300 });
  }

  updateAutocompleteNoResultsMessage(fieldIndex: number, noResultsMessage: string): void {
    this.updateAutocompleteConfig(fieldIndex, { noResultsMessage: noResultsMessage || undefined });
  }

  updateAutocompleteLoadingMessage(fieldIndex: number, loadingMessage: string): void {
    this.updateAutocompleteConfig(fieldIndex, { loadingMessage: loadingMessage || undefined });
  }

  updateAutocompletePlaceholder(fieldIndex: number, placeholder: string): void {
    this.updateAutocompleteConfig(fieldIndex, { placeholder: placeholder || undefined });
  }

  // ============================================
  // JSON Preview
  // ============================================

  getFieldJson(field: FormFieldConfig): string {
    return JSON.stringify(field, null, 2);
  }
}
