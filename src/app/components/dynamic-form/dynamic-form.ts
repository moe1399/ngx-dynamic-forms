import { Component, input, output, OnInit, OnDestroy, effect } from '@angular/core';
import { FormGroup, FormControl, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import {
  FormConfig,
  FormFieldConfig,
  FormSection,
  ValidationRule,
  FieldError,
  TableColumnConfig,
} from '../../models/form-config.interface';
import { FormStorage } from '../../services/form-storage';

@Component({
  selector: 'app-dynamic-form',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './dynamic-form.html',
  styleUrl: './dynamic-form.scss',
})
export class DynamicForm implements OnInit, OnDestroy {
  // Inputs using signals
  config = input.required<FormConfig>();

  // Outputs
  formSubmit = output<{ [key: string]: any }>();
  formSave = output<{ [key: string]: any }>();
  validationErrors = output<FieldError[]>();

  // Component state
  form: FormGroup = new FormGroup({});
  errors: FieldError[] = [];
  activePopover: string | null = null;
  activeCellTooltip: { field: string; row: number; col: string } | null = null;
  private autoSaveTimer?: number;

  constructor(private formStorage: FormStorage) {
    // React to config changes
    effect(() => {
      const currentConfig = this.config();
      if (currentConfig) {
        this.initializeForm();
      }
    });
  }

  ngOnInit(): void {
    this.initializeForm();
    this.loadSavedForm();
    this.setupAutoSave();
  }

  ngOnDestroy(): void {
    this.clearAutoSave();
  }

  /**
   * Initialize the form based on configuration
   */
  private initializeForm(): void {
    const group: { [key: string]: FormControl | FormArray } = {};
    const currentConfig = this.config();

    // Sort fields by order if specified
    const sortedFields = [...currentConfig.fields].sort((a, b) => {
      return (a.order ?? 0) - (b.order ?? 0);
    });

    sortedFields.forEach((field) => {
      if (field.type === 'table' && field.tableConfig) {
        // Create FormArray for table rows
        group[field.name] = this.createTableFormArray(field);
      } else {
        const validators = this.buildValidators(field.validations || []);
        // Initialize checkbox fields with options as arrays
        const defaultValue =
          field.type === 'checkbox' && field.options?.length ? field.value ?? [] : field.value ?? '';
        group[field.name] = new FormControl(
          { value: defaultValue, disabled: field.disabled ?? false },
          validators
        );
      }
    });

    this.form = new FormGroup(group);

    // Listen to value changes for validation
    this.form.valueChanges.subscribe(() => {
      this.updateErrors();
    });
  }

  /**
   * Create FormArray for a table field
   */
  private createTableFormArray(field: FormFieldConfig): FormArray {
    const tableConfig = field.tableConfig!;
    const existingValue = (field.value as any[]) || [];

    let rowCount: number;
    if (tableConfig.rowMode === 'fixed') {
      rowCount = tableConfig.fixedRowCount ?? 3;
    } else {
      rowCount = Math.max(existingValue.length, tableConfig.minRows ?? 0);
      if (rowCount === 0) rowCount = 1; // Start with at least one row in dynamic mode
    }

    const rows: FormGroup[] = [];
    for (let i = 0; i < rowCount; i++) {
      const rowData = existingValue[i] || {};
      rows.push(this.createTableRowFormGroup(field, rowData));
    }

    return new FormArray(rows);
  }

  /**
   * Create FormGroup for a single table row
   */
  private createTableRowFormGroup(field: FormFieldConfig, rowData: any = {}): FormGroup {
    const tableConfig = field.tableConfig!;
    const controls: { [key: string]: FormControl } = {};

    tableConfig.columns.forEach((column) => {
      const validators = this.buildValidators(column.validations || []);
      controls[column.name] = new FormControl(
        { value: rowData[column.name] ?? '', disabled: field.disabled ?? false },
        validators
      );
    });

    return new FormGroup(controls);
  }

  /**
   * Build Angular validators from validation rules
   */
  private buildValidators(rules: ValidationRule[]) {
    const validators: any[] = [];

    rules.forEach((rule) => {
      switch (rule.type) {
        case 'required':
          validators.push(Validators.required);
          break;
        case 'email':
          validators.push(Validators.email);
          break;
        case 'minLength':
          validators.push(Validators.minLength(rule.value));
          break;
        case 'maxLength':
          validators.push(Validators.maxLength(rule.value));
          break;
        case 'min':
          validators.push(Validators.min(rule.value));
          break;
        case 'max':
          validators.push(Validators.max(rule.value));
          break;
        case 'pattern':
          validators.push(Validators.pattern(rule.value));
          break;
        case 'custom':
          if (rule.validator) {
            validators.push((control: FormControl) => {
              return rule.validator!(control.value) ? null : { custom: true };
            });
          }
          break;
      }
    });

    return validators;
  }

  /**
   * Update validation errors
   */
  private updateErrors(): void {
    const errors: FieldError[] = [];
    const currentConfig = this.config();

    currentConfig.fields.forEach((field) => {
      const control = this.form.get(field.name);
      if (control?.invalid && control.touched) {
        const fieldErrors = this.getFieldErrors(field, control);
        errors.push(...fieldErrors);
      }
    });

    this.errors = errors;
    this.validationErrors.emit(errors);
  }

  /**
   * Get error messages for a field
   */
  private getFieldErrors(field: FormFieldConfig, control: any): FieldError[] {
    const errors: FieldError[] = [];
    const validations = field.validations || [];

    validations.forEach((validation) => {
      const errorKey = validation.type;
      if (control.hasError(errorKey) || control.hasError('custom')) {
        errors.push({
          field: field.name,
          message: validation.message,
        });
      }
    });

    return errors;
  }

  /**
   * Load saved form data from local storage
   */
  private loadSavedForm(): void {
    const currentConfig = this.config();
    const saved = this.formStorage.loadForm(currentConfig.id);
    if (saved && !saved.isComplete) {
      this.form.patchValue(saved.data);
    }
  }

  /**
   * Setup auto-save if enabled
   */
  private setupAutoSave(): void {
    const currentConfig = this.config();
    if (currentConfig.autoSave) {
      const interval = currentConfig.autoSaveInterval || 5000;
      this.autoSaveTimer = window.setInterval(() => {
        this.saveForm();
      }, interval);
    }
  }

  /**
   * Clear auto-save timer
   */
  private clearAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }
  }

  /**
   * Save form to local storage
   */
  saveForm(): void {
    const currentConfig = this.config();
    this.formStorage.saveForm(currentConfig.id, this.form.value, false);
    this.formSave.emit(this.form.value);
  }

  /**
   * Submit form
   */
  submitForm(): void {
    // Mark all fields as touched to show validation errors
    Object.keys(this.form.controls).forEach((key) => {
      this.form.get(key)?.markAsTouched();
    });

    // Mark table cells as touched
    this.markTableFieldsTouched();

    this.updateErrors();

    // Check regular form validity AND table validity
    let isValid = true;
    const currentConfig = this.config();

    // Check table fields (empty rows are OK)
    for (const field of currentConfig.fields) {
      if (field.type === 'table' && !this.isTableValid(field.name)) {
        isValid = false;
        break;
      } else if (field.type !== 'table') {
        const control = this.form.get(field.name);
        if (control?.invalid) {
          isValid = false;
          break;
        }
      }
    }

    if (isValid) {
      // Filter out empty rows from table data before submitting
      const formValue = this.getCleanedFormValue();
      this.formStorage.saveForm(currentConfig.id, formValue, true);
      this.formSubmit.emit(formValue);
    }
  }

  /**
   * Get field by name
   */
  getField(name: string): FormFieldConfig | undefined {
    const currentConfig = this.config();
    return currentConfig.fields.find((f) => f.name === name);
  }

  /**
   * Get sorted fields
   */
  getSortedFields(): FormFieldConfig[] {
    const currentConfig = this.config();
    return [...currentConfig.fields].sort((a, b) => {
      return (a.order ?? 0) - (b.order ?? 0);
    });
  }

  /**
   * Get fields grouped by inlineGroup
   * Returns array of field arrays - each inner array is a row
   */
  getGroupedFields(): FormFieldConfig[][] {
    const sortedFields = this.getSortedFields();
    const groups: FormFieldConfig[][] = [];
    let currentGroup: FormFieldConfig[] = [];
    let currentGroupName: string | undefined = undefined;

    sortedFields.forEach((field) => {
      if (field.inlineGroup) {
        // Field has an inline group
        if (field.inlineGroup === currentGroupName) {
          // Same group, add to current
          currentGroup.push(field);
        } else {
          // New group, save current and start new
          if (currentGroup.length > 0) {
            groups.push(currentGroup);
          }
          currentGroup = [field];
          currentGroupName = field.inlineGroup;
        }
      } else {
        // No inline group - standalone field
        if (currentGroup.length > 0) {
          groups.push(currentGroup);
          currentGroup = [];
          currentGroupName = undefined;
        }
        groups.push([field]);
      }
    });

    // Don't forget the last group
    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    return groups;
  }

  /**
   * Check if a group has multiple fields (is inline)
   */
  isInlineGroup(group: FormFieldConfig[]): boolean {
    return group.length > 1;
  }

  /**
   * Get sorted sections
   */
  getSections(): FormSection[] {
    const currentConfig = this.config();
    return [...(currentConfig.sections || [])].sort((a, b) => {
      return (a.order ?? 0) - (b.order ?? 0);
    });
  }

  /**
   * Check if form has any sections defined
   */
  hasSections(): boolean {
    const currentConfig = this.config();
    return (currentConfig.sections?.length ?? 0) > 0;
  }

  /**
   * Get fields for a specific section, grouped by inlineGroup
   */
  getFieldsForSection(sectionId: string): FormFieldConfig[][] {
    const sortedFields = this.getSortedFields().filter((f) => f.sectionId === sectionId);
    return this.groupFieldsByInline(sortedFields);
  }

  /**
   * Get ungrouped fields (not assigned to any section), grouped by inlineGroup
   */
  getUngroupedFields(): FormFieldConfig[][] {
    const sortedFields = this.getSortedFields().filter((f) => !f.sectionId);
    return this.groupFieldsByInline(sortedFields);
  }

  /**
   * Group an array of fields by their inlineGroup property
   */
  private groupFieldsByInline(fields: FormFieldConfig[]): FormFieldConfig[][] {
    const groups: FormFieldConfig[][] = [];
    let currentGroup: FormFieldConfig[] = [];
    let currentGroupName: string | undefined = undefined;

    fields.forEach((field) => {
      if (field.inlineGroup) {
        if (field.inlineGroup === currentGroupName) {
          currentGroup.push(field);
        } else {
          if (currentGroup.length > 0) {
            groups.push(currentGroup);
          }
          currentGroup = [field];
          currentGroupName = field.inlineGroup;
        }
      } else {
        if (currentGroup.length > 0) {
          groups.push(currentGroup);
          currentGroup = [];
          currentGroupName = undefined;
        }
        groups.push([field]);
      }
    });

    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    return groups;
  }

  /**
   * Generate anchor ID from title (URL-friendly)
   */
  generateAnchorId(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  /**
   * Get anchor ID for a section (custom or auto-generated)
   */
  getSectionAnchorId(section: FormSection): string {
    return section.anchorId || this.generateAnchorId(section.title);
  }

  /**
   * Check if form is ready (has controls)
   */
  isFormReady(): boolean {
    return Object.keys(this.form.controls).length > 0;
  }

  /**
   * Check if field has error
   */
  hasError(fieldName: string): boolean {
    const control = this.form.get(fieldName);
    return !!(control?.invalid && control?.touched);
  }

  /**
   * Get error message for field
   */
  getErrorMessage(fieldName: string): string {
    const fieldError = this.errors.find((e) => e.field === fieldName);
    return fieldError?.message || '';
  }

  /**
   * Check if field is required
   */
  isFieldRequired(field: FormFieldConfig): boolean {
    return field.validations?.some((v) => v.type === 'required') ?? false;
  }

  /**
   * Toggle description popover for a field
   */
  togglePopover(fieldName: string): void {
    if (this.activePopover === fieldName) {
      this.activePopover = null;
    } else {
      this.activePopover = fieldName;
    }
  }

  /**
   * Close popover when clicking outside
   */
  closePopover(): void {
    this.activePopover = null;
  }

  /**
   * Check if a checkbox option is selected (for checkbox groups)
   */
  isCheckboxOptionSelected(fieldName: string, optionValue: any): boolean {
    const control = this.form.get(fieldName);
    const value = control?.value;
    if (Array.isArray(value)) {
      return value.includes(optionValue);
    }
    return false;
  }

  /**
   * Toggle a checkbox option (for checkbox groups with multiple options)
   */
  toggleCheckboxOption(fieldName: string, optionValue: any): void {
    const control = this.form.get(fieldName);
    if (!control) return;

    let currentValue = control.value;
    if (!Array.isArray(currentValue)) {
      currentValue = [];
    }

    const index = currentValue.indexOf(optionValue);
    if (index === -1) {
      // Add value
      currentValue = [...currentValue, optionValue];
    } else {
      // Remove value
      currentValue = currentValue.filter((v: any) => v !== optionValue);
    }

    control.setValue(currentValue);
    control.markAsTouched();
    control.markAsDirty();
  }

  // ============================================
  // Table Field Methods
  // ============================================

  /**
   * Get FormArray for a table field
   */
  getTableFormArray(fieldName: string): FormArray | null {
    const control = this.form.get(fieldName);
    return control instanceof FormArray ? control : null;
  }

  /**
   * Get row FormGroup from table
   */
  getTableRowFormGroup(fieldName: string, rowIndex: number): FormGroup | null {
    const formArray = this.getTableFormArray(fieldName);
    if (formArray && rowIndex < formArray.length) {
      return formArray.at(rowIndex) as FormGroup;
    }
    return null;
  }

  /**
   * Add row to dynamic table
   */
  addTableRow(field: FormFieldConfig): void {
    const tableConfig = field.tableConfig;
    if (!tableConfig || tableConfig.rowMode !== 'dynamic') return;

    const formArray = this.getTableFormArray(field.name);
    if (!formArray) return;

    const maxRows = tableConfig.maxRows ?? 10;
    if (formArray.length >= maxRows) return;

    formArray.push(this.createTableRowFormGroup(field));
  }

  /**
   * Remove row from dynamic table
   */
  removeTableRow(field: FormFieldConfig, rowIndex: number): void {
    const tableConfig = field.tableConfig;
    if (!tableConfig || tableConfig.rowMode !== 'dynamic') return;

    const formArray = this.getTableFormArray(field.name);
    if (!formArray) return;

    const minRows = tableConfig.minRows ?? 0;
    if (formArray.length <= minRows) return;

    formArray.removeAt(rowIndex);
  }

  /**
   * Check if a row can be added (for dynamic tables)
   */
  canAddTableRow(field: FormFieldConfig): boolean {
    const tableConfig = field.tableConfig;
    if (!tableConfig || tableConfig.rowMode !== 'dynamic') return false;

    const formArray = this.getTableFormArray(field.name);
    if (!formArray) return false;

    const maxRows = tableConfig.maxRows ?? 10;
    return formArray.length < maxRows;
  }

  /**
   * Check if a row can be removed (for dynamic tables)
   */
  canRemoveTableRow(field: FormFieldConfig): boolean {
    const tableConfig = field.tableConfig;
    if (!tableConfig || tableConfig.rowMode !== 'dynamic') return false;

    const formArray = this.getTableFormArray(field.name);
    if (!formArray) return false;

    const minRows = tableConfig.minRows ?? 0;
    return formArray.length > minRows;
  }

  /**
   * Check if a table row is empty (all cells empty/falsy)
   */
  isTableRowEmpty(fieldName: string, rowIndex: number): boolean {
    const rowGroup = this.getTableRowFormGroup(fieldName, rowIndex);
    if (!rowGroup) return true;

    return Object.values(rowGroup.controls).every((control) => {
      const value = control.value;
      return value === '' || value === null || value === undefined;
    });
  }

  /**
   * Check if table cell has error
   */
  hasTableCellError(fieldName: string, rowIndex: number, columnName: string): boolean {
    const rowGroup = this.getTableRowFormGroup(fieldName, rowIndex);
    if (!rowGroup) return false;

    const control = rowGroup.get(columnName);
    if (!control) return false;

    // Skip validation for empty rows
    if (this.isTableRowEmpty(fieldName, rowIndex)) return false;

    return control.invalid && control.touched;
  }

  /**
   * Get table cell error message
   */
  getTableCellErrorMessage(field: FormFieldConfig, rowIndex: number, columnName: string): string {
    const tableConfig = field.tableConfig;
    if (!tableConfig) return '';

    const column = tableConfig.columns.find((c) => c.name === columnName);
    if (!column) return '';

    const rowGroup = this.getTableRowFormGroup(field.name, rowIndex);
    if (!rowGroup) return '';

    const control = rowGroup.get(columnName);
    if (!control || !control.errors) return '';

    // Find matching validation message
    const validations = column.validations || [];
    for (const validation of validations) {
      const errorKey = validation.type;
      if (control.hasError(errorKey) || control.hasError('custom')) {
        return validation.message;
      }
    }

    return 'Invalid value';
  }

  /**
   * Show cell error tooltip
   */
  showCellTooltip(fieldName: string, rowIndex: number, columnName: string): void {
    this.activeCellTooltip = { field: fieldName, row: rowIndex, col: columnName };
  }

  /**
   * Hide cell error tooltip
   */
  hideCellTooltip(): void {
    this.activeCellTooltip = null;
  }

  /**
   * Check if cell tooltip is active
   */
  isCellTooltipActive(fieldName: string, rowIndex: number, columnName: string): boolean {
    return (
      this.activeCellTooltip?.field === fieldName &&
      this.activeCellTooltip?.row === rowIndex &&
      this.activeCellTooltip?.col === columnName
    );
  }

  /**
   * Mark all table cells as touched (for form submission)
   */
  private markTableFieldsTouched(): void {
    const currentConfig = this.config();
    currentConfig.fields.forEach((field) => {
      if (field.type === 'table') {
        const formArray = this.getTableFormArray(field.name);
        if (formArray) {
          formArray.controls.forEach((rowGroup) => {
            if (rowGroup instanceof FormGroup) {
              Object.keys(rowGroup.controls).forEach((key) => {
                rowGroup.get(key)?.markAsTouched();
              });
            }
          });
        }
      }
    });
  }

  /**
   * Check if table has any non-empty invalid rows
   */
  isTableValid(fieldName: string): boolean {
    const field = this.getField(fieldName);
    if (!field || field.type !== 'table') return true;

    const formArray = this.getTableFormArray(fieldName);
    if (!formArray) return true;

    for (let i = 0; i < formArray.length; i++) {
      // Skip empty rows
      if (this.isTableRowEmpty(fieldName, i)) continue;

      const rowGroup = formArray.at(i) as FormGroup;
      if (rowGroup.invalid) return false;
    }

    return true;
  }

  /**
   * Get form value with empty table rows filtered out
   */
  private getCleanedFormValue(): { [key: string]: any } {
    const value = { ...this.form.value };
    const currentConfig = this.config();

    currentConfig.fields.forEach((field) => {
      if (field.type === 'table' && Array.isArray(value[field.name])) {
        value[field.name] = value[field.name].filter((row: any) => {
          return Object.values(row).some((v) => v !== '' && v !== null && v !== undefined);
        });
      }
    });

    return value;
  }

  /**
   * Check if a column has required validation
   */
  hasColumnRequiredValidation(column: TableColumnConfig): boolean {
    return column.validations?.some((v) => v.type === 'required') ?? false;
  }
}
