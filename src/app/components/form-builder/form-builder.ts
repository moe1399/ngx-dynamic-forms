import { Component, output, signal, computed, input, effect, model, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  FormConfig,
  FormFieldConfig,
  FormSection,
  ValidationRule,
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
} from '../../models/form-config.interface';
import { FormBuilder as FormBuilderService } from '../../services/form-builder';

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
  selector: 'app-form-builder',
  imports: [CommonModule, FormsModule],
  templateUrl: './form-builder.html',
  styleUrl: './form-builder.scss',
})
export class FormBuilder {
  // Inject service using inject()
  private formBuilderService = inject(FormBuilderService);

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
  showJsonEditor = signal(false);
  jsonEditorMode = signal<'import' | 'export'>('import');
  jsonEditorContent = signal('');
  copyButtonText = signal('Copy to Clipboard');
  message = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  // Field types for dropdown
  fieldTypes: FieldType[] = ['text', 'email', 'number', 'textarea', 'date', 'daterange', 'select', 'radio', 'checkbox', 'table', 'info', 'datagrid', 'phone', 'formref'];

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

  // ============================================
  // Section Management Methods
  // ============================================

  /**
   * Add a new section
   */
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

  /**
   * Update a section
   */
  updateSection(id: string, updates: Partial<FormSection>): void {
    const config = { ...this.currentConfig() };
    config.sections = (config.sections || []).map((section) =>
      section.id === id ? { ...section, ...updates } : section
    );
    this.updateConfig(config);
  }

  /**
   * Remove a section (fields become ungrouped)
   */
  removeSection(id: string): void {
    const config = { ...this.currentConfig() };
    // Remove section
    config.sections = (config.sections || []).filter((s) => s.id !== id);
    // Clear sectionId from fields that were in this section
    config.fields = config.fields.map((field) =>
      field.sectionId === id ? { ...field, sectionId: undefined } : field
    );
    this.updateConfig(config);
    this.selectedSectionId.set(null);
  }

  /**
   * Move section up
   */
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

  /**
   * Move section down
   */
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

  /**
   * Select a section
   */
  selectSection(id: string | null): void {
    this.selectedSectionId.set(id);
    this.selectedFieldIndex.set(null);
  }

  /**
   * Get selected section
   */
  getSelectedSection(): FormSection | null {
    const id = this.selectedSectionId();
    return id ? (this.currentConfig().sections || []).find((s) => s.id === id) || null : null;
  }

  /**
   * Get sections sorted by order
   */
  getSortedSections(): FormSection[] {
    return [...(this.currentConfig().sections || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  /**
   * Update field section assignment
   */
  updateFieldSectionId(index: number, sectionId: string): void {
    const field = { ...this.currentConfig().fields[index], sectionId: sectionId || undefined };
    this.updateField(index, field);
  }

  /**
   * Helper methods for section property updates
   */
  updateSectionTitle(id: string, title: string): void {
    this.updateSection(id, { title });
  }

  updateSectionDescription(id: string, description: string): void {
    this.updateSection(id, { description: description || undefined });
  }

  updateSectionAnchorId(id: string, anchorId: string): void {
    this.updateSection(id, { anchorId: anchorId || undefined });
  }

  // ============================================
  // Select Options Management Methods
  // ============================================

  /**
   * Add a new option to a select field
   */
  addOption(fieldIndex: number): void {
    const field = { ...this.currentConfig().fields[fieldIndex] };
    field.options = [...(field.options || []), { label: 'New Option', value: '' }];
    this.updateField(fieldIndex, field);
  }

  /**
   * Update an option
   */
  updateOption(fieldIndex: number, optionIndex: number, updates: { label?: string; value?: string }): void {
    const field = { ...this.currentConfig().fields[fieldIndex] };
    field.options = [...(field.options || [])];
    field.options[optionIndex] = { ...field.options[optionIndex], ...updates };
    this.updateField(fieldIndex, field);
  }

  /**
   * Remove an option
   */
  removeOption(fieldIndex: number, optionIndex: number): void {
    const field = { ...this.currentConfig().fields[fieldIndex] };
    field.options = (field.options || []).filter((_, i) => i !== optionIndex);
    this.updateField(fieldIndex, field);
  }

  /**
   * Update option label
   */
  updateOptionLabel(fieldIndex: number, optionIndex: number, label: string): void {
    this.updateOption(fieldIndex, optionIndex, { label });
  }

  /**
   * Update option value
   */
  updateOptionValue(fieldIndex: number, optionIndex: number, value: string): void {
    this.updateOption(fieldIndex, optionIndex, { value });
  }

  // ============================================
  // Table Configuration Methods
  // ============================================

  /**
   * Update table config property
   */
  updateTableConfig(fieldIndex: number, updates: Partial<TableConfig>): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.tableConfig) return;

    const updatedField = {
      ...field,
      tableConfig: { ...field.tableConfig, ...updates },
    };
    this.updateField(fieldIndex, updatedField);
  }

  /**
   * Update row mode
   */
  updateTableRowMode(fieldIndex: number, rowMode: TableRowMode): void {
    this.updateTableConfig(fieldIndex, { rowMode });
  }

  /**
   * Update fixed row count
   */
  updateTableFixedRowCount(fieldIndex: number, count: number): void {
    this.updateTableConfig(fieldIndex, { fixedRowCount: Number(count) });
  }

  /**
   * Update min rows
   */
  updateTableMinRows(fieldIndex: number, minRows: number): void {
    this.updateTableConfig(fieldIndex, { minRows: Number(minRows) });
  }

  /**
   * Update max rows
   */
  updateTableMaxRows(fieldIndex: number, maxRows: number): void {
    this.updateTableConfig(fieldIndex, { maxRows: Number(maxRows) });
  }

  /**
   * Update add row label
   */
  updateTableAddRowLabel(fieldIndex: number, label: string): void {
    this.updateTableConfig(fieldIndex, { addRowLabel: label || undefined });
  }

  /**
   * Add a column to table
   */
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

  /**
   * Update a column
   */
  updateTableColumn(fieldIndex: number, columnIndex: number, updates: Partial<TableColumnConfig>): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.tableConfig) return;

    const columns = [...field.tableConfig.columns];
    columns[columnIndex] = { ...columns[columnIndex], ...updates };
    this.updateTableConfig(fieldIndex, { columns });
  }

  /**
   * Remove a column
   */
  removeTableColumn(fieldIndex: number, columnIndex: number): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.tableConfig || field.tableConfig.columns.length <= 1) return;

    const columns = field.tableConfig.columns.filter((_, i) => i !== columnIndex);
    this.updateTableConfig(fieldIndex, { columns });
  }

  /**
   * Move column up (left)
   */
  moveTableColumnUp(fieldIndex: number, columnIndex: number): void {
    if (columnIndex === 0) return;
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.tableConfig) return;

    const columns = [...field.tableConfig.columns];
    [columns[columnIndex - 1], columns[columnIndex]] = [columns[columnIndex], columns[columnIndex - 1]];
    this.updateTableConfig(fieldIndex, { columns });
  }

  /**
   * Move column down (right)
   */
  moveTableColumnDown(fieldIndex: number, columnIndex: number): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.tableConfig) return;
    if (columnIndex >= field.tableConfig.columns.length - 1) return;

    const columns = [...field.tableConfig.columns];
    [columns[columnIndex], columns[columnIndex + 1]] = [columns[columnIndex + 1], columns[columnIndex]];
    this.updateTableConfig(fieldIndex, { columns });
  }

  /**
   * Update column helper methods
   */
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

  /**
   * Add validation to column
   */
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

  /**
   * Update column validation
   */
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

  /**
   * Remove column validation
   */
  removeColumnValidation(fieldIndex: number, columnIndex: number, validationIndex: number): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.tableConfig) return;

    const column = field.tableConfig.columns[columnIndex];
    const validations = (column.validations || []).filter((_, i) => i !== validationIndex);
    this.updateTableColumn(fieldIndex, columnIndex, { validations });
  }

  /**
   * Update column validation type
   */
  updateColumnValidationType(
    fieldIndex: number,
    columnIndex: number,
    validationIndex: number,
    type: string
  ): void {
    this.updateColumnValidation(fieldIndex, columnIndex, validationIndex, { type: type as any });
  }

  /**
   * Update column validation value
   */
  updateColumnValidationValue(
    fieldIndex: number,
    columnIndex: number,
    validationIndex: number,
    value: any
  ): void {
    this.updateColumnValidation(fieldIndex, columnIndex, validationIndex, { value });
  }

  /**
   * Update column validation message
   */
  updateColumnValidationMessage(
    fieldIndex: number,
    columnIndex: number,
    validationIndex: number,
    message: string
  ): void {
    this.updateColumnValidation(fieldIndex, columnIndex, validationIndex, { message });
  }

  /**
   * Add option to select column
   */
  addColumnOption(fieldIndex: number, columnIndex: number): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.tableConfig) return;

    const column = field.tableConfig.columns[columnIndex];
    const options = [...(column.options || []), { label: 'New Option', value: '' }];
    this.updateTableColumn(fieldIndex, columnIndex, { options });
  }

  /**
   * Update column option
   */
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

  /**
   * Remove column option
   */
  removeColumnOption(fieldIndex: number, columnIndex: number, optionIndex: number): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.tableConfig) return;

    const column = field.tableConfig.columns[columnIndex];
    const options = (column.options || []).filter((_, i) => i !== optionIndex);
    this.updateTableColumn(fieldIndex, columnIndex, { options });
  }

  /**
   * Update column option label
   */
  updateColumnOptionLabel(fieldIndex: number, columnIndex: number, optionIndex: number, label: string): void {
    this.updateColumnOption(fieldIndex, columnIndex, optionIndex, { label });
  }

  /**
   * Update column option value
   */
  updateColumnOptionValue(fieldIndex: number, columnIndex: number, optionIndex: number, value: string): void {
    this.updateColumnOption(fieldIndex, columnIndex, optionIndex, { value });
  }

  // ============================================
  // DataGrid Configuration Methods
  // ============================================

  /**
   * Update datagrid config property
   */
  updateDataGridConfig(fieldIndex: number, updates: Partial<DataGridConfig>): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.datagridConfig) return;

    const updatedField = {
      ...field,
      datagridConfig: { ...field.datagridConfig, ...updates },
    };
    this.updateField(fieldIndex, updatedField);
  }

  /**
   * Update row label header
   */
  updateDataGridRowLabelHeader(fieldIndex: number, header: string): void {
    this.updateDataGridConfig(fieldIndex, { rowLabelHeader: header || undefined });
  }

  // ============================================
  // DataGrid Row Label Methods
  // ============================================

  /**
   * Add a row label to datagrid
   */
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

  /**
   * Update a row label
   */
  updateDataGridRowLabel(fieldIndex: number, rowIndex: number, updates: Partial<DataGridRowLabel>): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.datagridConfig) return;

    const rowLabels = [...field.datagridConfig.rowLabels];
    rowLabels[rowIndex] = { ...rowLabels[rowIndex], ...updates };
    this.updateDataGridConfig(fieldIndex, { rowLabels });
  }

  /**
   * Remove a row label
   */
  removeDataGridRowLabel(fieldIndex: number, rowIndex: number): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.datagridConfig || field.datagridConfig.rowLabels.length <= 1) return;

    const rowLabels = field.datagridConfig.rowLabels.filter((_, i) => i !== rowIndex);
    this.updateDataGridConfig(fieldIndex, { rowLabels });
  }

  /**
   * Move row label up
   */
  moveDataGridRowLabelUp(fieldIndex: number, rowIndex: number): void {
    if (rowIndex === 0) return;
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.datagridConfig) return;

    const rowLabels = [...field.datagridConfig.rowLabels];
    [rowLabels[rowIndex - 1], rowLabels[rowIndex]] = [rowLabels[rowIndex], rowLabels[rowIndex - 1]];
    this.updateDataGridConfig(fieldIndex, { rowLabels });
  }

  /**
   * Move row label down
   */
  moveDataGridRowLabelDown(fieldIndex: number, rowIndex: number): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.datagridConfig) return;
    if (rowIndex >= field.datagridConfig.rowLabels.length - 1) return;

    const rowLabels = [...field.datagridConfig.rowLabels];
    [rowLabels[rowIndex], rowLabels[rowIndex + 1]] = [rowLabels[rowIndex + 1], rowLabels[rowIndex]];
    this.updateDataGridConfig(fieldIndex, { rowLabels });
  }

  /**
   * Update row label id
   */
  updateDataGridRowLabelId(fieldIndex: number, rowIndex: number, id: string): void {
    this.updateDataGridRowLabel(fieldIndex, rowIndex, { id });
  }

  /**
   * Update row label text
   */
  updateDataGridRowLabelText(fieldIndex: number, rowIndex: number, label: string): void {
    this.updateDataGridRowLabel(fieldIndex, rowIndex, { label });
  }

  // ============================================
  // DataGrid Column Methods
  // ============================================

  /**
   * Add a column to datagrid
   */
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

  /**
   * Update a datagrid column
   */
  updateDataGridColumn(fieldIndex: number, columnIndex: number, updates: Partial<DataGridColumnConfig>): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.datagridConfig) return;

    const columns = [...field.datagridConfig.columns];
    columns[columnIndex] = { ...columns[columnIndex], ...updates };
    this.updateDataGridConfig(fieldIndex, { columns });
  }

  /**
   * Remove a datagrid column
   */
  removeDataGridColumn(fieldIndex: number, columnIndex: number): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.datagridConfig || field.datagridConfig.columns.length <= 1) return;

    const column = field.datagridConfig.columns[columnIndex];
    const columns = field.datagridConfig.columns.filter((_, i) => i !== columnIndex);

    // Also remove column from any column groups
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

  /**
   * Move datagrid column up (left)
   */
  moveDataGridColumnUp(fieldIndex: number, columnIndex: number): void {
    if (columnIndex === 0) return;
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.datagridConfig) return;

    const columns = [...field.datagridConfig.columns];
    [columns[columnIndex - 1], columns[columnIndex]] = [columns[columnIndex], columns[columnIndex - 1]];
    this.updateDataGridConfig(fieldIndex, { columns });
  }

  /**
   * Move datagrid column down (right)
   */
  moveDataGridColumnDown(fieldIndex: number, columnIndex: number): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.datagridConfig) return;
    if (columnIndex >= field.datagridConfig.columns.length - 1) return;

    const columns = [...field.datagridConfig.columns];
    [columns[columnIndex], columns[columnIndex + 1]] = [columns[columnIndex + 1], columns[columnIndex]];
    this.updateDataGridConfig(fieldIndex, { columns });
  }

  /**
   * Update datagrid column helper methods
   */
  updateDataGridColumnName(fieldIndex: number, columnIndex: number, name: string): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.datagridConfig) return;

    const oldName = field.datagridConfig.columns[columnIndex].name;

    // Update column name
    this.updateDataGridColumn(fieldIndex, columnIndex, { name });

    // Update any column groups that reference the old name
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

  // ============================================
  // DataGrid Column Validation Methods
  // ============================================

  /**
   * Add validation to datagrid column
   */
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

  /**
   * Update datagrid column validation
   */
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

  /**
   * Remove datagrid column validation
   */
  removeDataGridColumnValidation(fieldIndex: number, columnIndex: number, validationIndex: number): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.datagridConfig) return;

    const column = field.datagridConfig.columns[columnIndex];
    const validations = (column.validations || []).filter((_, i) => i !== validationIndex);
    this.updateDataGridColumn(fieldIndex, columnIndex, { validations });
  }

  /**
   * Update datagrid column validation type
   */
  updateDataGridColumnValidationType(
    fieldIndex: number,
    columnIndex: number,
    validationIndex: number,
    type: string
  ): void {
    this.updateDataGridColumnValidation(fieldIndex, columnIndex, validationIndex, { type: type as any });
  }

  /**
   * Update datagrid column validation value
   */
  updateDataGridColumnValidationValue(
    fieldIndex: number,
    columnIndex: number,
    validationIndex: number,
    value: any
  ): void {
    this.updateDataGridColumnValidation(fieldIndex, columnIndex, validationIndex, { value });
  }

  /**
   * Update datagrid column validation message
   */
  updateDataGridColumnValidationMessage(
    fieldIndex: number,
    columnIndex: number,
    validationIndex: number,
    message: string
  ): void {
    this.updateDataGridColumnValidation(fieldIndex, columnIndex, validationIndex, { message });
  }

  // ============================================
  // DataGrid Column Options Methods (for select type)
  // ============================================

  /**
   * Add option to datagrid select column
   */
  addDataGridColumnOption(fieldIndex: number, columnIndex: number): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.datagridConfig) return;

    const column = field.datagridConfig.columns[columnIndex];
    const options = [...(column.options || []), { label: 'New Option', value: '' }];
    this.updateDataGridColumn(fieldIndex, columnIndex, { options });
  }

  /**
   * Update datagrid column option
   */
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

  /**
   * Remove datagrid column option
   */
  removeDataGridColumnOption(fieldIndex: number, columnIndex: number, optionIndex: number): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.datagridConfig) return;

    const column = field.datagridConfig.columns[columnIndex];
    const options = (column.options || []).filter((_, i) => i !== optionIndex);
    this.updateDataGridColumn(fieldIndex, columnIndex, { options });
  }

  /**
   * Update datagrid column option label
   */
  updateDataGridColumnOptionLabel(
    fieldIndex: number,
    columnIndex: number,
    optionIndex: number,
    label: string
  ): void {
    this.updateDataGridColumnOption(fieldIndex, columnIndex, optionIndex, { label });
  }

  /**
   * Update datagrid column option value
   */
  updateDataGridColumnOptionValue(
    fieldIndex: number,
    columnIndex: number,
    optionIndex: number,
    value: string
  ): void {
    this.updateDataGridColumnOption(fieldIndex, columnIndex, optionIndex, { value });
  }

  // ============================================
  // DataGrid Column Group Methods
  // ============================================

  /**
   * Add a column group to datagrid
   */
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

  /**
   * Update a column group
   */
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

  /**
   * Remove a column group
   */
  removeDataGridColumnGroup(fieldIndex: number, groupIndex: number): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.datagridConfig?.columnGroups) return;

    const columnGroups = field.datagridConfig.columnGroups.filter((_, i) => i !== groupIndex);
    this.updateDataGridConfig(fieldIndex, { columnGroups: columnGroups.length > 0 ? columnGroups : undefined });
  }

  /**
   * Update column group id
   */
  updateDataGridColumnGroupId(fieldIndex: number, groupIndex: number, id: string): void {
    this.updateDataGridColumnGroup(fieldIndex, groupIndex, { id });
  }

  /**
   * Update column group label
   */
  updateDataGridColumnGroupLabel(fieldIndex: number, groupIndex: number, label: string): void {
    this.updateDataGridColumnGroup(fieldIndex, groupIndex, { label });
  }

  /**
   * Toggle a column in a group
   */
  toggleDataGridColumnInGroup(fieldIndex: number, groupIndex: number, columnName: string): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.datagridConfig?.columnGroups) return;

    const group = field.datagridConfig.columnGroups[groupIndex];
    let columnIds: string[];

    if (group.columnIds.includes(columnName)) {
      // Remove from this group
      columnIds = group.columnIds.filter((id) => id !== columnName);
    } else {
      // Remove from any other group first
      const columnGroups = field.datagridConfig.columnGroups.map((g, i) => {
        if (i === groupIndex) return g;
        return {
          ...g,
          columnIds: g.columnIds.filter((id) => id !== columnName),
        };
      });
      this.updateDataGridConfig(fieldIndex, { columnGroups });

      // Add to this group
      columnIds = [...group.columnIds, columnName];
    }

    this.updateDataGridColumnGroup(fieldIndex, groupIndex, { columnIds });
  }

  /**
   * Check if column is in a group
   */
  isDataGridColumnInGroup(fieldIndex: number, groupIndex: number, columnName: string): boolean {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.datagridConfig?.columnGroups) return false;

    const group = field.datagridConfig.columnGroups[groupIndex];
    return group?.columnIds.includes(columnName) || false;
  }

  /**
   * Get the group a column belongs to (if any)
   */
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

  // ============================================
  // DataGrid Totals Configuration Methods
  // ============================================

  /**
   * Update totals config
   */
  updateDataGridTotalsConfig(fieldIndex: number, updates: Partial<DataGridConfig['totals']>): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.datagridConfig) return;

    const totals = { ...field.datagridConfig.totals, ...updates };
    this.updateDataGridConfig(fieldIndex, { totals });
  }

  /**
   * Toggle show row totals
   */
  updateDataGridShowRowTotals(fieldIndex: number, show: boolean): void {
    this.updateDataGridTotalsConfig(fieldIndex, { showRowTotals: show });
  }

  /**
   * Update row total label
   */
  updateDataGridRowTotalLabel(fieldIndex: number, label: string): void {
    this.updateDataGridTotalsConfig(fieldIndex, { rowTotalLabel: label || undefined });
  }

  /**
   * Toggle show column totals
   */
  updateDataGridShowColumnTotals(fieldIndex: number, show: boolean): void {
    this.updateDataGridTotalsConfig(fieldIndex, { showColumnTotals: show });
  }

  /**
   * Update column total label
   */
  updateDataGridColumnTotalLabel(fieldIndex: number, label: string): void {
    this.updateDataGridTotalsConfig(fieldIndex, { columnTotalLabel: label || undefined });
  }

  // ============================================
  // Phone Configuration Methods
  // ============================================

  /**
   * Update phone config property
   */
  updatePhoneConfig(fieldIndex: number, updates: Partial<PhoneConfig>): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.phoneConfig) return;

    const updatedField = {
      ...field,
      phoneConfig: { ...field.phoneConfig, ...updates },
    };
    this.updateField(fieldIndex, updatedField);
  }

  /**
   * Update default country code
   */
  updatePhoneDefaultCountryCode(fieldIndex: number, code: string): void {
    this.updatePhoneConfig(fieldIndex, { defaultCountryCode: code || undefined });
  }

  /**
   * Add a country code to phone config
   */
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

  /**
   * Update a country code
   */
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

  /**
   * Remove a country code
   */
  removePhoneCountryCode(fieldIndex: number, countryIndex: number): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.phoneConfig || field.phoneConfig.countryCodes.length <= 1) return;

    const countryCodes = field.phoneConfig.countryCodes.filter((_, i) => i !== countryIndex);
    this.updatePhoneConfig(fieldIndex, { countryCodes });
  }

  /**
   * Move country code up
   */
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

  /**
   * Move country code down
   */
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

  /**
   * Update country code code
   */
  updatePhoneCountryCodeCode(fieldIndex: number, countryIndex: number, code: string): void {
    this.updatePhoneCountryCode(fieldIndex, countryIndex, { code });
  }

  /**
   * Update country code country name
   */
  updatePhoneCountryCodeCountry(fieldIndex: number, countryIndex: number, country: string): void {
    this.updatePhoneCountryCode(fieldIndex, countryIndex, { country });
  }

  /**
   * Update country code flag
   */
  updatePhoneCountryCodeFlag(fieldIndex: number, countryIndex: number, flag: string): void {
    this.updatePhoneCountryCode(fieldIndex, countryIndex, { flag: flag || undefined });
  }

  // ============================================
  // Date Range Field Methods
  // ============================================

  /**
   * Update daterange config
   */
  updateDateRangeConfig(fieldIndex: number, updates: Partial<DateRangeConfig>): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.daterangeConfig) return;

    const updatedField = {
      ...field,
      daterangeConfig: { ...field.daterangeConfig, ...updates },
    };
    this.updateField(fieldIndex, updatedField);
  }

  /**
   * Update daterange from label
   */
  updateDateRangeFromLabel(fieldIndex: number, fromLabel: string): void {
    this.updateDateRangeConfig(fieldIndex, { fromLabel: fromLabel || undefined });
  }

  /**
   * Update daterange to label
   */
  updateDateRangeToLabel(fieldIndex: number, toLabel: string): void {
    this.updateDateRangeConfig(fieldIndex, { toLabel: toLabel || undefined });
  }

  /**
   * Update daterange separator text
   */
  updateDateRangeSeparator(fieldIndex: number, separatorText: string): void {
    this.updateDateRangeConfig(fieldIndex, { separatorText: separatorText || undefined });
  }

  /**
   * Update daterange toDateOptional
   */
  updateDateRangeToDateOptional(fieldIndex: number, toDateOptional: boolean): void {
    this.updateDateRangeConfig(fieldIndex, { toDateOptional });
  }

  // ============================================
  // Form Reference Field Methods
  // ============================================

  /**
   * Update formref config
   */
  updateFormRefConfig(fieldIndex: number, updates: Partial<FormRefConfig>): void {
    const field = this.currentConfig().fields[fieldIndex];
    if (!field.formrefConfig) return;

    const updatedField = {
      ...field,
      formrefConfig: { ...field.formrefConfig, ...updates },
    };
    this.updateField(fieldIndex, updatedField);
  }

  /**
   * Update formref form ID
   */
  updateFormRefFormId(fieldIndex: number, formId: string): void {
    this.updateFormRefConfig(fieldIndex, { formId });
  }

  /**
   * Update formref show sections
   */
  updateFormRefShowSections(fieldIndex: number, showSections: boolean): void {
    this.updateFormRefConfig(fieldIndex, { showSections });
  }

  /**
   * Update formref field prefix
   */
  updateFormRefFieldPrefix(fieldIndex: number, fieldPrefix: string): void {
    this.updateFormRefConfig(fieldIndex, { fieldPrefix: fieldPrefix || undefined });
  }

  /**
   * Get available forms for formref selection (excluding current form to avoid recursion)
   */
  getAvailableFormsForFormRef(): FormConfig[] {
    const currentId = this.currentConfig().id;
    return this.savedConfigs().filter((config) => config.id !== currentId);
  }

  // ============================================
  // JSON Preview
  // ============================================

  /**
   * Get field configuration as formatted JSON string
   */
  getFieldJson(field: FormFieldConfig): string {
    return JSON.stringify(field, null, 2);
  }
}
