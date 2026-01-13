import { Component, input, output, OnInit, OnDestroy, effect, inject, ChangeDetectorRef, signal, booleanAttribute } from '@angular/core';
import { FormGroup, FormControl, FormArray, Validators, ReactiveFormsModule, ValidatorFn, AbstractControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subject, fromEvent, merge } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil, filter, switchMap } from 'rxjs/operators';
import {
  FormConfig,
  FormFieldConfig,
  FormSection,
  WizardPage,
  WizardConfig,
  ValidationRule,
  ValidationCondition,
  FieldError,
  TableConfig,
  TableColumnConfig,
  DataGridColumnConfig,
  DataGridColumnGroup,
  AsyncValidationConfig,
  FileUploadHandler,
  FileDownloadHandler,
  FileUploadState,
  FileUploadValue,
  FileUploadConfig,
  AutocompleteOption,
  AutocompleteConfig,
} from '../../models/form-config.interface';
import { FormStorage } from '../../services/form-storage.service';
import { FormBuilderService } from '../../services/form-builder.service';
import { ValidatorRegistry, AsyncValidatorRegistry, AutocompleteFetchRegistry } from '../../services/validator-registry.service';

@Component({
  selector: 'ngx-dynamic-form',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './dynamic-form.html',
  styleUrl: './dynamic-form.scss',
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(focusout)': 'onFocusOut($event)',
  },
})
export class DynamicForm implements OnInit, OnDestroy {
  // Inject services
  private formStorage = inject(FormStorage);
  private formBuilderService = inject(FormBuilderService);
  private validatorRegistry = inject(ValidatorRegistry);
  private asyncValidatorRegistry = inject(AsyncValidatorRegistry);
  private autocompleteFetchRegistry = inject(AutocompleteFetchRegistry);
  private cdr = inject(ChangeDetectorRef);

  // Inputs using signals
  config = input.required<FormConfig>();
  fileUploadHandler = input<FileUploadHandler | undefined>(undefined);
  fileDownloadHandler = input<FileDownloadHandler | undefined>(undefined);

  /** Read-only state input - form is viewable but not editable */
  readOnlyInput = input(false, { alias: 'readOnly', transform: booleanAttribute });

  /** Disabled state input - disables entire form including all controls */
  disabledInput = input(false, { alias: 'disabled', transform: booleanAttribute });

  /** Internal override for deprecated setReadOnly method */
  private readOnlyOverride = signal<boolean | null>(null);

  // Outputs
  formSubmit = output<{ [key: string]: any }>();
  formSave = output<{ [key: string]: any }>();
  validationErrors = output<FieldError[]>();
  valueChanges = output<{ [key: string]: any }>();

  // Wizard outputs
  wizardPageChange = output<{ previousPage: number; currentPage: number }>();
  wizardComplete = output<void>();

  // Component state
  form: FormGroup = new FormGroup({});
  errors: FieldError[] = [];

  // File upload state
  // Map of fieldName -> Map of fileId -> FileUploadState
  private uploadStates = new Map<string, Map<string, FileUploadState>>();
  // Map of fieldName -> AbortController for cancellable uploads
  private uploadAbortControllers = new Map<string, Map<string, AbortController>>();
  // Signal tracking which fields have active drag-over
  dragActiveFields = signal<Set<string>>(new Set());

  // Autocomplete state
  private autocompleteSearchText = signal<Map<string, string>>(new Map());
  private autocompleteOptions = signal<Map<string, AutocompleteOption[]>>(new Map());
  private autocompleteLoading = signal<Set<string>>(new Set());
  private autocompleteDropdownOpen = signal<Set<string>>(new Set());
  private autocompleteHighlightedIndex = signal<Map<string, number>>(new Map());
  private autocompleteSearchSubjects = new Map<string, Subject<string>>();

  // Visibility tracking for conditional fields and sections
  private visibleFields = signal<Set<string>>(new Set());
  private visibleSections = signal<Set<string>>(new Set());

  // Wizard mode state
  private wizardCurrentPage = signal<number>(0);
  private wizardVisitedPages = signal<Set<number>>(new Set([0]));
  private wizardPageErrors = signal<Map<number, FieldError[]>>(new Map());

  // Async validation state
  private validatingFields = new Set<string>();
  private externalErrors = new Map<string, string>();
  private asyncValidationSubjects = new Map<string, Subject<any>>();
  private destroy$ = new Subject<void>();

  /**
   * Get current form value (cleaned, with empty table rows filtered out)
   */
  get value(): { [key: string]: any } {
    return this.getCleanedFormValue();
  }

  /**
   * Get current form validity state
   * Returns false if form is invalid, has external errors, or is validating
   */
  get valid(): boolean {
    if (this.validating) return false;
    if (this.externalErrors.size > 0) return false;
    return this.isFormValidForSubmit();
  }

  /**
   * Get current form touched state
   */
  get touched(): boolean {
    return this.form.touched;
  }

  /**
   * Get current form dirty state
   */
  get dirty(): boolean {
    return this.form.dirty;
  }

  /**
   * Check if any field is currently being async validated
   */
  get validating(): boolean {
    return this.validatingFields.size > 0;
  }

  /**
   * Check if the form is currently disabled (Angular form state)
   */
  get disabled(): boolean {
    return this.form.disabled;
  }

  /**
   * Check if the form is currently in read-only mode
   * Combines the input value with any imperative override from deprecated setReadOnly()
   */
  get readOnly(): boolean {
    const override = this.readOnlyOverride();
    return override !== null ? override : this.readOnlyInput();
  }

  /**
   * Set the form to read-only mode
   * In read-only mode, the form values are visible but cannot be edited
   * Unlike disabled, read-only fields are still submitted and look normal
   * @deprecated Use [readOnly] input binding instead. Will be removed in next major version.
   */
  setReadOnly(value: boolean): void {
    this.readOnlyOverride.set(value);
    this.cdr.markForCheck();
  }

  // ============================================
  // Wizard Mode Getters
  // ============================================

  /**
   * Check if form is in wizard mode
   */
  get isWizardMode(): boolean {
    return !!this.config().wizard;
  }

  /**
   * Get current wizard page index (0-based)
   */
  get currentPage(): number {
    return this.wizardCurrentPage();
  }

  /**
   * Get total number of visible wizard pages
   */
  get totalPages(): number {
    return this.getVisiblePages().length;
  }

  /**
   * Check if on first wizard page
   */
  get isFirstPage(): boolean {
    return this.wizardCurrentPage() === 0;
  }

  /**
   * Check if on last wizard page
   */
  get isLastPage(): boolean {
    const pages = this.getVisiblePages();
    return this.wizardCurrentPage() === pages.length - 1;
  }

  activePopover: string | null = null;
  activeCellTooltip: { field: string; row: number; col: string } | null = null;
  private autoSaveTimer?: number;

  // Cache for resolved form references (fieldName -> FormConfig)
  resolvedFormRefs: Map<string, FormConfig> = new Map();

  constructor() {
    // React to config changes
    effect(() => {
      const currentConfig = this.config();
      if (currentConfig) {
        this.initializeForm();
      }
    });

    // React to disabled input changes
    effect(() => {
      const isDisabled = this.disabledInput();
      if (this.form) {
        if (isDisabled) {
          this.form.disable({ emitEvent: false });
        } else {
          this.form.enable({ emitEvent: false });
        }
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
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize the form based on configuration
   */
  private initializeForm(): void {
    const group: { [key: string]: FormControl | FormArray | FormGroup } = {};
    const currentConfig = this.config();

    // Sort fields by order if specified
    const sortedFields = [...currentConfig.fields].sort((a, b) => {
      return (a.order ?? 0) - (b.order ?? 0);
    });

    sortedFields.forEach((field) => {
      // Skip info fields - they don't have form controls
      if (field.type === 'info') {
        return;
      }

      if (field.type === 'table' && field.tableConfig) {
        // Create FormArray for table rows
        group[field.name] = this.createTableFormArray(field);
      } else if (field.type === 'datagrid' && field.datagridConfig) {
        // Create FormGroup for datagrid rows
        group[field.name] = this.createDataGridFormGroup(field);
      } else if (field.type === 'phone') {
        // Create FormGroup for phone field with countryCode and number
        group[field.name] = this.createPhoneFormGroup(field);
      } else if (field.type === 'daterange') {
        // Create FormGroup for daterange field with fromDate and toDate
        group[field.name] = this.createDateRangeFormGroup(field);
      } else if (field.type === 'formref' && field.formrefConfig) {
        // Create FormGroup for embedded form fields
        const formRefGroup = this.createFormRefFormGroup(field);
        if (formRefGroup) {
          group[field.name] = formRefGroup;
        }
      } else if (field.type === 'fileupload') {
        // Create FormArray for file upload field
        group[field.name] = this.createFileUploadFormArray(field);
      } else if (field.type === 'autocomplete') {
        // Create FormControl for autocomplete field (stores { value, label } or null)
        group[field.name] = this.createAutocompleteFormControl(field);
      } else {
        // Skip validators for archived fields
        const validators = field.archived ? [] : this.buildValidators(field.validations || []);
        // Initialize checkbox fields with options as arrays
        const defaultValue =
          field.type === 'checkbox' && field.options?.length ? field.value ?? [] : field.value ?? '';
        group[field.name] = new FormControl(
          { value: defaultValue, disabled: field.disabled ?? field.archived ?? false },
          validators
        );
      }
    });

    this.form = new FormGroup(group);

    // Listen to value changes for validation, visibility, and emit changes
    this.form.valueChanges.subscribe(() => {
      this.updateVisibility();
      this.updateErrors();
      this.valueChanges.emit(this.getCleanedFormValue());
    });

    // Set up async validation for fields that have it configured
    this.setupAsyncValidation();

    // Set up autocomplete search for fields that have it configured
    this.setupAutocompleteFields();

    // Set up cross-field validation triggers for conditional validations
    this.setupConditionalValidationTriggers();

    // Trigger initial validation for fields with conditional validations
    // (they may have skipped validation during FormControl creation)
    this.triggerInitialConditionalValidation();

    // Calculate initial visibility state based on default values
    this.updateVisibility();

    // Reset wizard state when form is reinitialized
    if (this.config().wizard) {
      this.resetWizard();
    }
  }

  /**
   * Trigger validation for all fields with conditional validations
   * Called after form is fully initialized
   */
  private triggerInitialConditionalValidation(): void {
    const currentConfig = this.config();
    currentConfig.fields.forEach((field) => {
      if (field.type === 'info') return;
      const hasConditionalValidation = field.validations?.some((v) => v.condition);
      if (hasConditionalValidation) {
        const control = this.form.get(field.name);
        if (control) {
          control.updateValueAndValidity({ emitEvent: false });
        }
      }
    });
  }

  /**
   * Set up triggers to revalidate fields when their condition dependencies change
   */
  private setupConditionalValidationTriggers(): void {
    const currentConfig = this.config();
    const dependencies = new Map<string, Set<string>>(); // referencedField -> dependentFields

    // Analyze standalone fields for conditional validations
    currentConfig.fields.forEach((field) => {
      if (field.type === 'info') return;

      field.validations?.forEach((rule) => {
        if (rule.condition) {
          const referencedField = rule.condition.field.startsWith('$form.')
            ? rule.condition.field.substring(6)
            : rule.condition.field;

          if (!dependencies.has(referencedField)) {
            dependencies.set(referencedField, new Set());
          }
          dependencies.get(referencedField)!.add(field.name);
        }
      });
    });

    // Set up subscriptions for standalone field dependencies
    dependencies.forEach((dependentFields, referencedField) => {
      const referencedControl = this.form.get(referencedField);
      if (referencedControl) {
        referencedControl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
          // Defer revalidation to next tick to ensure form's aggregate value is updated
          setTimeout(() => {
            dependentFields.forEach((fieldName) => {
              const control = this.form.get(fieldName);
              if (control) {
                control.updateValueAndValidity({ emitEvent: false });
              }
            });
          }, 0);
        });
      }
    });

    // Analyze table/datagrid columns for conditional validations
    currentConfig.fields.forEach((field) => {
      if (field.type === 'table' && field.tableConfig) {
        this.setupTableConditionalTriggers(field);
      } else if (field.type === 'datagrid' && field.datagridConfig) {
        this.setupDataGridConditionalTriggers(field);
      }
    });
  }

  /**
   * Set up conditional validation triggers for table columns
   */
  private setupTableConditionalTriggers(field: FormFieldConfig): void {
    const tableConfig = field.tableConfig!;
    const formArray = this.form.get(field.name) as FormArray;
    if (!formArray) return;

    // Collect column dependencies
    const sameRowDeps = new Map<string, Set<string>>(); // referencedColumn -> dependentColumns
    const formFieldDeps = new Map<string, Set<string>>(); // referencedFormField -> dependentColumns

    tableConfig.columns.forEach((column) => {
      column.validations?.forEach((rule) => {
        if (rule.condition) {
          if (rule.condition.field.startsWith('$form.')) {
            const formField = rule.condition.field.substring(6);
            if (!formFieldDeps.has(formField)) {
              formFieldDeps.set(formField, new Set());
            }
            formFieldDeps.get(formField)!.add(column.name);
          } else {
            if (!sameRowDeps.has(rule.condition.field)) {
              sameRowDeps.set(rule.condition.field, new Set());
            }
            sameRowDeps.get(rule.condition.field)!.add(column.name);
          }
        }
      });
    });

    // Set up triggers for same-row dependencies (for each row)
    if (sameRowDeps.size > 0) {
      formArray.controls.forEach((control) => {
        const rowGroup = control as FormGroup;
        this.setupRowConditionalTriggers(rowGroup, sameRowDeps);
      });
    }

    // Set up triggers for form-level field dependencies
    formFieldDeps.forEach((dependentColumns, formFieldName) => {
      const formControl = this.form.get(formFieldName);
      if (formControl) {
        formControl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
          // Defer to next tick to ensure form values are updated
          setTimeout(() => {
            formArray.controls.forEach((control) => {
              const rowGroup = control as FormGroup;
              dependentColumns.forEach((columnName) => {
                const cellControl = rowGroup.get(columnName);
                if (cellControl) {
                  cellControl.updateValueAndValidity({ emitEvent: false });
                }
              });
            });
          }, 0);
        });
      }
    });
  }

  /**
   * Set up conditional validation triggers within a single row
   */
  private setupRowConditionalTriggers(
    rowGroup: FormGroup,
    sameRowDeps: Map<string, Set<string>>
  ): void {
    sameRowDeps.forEach((dependentColumns, referencedColumn) => {
      const referencedControl = rowGroup.get(referencedColumn);
      if (referencedControl) {
        referencedControl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
          // Defer to next tick to ensure form values are updated
          setTimeout(() => {
            dependentColumns.forEach((columnName) => {
              const cellControl = rowGroup.get(columnName);
              if (cellControl) {
                cellControl.updateValueAndValidity({ emitEvent: false });
              }
            });
          }, 0);
        });
      }
    });
  }

  /**
   * Set up conditional validation triggers for datagrid columns
   */
  private setupDataGridConditionalTriggers(field: FormFieldConfig): void {
    const datagridConfig = field.datagridConfig!;
    const formGroup = this.form.get(field.name) as FormGroup;
    if (!formGroup) return;

    // Collect column dependencies
    const sameRowDeps = new Map<string, Set<string>>();
    const formFieldDeps = new Map<string, Set<string>>();

    datagridConfig.columns.forEach((column) => {
      if (column.computed) return;

      column.validations?.forEach((rule) => {
        if (rule.condition) {
          if (rule.condition.field.startsWith('$form.')) {
            const formField = rule.condition.field.substring(6);
            if (!formFieldDeps.has(formField)) {
              formFieldDeps.set(formField, new Set());
            }
            formFieldDeps.get(formField)!.add(column.name);
          } else {
            if (!sameRowDeps.has(rule.condition.field)) {
              sameRowDeps.set(rule.condition.field, new Set());
            }
            sameRowDeps.get(rule.condition.field)!.add(column.name);
          }
        }
      });
    });

    // Set up triggers for same-row dependencies (for each row)
    if (sameRowDeps.size > 0) {
      Object.keys(formGroup.controls).forEach((rowId) => {
        const rowGroup = formGroup.get(rowId) as FormGroup;
        if (rowGroup) {
          this.setupRowConditionalTriggers(rowGroup, sameRowDeps);
        }
      });
    }

    // Set up triggers for form-level field dependencies
    formFieldDeps.forEach((dependentColumns, formFieldName) => {
      const formControl = this.form.get(formFieldName);
      if (formControl) {
        formControl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
          // Defer to next tick to ensure form values are updated
          setTimeout(() => {
            Object.keys(formGroup.controls).forEach((rowId) => {
              const rowGroup = formGroup.get(rowId) as FormGroup;
              if (rowGroup) {
                dependentColumns.forEach((columnName) => {
                  const cellControl = rowGroup.get(columnName);
                  if (cellControl) {
                    cellControl.updateValueAndValidity({ emitEvent: false });
                  }
                });
              }
            });
          }, 0);
        });
      }
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
      // Skip validators for archived fields, pass true for table context
      const validators = field.archived ? [] : this.buildValidators(column.validations || [], true);
      controls[column.name] = new FormControl(
        { value: rowData[column.name] ?? '', disabled: field.disabled ?? field.archived ?? false },
        validators
      );
    });

    return new FormGroup(controls);
  }

  /**
   * Create FormGroup for a phone field
   * Structure: { countryCode: string, number: string }
   */
  private createPhoneFormGroup(field: FormFieldConfig): FormGroup {
    const phoneConfig = field.phoneConfig;
    const existingValue = (field.value as { countryCode?: string; number?: string }) || {};

    // Get default country code from config or existing value
    const defaultCountryCode =
      existingValue.countryCode ||
      phoneConfig?.defaultCountryCode ||
      (phoneConfig?.countryCodes?.[0]?.code ?? '');

    // Build validators for the phone number (skip for archived fields)
    const numberValidators: any[] = [];
    if (!field.archived) {
      if (field.validations?.some((v) => v.type === 'required')) {
        numberValidators.push(Validators.required);
      }
      // Add pattern validator for numbers only
      numberValidators.push(Validators.pattern(/^\d*$/));
    }

    const isDisabled = field.disabled ?? field.archived ?? false;

    return new FormGroup({
      countryCode: new FormControl(
        { value: defaultCountryCode, disabled: isDisabled }
      ),
      number: new FormControl(
        { value: existingValue.number ?? '', disabled: isDisabled },
        numberValidators
      ),
    });
  }

  /**
   * Create FormGroup for a daterange field
   * Structure: { fromDate: string, toDate: string }
   */
  private createDateRangeFormGroup(field: FormFieldConfig): FormGroup {
    const existingValue = (field.value as { fromDate?: string; toDate?: string }) || {};
    const isRequired = field.validations?.some((v) => v.type === 'required');
    const toDateOptional = field.daterangeConfig?.toDateOptional ?? false;
    const isDisabled = field.disabled ?? field.archived ?? false;

    // Build validators (skip for archived fields)
    const fromValidators: any[] = [];
    const toValidators: any[] = [];
    if (!field.archived) {
      if (isRequired) {
        fromValidators.push(Validators.required);
      }
      // Build validators for toDate (skip required if toDateOptional is true)
      if (isRequired && !toDateOptional) {
        toValidators.push(Validators.required);
      }
    }

    return new FormGroup({
      fromDate: new FormControl(
        { value: existingValue.fromDate ?? '', disabled: isDisabled },
        fromValidators
      ),
      toDate: new FormControl(
        { value: existingValue.toDate ?? '', disabled: isDisabled },
        toValidators
      ),
    });
  }

  /**
   * Create FormGroup for a formref field
   * Loads the referenced form and creates controls for its fields
   * Structure: { embeddedFieldName: value, ... }
   */
  private createFormRefFormGroup(field: FormFieldConfig): FormGroup | null {
    const formrefConfig = field.formrefConfig;
    if (!formrefConfig?.formId) return null;

    // Load the referenced form configuration
    const referencedForm = this.formBuilderService.loadConfig(formrefConfig.formId);
    if (!referencedForm) {
      console.warn(`FormRef: Could not load form with ID "${formrefConfig.formId}"`);
      return null;
    }

    // Store the resolved form config for rendering
    this.resolvedFormRefs.set(field.name, referencedForm);

    // Get existing values for the embedded fields
    const existingValue = (field.value as { [key: string]: any }) || {};

    // Create controls for each field in the referenced form
    const group: { [key: string]: FormControl | FormArray | FormGroup } = {};
    const prefix = formrefConfig.fieldPrefix || '';

    for (const embeddedField of referencedForm.fields) {
      // Skip info fields and formref fields (prevent infinite recursion)
      if (embeddedField.type === 'info' || embeddedField.type === 'formref') {
        continue;
      }

      const fieldName = prefix + embeddedField.name;
      const fieldValue = existingValue[fieldName];

      // Create control based on field type (inherit archived status from parent formref)
      if (embeddedField.type === 'table' && embeddedField.tableConfig) {
        const fieldWithValue = { ...embeddedField, value: fieldValue, disabled: field.disabled, archived: field.archived };
        group[fieldName] = this.createTableFormArray(fieldWithValue);
      } else if (embeddedField.type === 'datagrid' && embeddedField.datagridConfig) {
        const fieldWithValue = { ...embeddedField, value: fieldValue, disabled: field.disabled, archived: field.archived };
        group[fieldName] = this.createDataGridFormGroup(fieldWithValue);
      } else if (embeddedField.type === 'phone') {
        const fieldWithValue = { ...embeddedField, value: fieldValue, disabled: field.disabled, archived: field.archived };
        group[fieldName] = this.createPhoneFormGroup(fieldWithValue);
      } else if (embeddedField.type === 'daterange') {
        const fieldWithValue = { ...embeddedField, value: fieldValue, disabled: field.disabled, archived: field.archived };
        group[fieldName] = this.createDateRangeFormGroup(fieldWithValue);
      } else {
        // Skip validators for archived fields
        const isArchived = field.archived ?? false;
        const validators = isArchived ? [] : this.buildValidators(embeddedField.validations || []);
        const defaultValue =
          embeddedField.type === 'checkbox' && embeddedField.options?.length
            ? fieldValue ?? []
            : fieldValue ?? '';
        group[fieldName] = new FormControl(
          { value: defaultValue, disabled: field.disabled ?? field.archived ?? embeddedField.disabled ?? false },
          validators
        );
      }
    }

    return new FormGroup(group);
  }

  /**
   * Get resolved form config for a formref field
   */
  getResolvedFormRef(fieldName: string): FormConfig | undefined {
    return this.resolvedFormRefs.get(fieldName);
  }

  /**
   * Get the FormGroup for a formref field
   */
  getFormRefFormGroup(fieldName: string): FormGroup | null {
    const control = this.form.get(fieldName);
    return control instanceof FormGroup ? control : null;
  }

  /**
   * Get embedded fields for a formref field (with prefix applied to names)
   */
  getFormRefFields(field: FormFieldConfig): FormFieldConfig[] {
    const resolvedForm = this.resolvedFormRefs.get(field.name);
    if (!resolvedForm) return [];

    const prefix = field.formrefConfig?.fieldPrefix || '';
    return resolvedForm.fields
      .filter((f) => f.type !== 'info' && f.type !== 'formref')
      .map((f) => ({
        ...f,
        name: prefix + f.name,
        disabled: field.disabled ?? f.disabled,
      }));
  }

  /**
   * Get sections from a referenced form
   */
  getFormRefSections(field: FormFieldConfig): FormSection[] {
    if (!field.formrefConfig?.showSections) return [];
    const resolvedForm = this.resolvedFormRefs.get(field.name);
    return resolvedForm?.sections || [];
  }

  /**
   * Check if formref field is valid
   */
  isFormRefValid(fieldName: string): boolean {
    const formGroup = this.getFormRefFormGroup(fieldName);
    if (!formGroup) return true;
    return !formGroup.invalid;
  }

  /**
   * Check if formref has errors (for display)
   */
  hasFormRefError(fieldName: string): boolean {
    const formGroup = this.getFormRefFormGroup(fieldName);
    if (!formGroup) return false;

    // Check if any nested control is invalid and touched
    for (const key of Object.keys(formGroup.controls)) {
      const control = formGroup.get(key);
      if (control?.invalid && control?.touched) {
        return true;
      }
    }
    return false;
  }

  /**
   * Create FormGroup for a datagrid field
   * Structure: { rowId: { columnName: value, ... }, ... }
   */
  private createDataGridFormGroup(field: FormFieldConfig): FormGroup {
    const datagridConfig = field.datagridConfig!;
    const existingValue = (field.value as { [key: string]: any }) || {};
    const group: { [key: string]: FormGroup } = {};
    const isDisabled = field.disabled ?? field.archived ?? false;

    // Create a FormGroup for each row label
    datagridConfig.rowLabels.forEach((rowLabel) => {
      const rowData = existingValue[rowLabel.id] || {};
      const rowControls: { [key: string]: FormControl } = {};

      datagridConfig.columns.forEach((column) => {
        // Skip computed columns - they don't need form controls
        if (column.computed) {
          return;
        }

        // Skip validators for archived fields, pass true for datagrid context
        const validators = field.archived ? [] : this.buildValidators(column.validations || [], true);
        rowControls[column.name] = new FormControl(
          { value: rowData[column.name] ?? '', disabled: isDisabled },
          validators
        );
      });

      group[rowLabel.id] = new FormGroup(rowControls);
    });

    return new FormGroup(group);
  }

  /**
   * Evaluate a validation condition
   * @param condition The condition to evaluate
   * @param formData Current form values
   * @param rowData Row data for table/datagrid context (optional)
   */
  private evaluateCondition(
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

    let result: boolean;
    switch (condition.operator) {
      case 'equals':
        result = fieldValue === condition.value;
        break;
      case 'notEquals':
        result = fieldValue !== condition.value;
        break;
      case 'isEmpty':
        result = fieldValue === null || fieldValue === undefined || fieldValue === '';
        break;
      case 'isNotEmpty':
        result = fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
        break;
      default:
        result = true;
    }

    return result;
  }

  /**
   * Check if a field is currently visible based on its condition
   * Fields without conditions are always visible
   */
  isFieldVisible(fieldName: string): boolean {
    return this.visibleFields().has(fieldName);
  }

  /**
   * Check if a section is currently visible based on its condition
   * Sections without conditions are always visible
   */
  isSectionVisible(sectionId: string): boolean {
    return this.visibleSections().has(sectionId);
  }

  /**
   * Update visibility state for all fields and sections based on their conditions
   */
  private updateVisibility(): void {
    const formData = this.form.value;
    const currentConfig = this.config();

    // Evaluate field visibility
    const visibleFieldsSet = new Set<string>();
    for (const field of currentConfig.fields) {
      // Info fields don't have form controls but are still rendered
      if (field.type === 'info') {
        if (!field.condition || this.evaluateCondition(field.condition, formData)) {
          visibleFieldsSet.add(field.name);
        }
      } else if (!field.condition || this.evaluateCondition(field.condition, formData)) {
        visibleFieldsSet.add(field.name);
      }
    }
    this.visibleFields.set(visibleFieldsSet);

    // Evaluate section visibility
    const visibleSectionsSet = new Set<string>();
    for (const section of currentConfig.sections || []) {
      if (!section.condition || this.evaluateCondition(section.condition, formData)) {
        visibleSectionsSet.add(section.id);
      }
    }
    this.visibleSections.set(visibleSectionsSet);
  }

  /**
   * Create a base validator function from a validation rule
   */
  private createBaseValidator(rule: ValidationRule): ValidatorFn | null {
    switch (rule.type) {
      case 'required':
        return Validators.required;
      case 'email':
        return Validators.email;
      case 'minLength':
        return Validators.minLength(rule.value);
      case 'maxLength':
        return Validators.maxLength(rule.value);
      case 'min':
        return Validators.min(rule.value);
      case 'max':
        return Validators.max(rule.value);
      case 'pattern':
        return Validators.pattern(rule.value);
      case 'custom':
        if (rule.customValidatorName) {
          const namedValidator = this.validatorRegistry.get(rule.customValidatorName);
          if (namedValidator) {
            return (control: AbstractControl) => {
              const formData = this.form.value;
              return namedValidator(control.value, rule.customValidatorParams, undefined, formData)
                ? null
                : { custom: true };
            };
          } else {
            console.warn(`Custom validator "${rule.customValidatorName}" not registered`);
            return null;
          }
        } else if (rule.validator) {
          return (control: AbstractControl) => {
            return rule.validator!(control.value) ? null : { custom: true };
          };
        }
        return null;
      default:
        return null;
    }
  }

  /**
   * Build Angular validators from validation rules
   * @param rules Validation rules to convert
   * @param isTableContext Whether this is for a table/datagrid column (affects condition evaluation)
   */
  private buildValidators(rules: ValidationRule[], isTableContext: boolean = false): ValidatorFn[] {
    const validators: ValidatorFn[] = [];

    rules.forEach((rule) => {
      const baseValidator = this.createBaseValidator(rule);
      if (!baseValidator) return;

      if (rule.condition) {
        // Wrap validator with condition check
        validators.push((control: AbstractControl) => {
          // Safety check: form might not be initialized yet during FormControl creation
          if (!this.form) {
            return null;
          }

          const formData = this.form.value;
          // For table/datagrid context, get row data from parent FormGroup
          const rowData = isTableContext ? control.parent?.value : undefined;

          if (!this.evaluateCondition(rule.condition!, formData, rowData)) {
            return null; // Condition not met, validation doesn't apply
          }
          return baseValidator(control);
        });
      } else {
        validators.push(baseValidator);
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
      // Skip archived fields - they should not show validation errors
      if (field.archived) return;

      const control = this.form.get(field.name);
      if (control?.invalid && control.touched) {
        const fieldErrors = this.getFieldErrors(field, control);
        errors.push(...fieldErrors);
      }

      // Include external errors (from setErrors or async validation)
      const externalError = this.externalErrors.get(field.name);
      if (externalError) {
        // Avoid duplicate errors
        if (!errors.some(e => e.field === field.name && e.message === externalError)) {
          errors.push({ field: field.name, message: externalError });
        }
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
    // Don't save if async validation is in progress
    if (this.validating) {
      return;
    }

    const currentConfig = this.config();
    this.formStorage.saveForm(currentConfig.id, this.form.value, false);
    this.formSave.emit(this.form.value);
  }

  /**
   * Set external validation errors (e.g., from API response)
   * @param errors Array of field errors to display
   */
  setErrors(errors: FieldError[]): void {
    this.externalErrors.clear();
    for (const error of errors) {
      this.externalErrors.set(error.field, error.message);
      // Mark the field as touched so error displays
      const control = this.form.get(error.field);
      if (control) {
        control.markAsTouched();
      }
    }
    this.updateErrors();
  }

  /**
   * Clear all external validation errors
   */
  clearErrors(): void {
    this.externalErrors.clear();
    this.updateErrors();
  }

  /**
   * Clear external error for a specific field
   * @param fieldName Name of the field to clear error for
   */
  clearFieldError(fieldName: string): void {
    this.externalErrors.delete(fieldName);
    this.updateErrors();
  }

  /**
   * Check if a specific field is currently being async validated
   */
  isFieldValidating(fieldName: string): boolean {
    return this.validatingFields.has(fieldName);
  }

  /**
   * Check if an archived field should be visible (only if it has data)
   * Non-archived fields are always visible
   */
  isArchivedFieldVisible(field: FormFieldConfig): boolean {
    if (!field.archived) return true;

    const control = this.form.get(field.name);
    if (!control) return false;

    const value = control.value;

    // Check based on field type
    switch (field.type) {
      case 'table':
        // Check if any rows have data
        return (
          Array.isArray(value) &&
          value.some((row) =>
            Object.values(row).some((v) => v !== '' && v !== null && v !== undefined)
          )
        );

      case 'datagrid':
        // Check if any cells have data
        if (!value || typeof value !== 'object') return false;
        return Object.values(value).some(
          (row) =>
            row &&
            typeof row === 'object' &&
            Object.values(row).some((v) => v !== '' && v !== null && v !== undefined)
        );

      case 'phone':
        // Check if phone number has value
        return value && (value.number || value.countryCode);

      case 'daterange':
        // Check if either date has value
        return value && (value.fromDate || value.toDate);

      case 'checkbox':
        // For checkbox groups, check if array has items; for single, check boolean
        if (Array.isArray(value)) return value.length > 0;
        return !!value;

      case 'formref':
        // Check if any embedded field has data
        if (!value || typeof value !== 'object') return false;
        return Object.values(value).some((v) => {
          if (Array.isArray(v)) return v.length > 0;
          if (v && typeof v === 'object') {
            return Object.values(v).some((subV) => subV !== '' && subV !== null && subV !== undefined);
          }
          return v !== '' && v !== null && v !== undefined;
        });

      default:
        // For simple fields, check if value is non-empty
        return value !== '' && value !== null && value !== undefined;
    }
  }

  /**
   * Submit form
   */
  submitForm(): void {
    // Mark all fields as touched to show validation errors
    Object.keys(this.form.controls).forEach((key) => {
      this.form.get(key)?.markAsTouched();
    });

    // Mark table, datagrid, phone, daterange, formref, and fileupload fields as touched
    this.markTableFieldsTouched();
    this.markDataGridFieldsTouched();
    this.markPhoneFieldsTouched();
    this.markDateRangeFieldsTouched();
    this.markFormRefFieldsTouched();
    this.markFileUploadFieldsTouched();

    this.updateErrors();

    // Don't submit if async validation is in progress
    if (this.validating) {
      return;
    }

    // Don't submit if there are async validation errors
    if (this.externalErrors.size > 0) {
      return;
    }

    // Check regular form validity AND table/datagrid/phone/daterange/formref validity
    let isValid = true;
    const currentConfig = this.config();

    for (const field of currentConfig.fields) {
      // Skip archived fields - they don't participate in validation
      if (field.archived) continue;

      if (field.type === 'table' && !this.isTableValid(field.name)) {
        isValid = false;
        break;
      } else if (field.type === 'datagrid' && !this.isDataGridValid(field.name)) {
        isValid = false;
        break;
      } else if (field.type === 'phone' && !this.isPhoneValid(field.name)) {
        isValid = false;
        break;
      } else if (field.type === 'daterange' && !this.isDateRangeValid(field.name)) {
        isValid = false;
        break;
      } else if (field.type === 'formref' && !this.isFormRefValid(field.name)) {
        isValid = false;
        break;
      } else if (field.type === 'fileupload' && !this.isFileUploadValid(field.name)) {
        isValid = false;
        break;
      } else if (field.type !== 'table' && field.type !== 'datagrid' && field.type !== 'phone' && field.type !== 'daterange' && field.type !== 'formref' && field.type !== 'fileupload') {
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

  // ============================================
  // Wizard Mode Methods
  // ============================================

  /**
   * Get visible wizard pages (respecting conditions)
   */
  getVisiblePages(): WizardPage[] {
    const wizard = this.config().wizard;
    if (!wizard) return [];

    const formData = this.form.value;
    return wizard.pages
      .filter((page: WizardPage) => !page.condition || this.evaluateCondition(page.condition, formData))
      .sort((a: WizardPage, b: WizardPage) => (a.order ?? 0) - (b.order ?? 0));
  }

  /**
   * Get current wizard page configuration
   */
  getCurrentPageConfig(): WizardPage | null {
    const pages = this.getVisiblePages();
    return pages[this.wizardCurrentPage()] || null;
  }

  /**
   * Get sections for the current wizard page
   */
  getCurrentPageSections(): FormSection[] {
    const currentPage = this.getCurrentPageConfig();
    if (!currentPage) return [];

    const currentSectionIds = new Set(currentPage.sectionIds);
    return this.getSections().filter((s) => currentSectionIds.has(s.id) && this.isSectionVisible(s.id));
  }

  /**
   * Get all fields for the current wizard page
   */
  getCurrentPageFields(): FormFieldConfig[] {
    const currentPage = this.getCurrentPageConfig();
    if (!currentPage) return [];

    const currentSectionIds = new Set(currentPage.sectionIds);

    return this.getSortedFields().filter((f) => {
      // Fields in the current page's sections
      if (f.sectionId && currentSectionIds.has(f.sectionId)) {
        return true;
      }
      // Ungrouped fields appear on first page only
      if (!f.sectionId && this.wizardCurrentPage() === 0) {
        return true;
      }
      return false;
    });
  }

  /**
   * Validate current wizard page fields only
   * Returns validation result with errors
   */
  validateCurrentPage(): { valid: boolean; errors: FieldError[] } {
    const fields = this.getCurrentPageFields();
    const errors: FieldError[] = [];

    for (const field of fields) {
      if (field.archived) continue;
      if (field.type === 'info') continue;
      if (!this.isFieldVisible(field.name)) continue;
      if (field.sectionId && !this.isSectionVisible(field.sectionId)) continue;

      // Mark field as touched to show validation errors
      this.markFieldAsTouched(field);

      // Collect validation errors based on field type
      const fieldErrors = this.getFieldValidationErrors(field);
      errors.push(...fieldErrors);
    }

    // Store errors for this page
    this.wizardPageErrors.update((m) => {
      const newMap = new Map(m);
      newMap.set(this.wizardCurrentPage(), errors);
      return newMap;
    });

    this.updateErrors();
    return { valid: errors.length === 0, errors };
  }

  /**
   * Navigate to next wizard page with validation
   * Returns true if navigation succeeded
   */
  nextPage(): boolean {
    if (this.isLastPage) return false;

    // Wait for any pending async validations
    if (this.validating) return false;

    const { valid } = this.validateCurrentPage();
    if (!valid) return false;

    const previousPage = this.wizardCurrentPage();
    this.wizardCurrentPage.update((p) => p + 1);

    // Mark new page as visited
    this.wizardVisitedPages.update((s) => {
      const newSet = new Set(s);
      newSet.add(this.wizardCurrentPage());
      return newSet;
    });

    this.wizardPageChange.emit({ previousPage, currentPage: this.wizardCurrentPage() });
    return true;
  }

  /**
   * Navigate to previous wizard page (no validation needed)
   * Returns true if navigation succeeded
   */
  prevPage(): boolean {
    if (this.isFirstPage) return false;

    const previousPage = this.wizardCurrentPage();
    this.wizardCurrentPage.update((p) => p - 1);
    this.wizardPageChange.emit({ previousPage, currentPage: this.wizardCurrentPage() });
    return true;
  }

  /**
   * Navigate to a specific wizard page
   * If going forward, validates all pages in between unless allowFreeNavigation is true
   * Returns true if navigation succeeded
   */
  goToPage(pageIndex: number): boolean {
    const wizard = this.config().wizard;
    if (!wizard) return false;

    const pages = this.getVisiblePages();
    if (pageIndex < 0 || pageIndex >= pages.length) return false;

    // Same page - no action needed
    if (pageIndex === this.wizardCurrentPage()) return true;

    // Going backward is always allowed
    if (pageIndex < this.wizardCurrentPage()) {
      const previousPage = this.wizardCurrentPage();
      this.wizardCurrentPage.set(pageIndex);
      this.wizardPageChange.emit({ previousPage, currentPage: pageIndex });
      return true;
    }

    // Going forward
    if (wizard.allowFreeNavigation) {
      // Free navigation - jump directly
      const previousPage = this.wizardCurrentPage();
      this.wizardCurrentPage.set(pageIndex);
      this.wizardVisitedPages.update((s) => {
        const newSet = new Set(s);
        newSet.add(pageIndex);
        return newSet;
      });
      this.wizardPageChange.emit({ previousPage, currentPage: pageIndex });
      return true;
    }

    // Must validate current page to advance
    const { valid } = this.validateCurrentPage();
    if (!valid) return false;

    const previousPage = this.wizardCurrentPage();
    this.wizardCurrentPage.set(pageIndex);
    this.wizardVisitedPages.update((s) => {
      const newSet = new Set(s);
      newSet.add(pageIndex);
      return newSet;
    });
    this.wizardPageChange.emit({ previousPage, currentPage: pageIndex });
    return true;
  }

  /**
   * Check if a wizard page has been visited
   */
  isPageVisited(pageIndex: number): boolean {
    return this.wizardVisitedPages().has(pageIndex);
  }

  /**
   * Check if a wizard page has validation errors
   */
  hasPageErrors(pageIndex: number): boolean {
    const errors = this.wizardPageErrors().get(pageIndex);
    return errors ? errors.length > 0 : false;
  }

  /**
   * Reset wizard to first page (used when config changes)
   */
  resetWizard(): void {
    this.wizardCurrentPage.set(0);
    this.wizardVisitedPages.set(new Set([0]));
    this.wizardPageErrors.set(new Map());
  }

  /**
   * Mark a field as touched for validation display
   */
  private markFieldAsTouched(field: FormFieldConfig): void {
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
    } else if (field.type === 'datagrid') {
      const formGroup = this.form.get(field.name) as FormGroup;
      if (formGroup) {
        Object.keys(formGroup.controls).forEach((rowId) => {
          const rowGroup = formGroup.get(rowId) as FormGroup;
          if (rowGroup) {
            Object.keys(rowGroup.controls).forEach((key) => {
              rowGroup.get(key)?.markAsTouched();
            });
          }
        });
      }
    } else if (field.type === 'phone') {
      const phoneGroup = this.getPhoneFormGroup(field.name);
      if (phoneGroup) {
        phoneGroup.get('countryCode')?.markAsTouched();
        phoneGroup.get('number')?.markAsTouched();
      }
    } else if (field.type === 'daterange') {
      const dateRangeGroup = this.form.get(field.name) as FormGroup;
      if (dateRangeGroup) {
        dateRangeGroup.get('fromDate')?.markAsTouched();
        dateRangeGroup.get('toDate')?.markAsTouched();
      }
    } else if (field.type === 'formref') {
      const formRefGroup = this.form.get(field.name) as FormGroup;
      if (formRefGroup) {
        Object.keys(formRefGroup.controls).forEach((key) => {
          formRefGroup.get(key)?.markAsTouched();
        });
      }
    } else if (field.type === 'fileupload') {
      const formArray = this.form.get(field.name) as FormArray;
      formArray?.markAsTouched();
    } else {
      const control = this.form.get(field.name);
      control?.markAsTouched();
    }
  }

  /**
   * Get validation errors for a specific field
   */
  private getFieldValidationErrors(field: FormFieldConfig): FieldError[] {
    const errors: FieldError[] = [];

    if (field.type === 'table') {
      if (!this.isTableValid(field.name)) {
        errors.push({ field: field.name, message: 'Please correct the errors in the table' });
      }
    } else if (field.type === 'datagrid') {
      if (!this.isDataGridValid(field.name)) {
        errors.push({ field: field.name, message: 'Please correct the errors in the data grid' });
      }
    } else if (field.type === 'phone') {
      if (!this.isPhoneValid(field.name)) {
        const errorMsg = this.getPhoneErrorMessage(field.name);
        errors.push({ field: field.name, message: errorMsg || 'Invalid phone number' });
      }
    } else if (field.type === 'daterange') {
      if (!this.isDateRangeValid(field.name)) {
        const errorMsg = this.getDateRangeErrorMessage(field.name);
        errors.push({ field: field.name, message: errorMsg || 'Invalid date range' });
      }
    } else if (field.type === 'formref') {
      if (!this.isFormRefValid(field.name)) {
        errors.push({ field: field.name, message: 'Please correct the errors in the embedded form' });
      }
    } else if (field.type === 'fileupload') {
      if (!this.isFileUploadValid(field.name)) {
        errors.push({ field: field.name, message: 'Please upload the required files' });
      }
    } else {
      const control = this.form.get(field.name);
      if (control?.invalid) {
        const errorMsg = this.getErrorMessage(field.name);
        if (errorMsg) {
          errors.push({ field: field.name, message: errorMsg });
        }
      }
    }

    // Check for external/async errors
    const externalError = this.externalErrors.get(field.name);
    if (externalError) {
      errors.push({ field: field.name, message: externalError });
    }

    return errors;
  }

  /**
   * Check if form is ready (has controls)
   */
  isFormReady(): boolean {
    return Object.keys(this.form.controls).length > 0;
  }

  /**
   * Check if form is valid for submission (excludes empty table rows and hidden fields)
   */
  isFormValidForSubmit(): boolean {
    const currentConfig = this.config();

    for (const field of currentConfig.fields) {
      // Skip archived fields - they don't participate in validation
      if (field.archived) continue;

      // Skip hidden fields - they don't participate in validation
      if (!this.isFieldVisible(field.name)) continue;

      // Skip fields in hidden sections - they don't participate in validation
      if (field.sectionId && !this.isSectionVisible(field.sectionId)) continue;

      if (field.type === 'table') {
        if (!this.isTableValid(field.name)) {
          return false;
        }
      } else if (field.type === 'datagrid') {
        if (!this.isDataGridValid(field.name)) {
          return false;
        }
      } else if (field.type === 'phone') {
        if (!this.isPhoneValid(field.name)) {
          return false;
        }
      } else if (field.type === 'daterange') {
        if (!this.isDateRangeValid(field.name)) {
          return false;
        }
      } else if (field.type === 'formref') {
        if (!this.isFormRefValid(field.name)) {
          return false;
        }
      } else if (field.type === 'fileupload') {
        if (!this.isFileUploadValid(field.name)) {
          return false;
        }
      } else {
        const control = this.form.get(field.name);
        if (control?.invalid) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Check if field has error
   */
  hasError(fieldName: string): boolean {
    // Check for external errors first
    if (this.externalErrors.has(fieldName)) {
      return true;
    }

    const field = this.getField(fieldName);

    // For table fields, use the special table validation that excludes empty rows
    if (field?.type === 'table') {
      const formArray = this.getTableFormArray(fieldName);
      if (!formArray) return false;

      // Check if any cell in the table is touched
      let anyTouched = false;
      for (let i = 0; i < formArray.length; i++) {
        const rowGroup = formArray.at(i) as FormGroup;
        for (const key of Object.keys(rowGroup.controls)) {
          if (rowGroup.get(key)?.touched) {
            anyTouched = true;
            break;
          }
        }
        if (anyTouched) break;
      }

      // Only show error if touched and invalid (excluding empty rows)
      return anyTouched && !this.isTableValid(fieldName);
    }

    const control = this.form.get(fieldName);
    return !!(control?.invalid && control?.touched);
  }

  /**
   * Get error message for field
   */
  getErrorMessage(fieldName: string): string {
    // Check external errors first (takes precedence)
    const externalError = this.externalErrors.get(fieldName);
    if (externalError) {
      return externalError;
    }

    // Compute error message directly from control state
    const field = this.getField(fieldName);
    const control = this.form.get(fieldName);

    if (field && control?.invalid && control?.touched) {
      const fieldErrors = this.getFieldErrors(field, control);
      if (fieldErrors.length > 0) {
        return fieldErrors[0].message;
      }
    }

    return '';
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
   * Handle document clicks to close popover when clicking outside
   */
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    // Close any open autocomplete dropdowns when clicking outside
    if (!target.closest('[data-autocomplete-container]')) {
      this.autocompleteDropdownOpen.set(new Set());
    }

    if (!this.activePopover) return;

    // Check if click is on the popover or info icon
    const isPopoverClick = target.closest('[data-popover]') !== null;
    const isInfoIconClick = target.closest('[data-info-icon]') !== null;

    if (!isPopoverClick && !isInfoIconClick) {
      this.closePopover();
    }
  }

  /**
   * Handle focusout events to trigger change detection for validation display
   * This ensures error messages show immediately when a field is blurred
   * Also triggers async validation for fields with blur trigger
   */
  onFocusOut(event: FocusEvent): void {
    this.cdr.markForCheck();

    // Trigger async validation for fields with blur trigger
    const target = event.target as HTMLElement;
    if (target) {
      // Try to find the field name from formControlName or data attribute
      const fieldName =
        target.getAttribute('formControlName') ||
        target.getAttribute('data-field-name') ||
        target.closest('[data-field-name]')?.getAttribute('data-field-name');

      if (fieldName) {
        const field = this.config().fields.find((f) => f.name === fieldName);
        if (field?.asyncValidation?.trigger !== 'change') {
          // Default trigger is 'blur', so trigger if not explicitly 'change'
          this.triggerAsyncValidation(fieldName);
        }
      }
    }
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

    const newRowGroup = this.createTableRowFormGroup(field);
    formArray.push(newRowGroup);

    // Set up conditional validation triggers for the new row
    const sameRowDeps = this.getTableSameRowDependencies(tableConfig);
    if (sameRowDeps.size > 0) {
      this.setupRowConditionalTriggers(newRowGroup, sameRowDeps);
    }
  }

  /**
   * Get same-row column dependencies for a table config
   */
  private getTableSameRowDependencies(tableConfig: TableConfig): Map<string, Set<string>> {
    const sameRowDeps = new Map<string, Set<string>>();

    tableConfig.columns.forEach((column) => {
      column.validations?.forEach((rule) => {
        if (rule.condition && !rule.condition.field.startsWith('$form.')) {
          if (!sameRowDeps.has(rule.condition.field)) {
            sameRowDeps.set(rule.condition.field, new Set());
          }
          sameRowDeps.get(rule.condition.field)!.add(column.name);
        }
      });
    });

    return sameRowDeps;
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
   * Get form value with empty table rows filtered out and hidden fields excluded
   */
  private getCleanedFormValue(): { [key: string]: any } {
    const value = { ...this.form.value };
    const currentConfig = this.config();

    currentConfig.fields.forEach((field) => {
      // Exclude hidden fields from submission
      if (!this.isFieldVisible(field.name)) {
        delete value[field.name];
        return;
      }

      // Exclude fields in hidden sections from submission
      if (field.sectionId && !this.isSectionVisible(field.sectionId)) {
        delete value[field.name];
        return;
      }

      // Filter empty table rows
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

  // ============================================
  // Info Field Methods
  // ============================================

  /**
   * Parse markdown content to HTML
   * Supports: **bold**, *italic*, [links](url), line breaks
   */
  parseMarkdown(content: string | undefined): string {
    if (!content) return '';

    let html = content
      // Escape HTML entities first
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Bold: **text** or __text__
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.+?)__/g, '<strong>$1</strong>')
      // Italic: *text* or _text_
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/_(.+?)_/g, '<em>$1</em>')
      // Links: [text](url)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      // Line breaks
      .replace(/\n/g, '<br>');

    return html;
  }

  // ============================================
  // DataGrid Field Methods
  // ============================================

  /**
   * Check if datagrid has column groups
   */
  hasDataGridColumnGroups(field: FormFieldConfig): boolean {
    return (field.datagridConfig?.columnGroups?.length ?? 0) > 0;
  }

  /**
   * Get column groups for a datagrid
   */
  getDataGridColumnGroups(field: FormFieldConfig): DataGridColumnGroup[] {
    return field.datagridConfig?.columnGroups || [];
  }

  /**
   * Get a specific column by name from a datagrid
   */
  getDataGridColumn(field: FormFieldConfig, columnName: string): DataGridColumnConfig | undefined {
    return field.datagridConfig?.columns.find((c) => c.name === columnName);
  }

  /**
   * Get the column group label for a given column name
   * Returns empty string if column is not in any group
   */
  getDataGridColumnGroupLabel(field: FormFieldConfig, columnName: string): string {
    const groups = field.datagridConfig?.columnGroups || [];
    for (const group of groups) {
      if (group.columnIds.includes(columnName)) {
        return group.label;
      }
    }
    return '';
  }

  /**
   * Get columns that are not in any group
   */
  getDataGridUngroupedColumns(field: FormFieldConfig): DataGridColumnConfig[] {
    const groupedColumnNames = new Set(
      field.datagridConfig?.columnGroups?.flatMap((g) => g.columnIds) || []
    );
    return field.datagridConfig?.columns.filter((c) => !groupedColumnNames.has(c.name)) || [];
  }

  /**
   * Get header items in column order (groups and ungrouped columns interleaved)
   * Returns items in the order they should appear based on the columns array
   */
  getDataGridOrderedHeaderItems(
    field: FormFieldConfig
  ): Array<{ type: 'group'; group: DataGridColumnGroup } | { type: 'column'; column: DataGridColumnConfig }> {
    const columns = field.datagridConfig?.columns || [];
    const groups = field.datagridConfig?.columnGroups || [];

    // Build a map of columnName -> group
    const columnToGroup = new Map<string, DataGridColumnGroup>();
    for (const group of groups) {
      for (const colName of group.columnIds) {
        columnToGroup.set(colName, group);
      }
    }

    const result: Array<
      { type: 'group'; group: DataGridColumnGroup } | { type: 'column'; column: DataGridColumnConfig }
    > = [];
    const addedGroups = new Set<string>();

    for (const column of columns) {
      const group = columnToGroup.get(column.name);
      if (group) {
        // Column belongs to a group - add group if not already added
        if (!addedGroups.has(group.id)) {
          result.push({ type: 'group', group });
          addedGroups.add(group.id);
        }
      } else {
        // Ungrouped column
        result.push({ type: 'column', column });
      }
    }

    return result;
  }

  /**
   * Check if datagrid has row totals enabled
   */
  hasDataGridRowTotals(field: FormFieldConfig): boolean {
    return field.datagridConfig?.totals?.showRowTotals ?? false;
  }

  /**
   * Check if datagrid has column totals enabled
   */
  hasDataGridColumnTotals(field: FormFieldConfig): boolean {
    return field.datagridConfig?.totals?.showColumnTotals ?? false;
  }

  /**
   * Calculate equal width for each data column in a datagrid
   * Accounts for fixed-width row label and optional row total columns
   */
  getDataGridDataColumnWidth(field: FormFieldConfig): string {
    const columnCount = field.datagridConfig?.columns.length || 1;
    const hasRowTotals = this.hasDataGridRowTotals(field);
    const fixedWidth = hasRowTotals ? 160 : 80; // row label (80px) + optional row total (80px)
    return `calc((100% - ${fixedWidth}px) / ${columnCount})`;
  }

  /**
   * Get row FormGroup from datagrid
   */
  getDataGridRowFormGroup(fieldName: string, rowId: string): FormGroup | null {
    const formGroup = this.form.get(fieldName) as FormGroup;
    return (formGroup?.get(rowId) as FormGroup) || null;
  }

  /**
   * Evaluate a formula expression with row data
   */
  private evaluateFormula(expression: string, rowData: Record<string, any>): number | null {
    // Extract column references from expression
    const columnRefs = expression.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];

    // Check all referenced columns have values
    for (const ref of columnRefs) {
      const value = rowData[ref];
      if (value === undefined || value === '' || value === null) {
        return null;
      }
    }

    // Substitute values and evaluate
    let evalExpression = expression;
    for (const ref of columnRefs) {
      const value = parseFloat(rowData[ref]);
      if (isNaN(value)) return null;
      evalExpression = evalExpression.replace(new RegExp(`\\b${ref}\\b`, 'g'), String(value));
    }

    // Safe math evaluation
    try {
      const result = new Function(`return ${evalExpression}`)();
      return typeof result === 'number' && !isNaN(result) && isFinite(result) ? result : null;
    } catch {
      return null;
    }
  }

  /**
   * Get computed value for a datagrid cell
   */
  getDataGridComputedValue(field: FormFieldConfig, rowId: string, column: DataGridColumnConfig): string {
    if (!column.formula) return '';

    const rowGroup = this.getDataGridRowFormGroup(field.name, rowId);
    if (!rowGroup) return '';

    // Get row data including computed values from other columns
    const rowData: Record<string, any> = { ...rowGroup.value };

    // Add computed columns to rowData for dependent calculations
    field.datagridConfig?.columns.forEach((col) => {
      if (col.computed && col.formula && col.name !== column.name) {
        const computedResult = this.evaluateFormula(col.formula.expression, rowGroup.value);
        if (computedResult !== null) {
          rowData[col.name] = computedResult;
        }
      }
    });

    const result = this.evaluateFormula(column.formula.expression, rowData);
    return result !== null ? result.toFixed(2) : '';
  }

  /**
   * Get numeric computed value (for totals calculation)
   */
  private getDataGridComputedNumericValue(
    field: FormFieldConfig,
    rowId: string,
    column: DataGridColumnConfig
  ): number {
    const stringValue = this.getDataGridComputedValue(field, rowId, column);
    return stringValue ? parseFloat(stringValue) : NaN;
  }

  /**
   * Get row total for a datagrid row
   */
  getDataGridRowTotal(field: FormFieldConfig, rowId: string): string {
    const rowGroup = this.getDataGridRowFormGroup(field.name, rowId);
    if (!rowGroup) return '';

    const columns =
      field.datagridConfig?.columns.filter(
        (c) => c.type === 'number' && c.showInRowTotal !== false
      ) || [];

    let total = 0;
    let hasValue = false;

    for (const column of columns) {
      let value: number;
      if (column.computed) {
        value = this.getDataGridComputedNumericValue(field, rowId, column);
      } else {
        value = parseFloat(rowGroup.get(column.name)?.value);
      }
      if (!isNaN(value)) {
        total += value;
        hasValue = true;
      }
    }

    return hasValue ? total.toFixed(2) : '';
  }

  /**
   * Get column total for a datagrid column
   */
  getDataGridColumnTotal(field: FormFieldConfig, columnName: string): string {
    const column = this.getDataGridColumn(field, columnName);
    if (!column || column.showInColumnTotal === false) return '';

    const rowLabels = field.datagridConfig?.rowLabels || [];

    let total = 0;
    let hasValue = false;

    for (const rowLabel of rowLabels) {
      let value: number;
      if (column.computed) {
        value = this.getDataGridComputedNumericValue(field, rowLabel.id, column);
      } else {
        const rowGroup = this.getDataGridRowFormGroup(field.name, rowLabel.id);
        value = parseFloat(rowGroup?.get(columnName)?.value);
      }
      if (!isNaN(value)) {
        total += value;
        hasValue = true;
      }
    }

    return hasValue ? total.toFixed(2) : '';
  }

  /**
   * Get grand total (sum of all row totals or column totals)
   */
  getDataGridGrandTotal(field: FormFieldConfig): string {
    const rowLabels = field.datagridConfig?.rowLabels || [];
    const columns =
      field.datagridConfig?.columns.filter(
        (c) => c.type === 'number' && c.showInRowTotal !== false
      ) || [];

    let total = 0;
    let hasValue = false;

    for (const rowLabel of rowLabels) {
      for (const column of columns) {
        let value: number;
        if (column.computed) {
          value = this.getDataGridComputedNumericValue(field, rowLabel.id, column);
        } else {
          const rowGroup = this.getDataGridRowFormGroup(field.name, rowLabel.id);
          value = parseFloat(rowGroup?.get(column.name)?.value);
        }
        if (!isNaN(value)) {
          total += value;
          hasValue = true;
        }
      }
    }

    return hasValue ? total.toFixed(2) : '';
  }

  /**
   * Check if datagrid is valid (all non-computed cells are valid)
   */
  isDataGridValid(fieldName: string): boolean {
    const field = this.getField(fieldName);
    if (!field || field.type !== 'datagrid') return true;

    const formGroup = this.form.get(fieldName) as FormGroup;
    if (!formGroup) return true;

    for (const rowId of Object.keys(formGroup.controls)) {
      const rowGroup = formGroup.get(rowId) as FormGroup;
      if (rowGroup?.invalid) return false;
    }

    return true;
  }

  /**
   * Check if datagrid cell has error
   */
  hasDataGridCellError(fieldName: string, rowId: string, columnName: string): boolean {
    const rowGroup = this.getDataGridRowFormGroup(fieldName, rowId);
    if (!rowGroup) return false;

    const control = rowGroup.get(columnName);
    if (!control) return false;

    return control.invalid && control.touched;
  }

  /**
   * Get datagrid cell error message
   */
  getDataGridCellErrorMessage(
    field: FormFieldConfig,
    rowId: string,
    columnName: string
  ): string {
    const datagridConfig = field.datagridConfig;
    if (!datagridConfig) return '';

    const column = datagridConfig.columns.find((c) => c.name === columnName);
    if (!column) return '';

    const rowGroup = this.getDataGridRowFormGroup(field.name, rowId);
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
   * Check if a datagrid column has required validation
   */
  hasDataGridColumnRequiredValidation(column: DataGridColumnConfig): boolean {
    return column.validations?.some((v) => v.type === 'required') ?? false;
  }

  /**
   * Mark all datagrid cells as touched (for form submission)
   */
  private markDataGridFieldsTouched(): void {
    const currentConfig = this.config();
    currentConfig.fields.forEach((field) => {
      if (field.type === 'datagrid') {
        const formGroup = this.form.get(field.name) as FormGroup;
        if (formGroup) {
          Object.keys(formGroup.controls).forEach((rowId) => {
            const rowGroup = formGroup.get(rowId) as FormGroup;
            if (rowGroup) {
              Object.keys(rowGroup.controls).forEach((key) => {
                rowGroup.get(key)?.markAsTouched();
              });
            }
          });
        }
      }
    });
  }

  // ============================================
  // Phone Field Methods
  // ============================================

  /**
   * Get FormGroup for a phone field
   */
  getPhoneFormGroup(fieldName: string): FormGroup | null {
    const control = this.form.get(fieldName);
    return control instanceof FormGroup ? control : null;
  }

  /**
   * Handle phone number input - filter to only allow numeric characters
   */
  onPhoneNumberInput(event: Event, fieldName: string): void {
    const input = event.target as HTMLInputElement;
    const filteredValue = input.value.replace(/\D/g, '');
    if (input.value !== filteredValue) {
      input.value = filteredValue;
      const phoneGroup = this.getPhoneFormGroup(fieldName);
      if (phoneGroup) {
        phoneGroup.get('number')?.setValue(filteredValue);
      }
    }
  }

  /**
   * Check if phone field is valid
   */
  isPhoneValid(fieldName: string): boolean {
    const phoneGroup = this.getPhoneFormGroup(fieldName);
    if (!phoneGroup) return true;

    const numberControl = phoneGroup.get('number');
    return !numberControl?.invalid;
  }

  /**
   * Check if phone field has error (for display)
   */
  hasPhoneError(fieldName: string): boolean {
    const phoneGroup = this.getPhoneFormGroup(fieldName);
    if (!phoneGroup) return false;

    const numberControl = phoneGroup.get('number');
    return !!(numberControl?.invalid && numberControl?.touched);
  }

  /**
   * Get phone error message
   */
  getPhoneErrorMessage(fieldName: string): string {
    const field = this.getField(fieldName);
    if (!field) return '';

    const phoneGroup = this.getPhoneFormGroup(fieldName);
    if (!phoneGroup) return '';

    const numberControl = phoneGroup.get('number');
    if (!numberControl || !numberControl.errors) return '';

    // Check for pattern error first (non-numeric characters)
    if (numberControl.hasError('pattern')) {
      return 'Phone number must contain only digits';
    }

    // Check validation rules from field config
    const validations = field.validations || [];
    for (const validation of validations) {
      if (validation.type === 'required' && numberControl.hasError('required')) {
        return validation.message;
      }
    }

    return 'Invalid phone number';
  }

  /**
   * Mark phone fields as touched (for form submission)
   */
  private markPhoneFieldsTouched(): void {
    const currentConfig = this.config();
    currentConfig.fields.forEach((field) => {
      if (field.type === 'phone') {
        const phoneGroup = this.getPhoneFormGroup(field.name);
        if (phoneGroup) {
          phoneGroup.get('countryCode')?.markAsTouched();
          phoneGroup.get('number')?.markAsTouched();
        }
      }
    });
  }

  // ============================================
  // Date Range Field Methods
  // ============================================

  /**
   * Get FormGroup for a daterange field
   */
  getDateRangeFormGroup(fieldName: string): FormGroup | null {
    const control = this.form.get(fieldName);
    return control instanceof FormGroup ? control : null;
  }

  /**
   * Check if daterange field is valid
   */
  isDateRangeValid(fieldName: string): boolean {
    const dateRangeGroup = this.getDateRangeFormGroup(fieldName);
    if (!dateRangeGroup) return true;

    const fromControl = dateRangeGroup.get('fromDate');
    const toControl = dateRangeGroup.get('toDate');
    return !fromControl?.invalid && !toControl?.invalid;
  }

  /**
   * Check if daterange field has error (for display)
   */
  hasDateRangeError(fieldName: string): boolean {
    const dateRangeGroup = this.getDateRangeFormGroup(fieldName);
    if (!dateRangeGroup) return false;

    const fromControl = dateRangeGroup.get('fromDate');
    const toControl = dateRangeGroup.get('toDate');
    const fromHasError = !!(fromControl?.invalid && fromControl?.touched);
    const toHasError = !!(toControl?.invalid && toControl?.touched);
    return fromHasError || toHasError;
  }

  /**
   * Get daterange error message
   */
  getDateRangeErrorMessage(fieldName: string): string {
    const field = this.getField(fieldName);
    if (!field) return '';

    const dateRangeGroup = this.getDateRangeFormGroup(fieldName);
    if (!dateRangeGroup) return '';

    const fromControl = dateRangeGroup.get('fromDate');
    const toControl = dateRangeGroup.get('toDate');

    // Check validation rules from field config
    const validations = field.validations || [];
    for (const validation of validations) {
      if (validation.type === 'required') {
        if (fromControl?.hasError('required') || toControl?.hasError('required')) {
          return validation.message;
        }
      }
    }

    return 'Invalid date range';
  }

  /**
   * Mark daterange fields as touched (for form submission)
   */
  private markDateRangeFieldsTouched(): void {
    const currentConfig = this.config();
    currentConfig.fields.forEach((field) => {
      if (field.type === 'daterange') {
        const dateRangeGroup = this.getDateRangeFormGroup(field.name);
        if (dateRangeGroup) {
          dateRangeGroup.get('fromDate')?.markAsTouched();
          dateRangeGroup.get('toDate')?.markAsTouched();
        }
      }
    });
  }

  /**
   * Mark formref fields as touched (for form submission)
   */
  private markFormRefFieldsTouched(): void {
    const currentConfig = this.config();
    currentConfig.fields.forEach((field) => {
      if (field.type === 'formref') {
        const formRefGroup = this.getFormRefFormGroup(field.name);
        if (formRefGroup) {
          Object.keys(formRefGroup.controls).forEach((controlName) => {
            formRefGroup.get(controlName)?.markAsTouched();
          });
        }
      }
    });
  }

  // ============================================
  // Async Validation Methods
  // ============================================

  /**
   * Set up async validation for all fields that have asyncValidation config
   */
  private setupAsyncValidation(): void {
    const currentConfig = this.config();

    currentConfig.fields.forEach((field) => {
      if (field.asyncValidation) {
        this.setupFieldAsyncValidation(field);
      }
    });
  }

  /**
   * Set up async validation for a single field
   */
  private setupFieldAsyncValidation(field: FormFieldConfig): void {
    const asyncConfig = field.asyncValidation;
    if (!asyncConfig) return;

    // Get the async validator from the registry by name
    const validator = this.asyncValidatorRegistry.get(asyncConfig.validatorName);
    if (!validator) {
      console.warn(`DynamicForm: Async validator "${asyncConfig.validatorName}" not registered for field "${field.name}"`);
      return;
    }

    const control = this.form.get(field.name);
    if (!control) return;

    // Create a subject for this field's async validation
    const validationSubject = new Subject<any>();
    this.asyncValidationSubjects.set(field.name, validationSubject);

    const debounceMs = asyncConfig.debounceMs ?? 300;
    const trigger = asyncConfig.trigger ?? 'blur';

    // Set up the validation pipeline
    validationSubject
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(debounceMs),
        filter((value) => {
          // Skip validation for empty values if not required
          const isRequired = field.validations?.some((v) => v.type === 'required');
          if (!isRequired && (value === '' || value === null || value === undefined)) {
            // Clear any previous async error for this field
            this.externalErrors.delete(field.name);
            // Remove from validating since we're skipping
            this.validatingFields.delete(field.name);
            this.updateErrors();
            this.cdr.markForCheck();
            return false;
          }
          return true;
        }),
        switchMap(async (value) => {
          try {
            // Call the named async validator from the registry
            const result = await validator(value, asyncConfig.params, field, this.form.value);
            return { field: field.name, result, value };
          } catch (error) {
            console.error(`DynamicForm: Async validator "${asyncConfig.validatorName}" threw error:`, error);
            return {
              field: field.name,
              result: { valid: false, message: 'Validation failed' },
              value,
            };
          }
        })
      )
      .subscribe(({ field: fieldName, result }) => {
        // Mark field as no longer validating
        this.validatingFields.delete(fieldName);

        // Update external errors based on result
        if (result.valid) {
          this.externalErrors.delete(fieldName);
        } else {
          this.externalErrors.set(fieldName, result.message || 'Invalid value');
        }

        this.updateErrors();
        this.cdr.markForCheck();
      });

    // For 'change' trigger, subscribe to value changes
    // For 'blur' trigger, validation is handled by onFocusOut()
    if (trigger === 'change') {
      control.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((value) => {
        // Clear external error when value changes
        this.externalErrors.delete(field.name);
        validationSubject.next(value);
      });
    }
  }

  /**
   * Trigger async validation for a field manually (e.g., on blur event)
   */
  triggerAsyncValidation(fieldName: string): void {
    const subject = this.asyncValidationSubjects.get(fieldName);
    const control = this.form.get(fieldName);
    if (subject && control) {
      // Mark as validating immediately so submit/save are blocked during debounce
      this.validatingFields.add(fieldName);
      this.cdr.markForCheck();
      subject.next(control.value);
    }
  }

  /**
   * Run all async validations and wait for them to complete
   * Returns true if all validations pass
   */
  async validateAllAsync(): Promise<boolean> {
    const currentConfig = this.config();
    const asyncFields = currentConfig.fields.filter((f) => f.asyncValidation);

    if (asyncFields.length === 0) return true;

    // Trigger all async validations
    const validationPromises = asyncFields.map(async (field) => {
      const asyncConfig = field.asyncValidation!;
      const control = this.form.get(field.name);
      if (!control) return true;

      // Get the async validator from the registry by name
      const validator = this.asyncValidatorRegistry.get(asyncConfig.validatorName);
      if (!validator) {
        console.warn(`DynamicForm: Async validator "${asyncConfig.validatorName}" not registered for field "${field.name}"`);
        return true;
      }

      const value = control.value;

      // Skip empty non-required fields
      const isRequired = field.validations?.some((v) => v.type === 'required');
      if (!isRequired && (value === '' || value === null || value === undefined)) {
        return true;
      }

      this.validatingFields.add(field.name);

      try {
        // Call the named async validator from the registry
        const result = await validator(value, asyncConfig.params, field, this.form.value);
        this.validatingFields.delete(field.name);

        if (result.valid) {
          this.externalErrors.delete(field.name);
        } else {
          this.externalErrors.set(field.name, result.message || 'Invalid value');
        }

        return result.valid;
      } catch (error) {
        console.error(`DynamicForm: Async validator "${asyncConfig.validatorName}" threw error:`, error);
        this.validatingFields.delete(field.name);
        this.externalErrors.set(field.name, 'Validation failed');
        return false;
      }
    });

    const results = await Promise.all(validationPromises);
    this.updateErrors();

    return results.every((r) => r);
  }

  // ============================================
  // File Upload Field Methods
  // ============================================

  /**
   * Create FormArray for a file upload field
   * The FormArray stores FileUploadValue objects for successfully uploaded files
   */
  private createFileUploadFormArray(field: FormFieldConfig): FormArray {
    const existingValue = (field.value as FileUploadValue[]) || [];
    const isDisabled = field.disabled ?? field.archived ?? false;

    // Create FormControl for each existing uploaded file
    const controls = existingValue.map((fileValue) => {
      return new FormControl({ value: fileValue, disabled: isDisabled });
    });

    // Initialize upload states map for this field
    this.uploadStates.set(field.name, new Map());
    this.uploadAbortControllers.set(field.name, new Map());

    // Populate upload states from existing values (as completed)
    existingValue.forEach((fileValue) => {
      const fileId = this.generateFileId();
      const state: FileUploadState = {
        id: fileId,
        fileName: fileValue.fileName,
        fileSize: fileValue.fileSize,
        mimeType: fileValue.mimeType,
        status: 'completed',
        progress: 100,
        reference: fileValue.reference,
        metadata: fileValue.metadata,
      };
      this.uploadStates.get(field.name)!.set(fileId, state);
    });

    return new FormArray(controls);
  }

  /**
   * Get FormArray for a file upload field
   */
  getFileUploadFormArray(fieldName: string): FormArray | null {
    const control = this.form.get(fieldName);
    return control instanceof FormArray ? control : null;
  }

  /**
   * Get all upload states for a field (includes pending, uploading, completed, failed)
   */
  getFileUploadStates(fieldName: string): FileUploadState[] {
    const statesMap = this.uploadStates.get(fieldName);
    return statesMap ? Array.from(statesMap.values()) : [];
  }

  /**
   * Check if any file in the field is currently uploading
   */
  isFileUploading(fieldName: string): boolean {
    const states = this.getFileUploadStates(fieldName);
    return states.some((s) => s.status === 'uploading');
  }

  /**
   * Check if drag is active for a field
   */
  isDragActive(fieldName: string): boolean {
    return this.dragActiveFields().has(fieldName);
  }

  /**
   * Handle files selected via input
   */
  onFilesSelected(event: Event, field: FormFieldConfig): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) return;

    this.processSelectedFiles(Array.from(files), field);

    // Reset the input so the same file can be selected again
    input.value = '';
  }

  /**
   * Handle drag over event
   */
  onDragOver(event: DragEvent, field: FormFieldConfig): void {
    event.preventDefault();
    event.stopPropagation();

    if (field.fileuploadConfig?.allowDragDrop === false) return;

    const current = this.dragActiveFields();
    if (!current.has(field.name)) {
      this.dragActiveFields.set(new Set([...current, field.name]));
    }
  }

  /**
   * Handle drag leave event
   */
  onDragLeave(event: DragEvent, field: FormFieldConfig): void {
    event.preventDefault();
    event.stopPropagation();

    const current = this.dragActiveFields();
    const newSet = new Set(current);
    newSet.delete(field.name);
    this.dragActiveFields.set(newSet);
  }

  /**
   * Handle drop event
   */
  onDrop(event: DragEvent, field: FormFieldConfig): void {
    event.preventDefault();
    event.stopPropagation();

    // Clear drag active state
    const current = this.dragActiveFields();
    const newSet = new Set(current);
    newSet.delete(field.name);
    this.dragActiveFields.set(newSet);

    if (field.fileuploadConfig?.allowDragDrop === false) return;

    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;

    this.processSelectedFiles(Array.from(files), field);
  }

  /**
   * Process selected files - validate and add to upload queue
   */
  private processSelectedFiles(files: File[], field: FormFieldConfig): void {
    const config = field.fileuploadConfig || {};
    const maxFiles = config.maxFiles ?? 1;
    const currentStates = this.getFileUploadStates(field.name);
    const successfulCount = currentStates.filter(
      (s) => s.status === 'completed' || s.status === 'pending' || s.status === 'uploading'
    ).length;

    // Determine how many more files we can add
    const availableSlots = maxFiles - successfulCount;
    const filesToProcess = files.slice(0, availableSlots);

    for (const file of filesToProcess) {
      const validation = this.validateFile(file, config);
      if (!validation.valid) {
        // Add as failed state with validation error
        const fileId = this.generateFileId();
        const state: FileUploadState = {
          id: fileId,
          file: file,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          status: 'failed',
          progress: 0,
          error: validation.error,
        };
        this.uploadStates.get(field.name)!.set(fileId, state);
        continue;
      }

      // Add file as pending
      const fileId = this.generateFileId();
      const state: FileUploadState = {
        id: fileId,
        file: file,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        status: 'pending',
        progress: 0,
      };
      this.uploadStates.get(field.name)!.set(fileId, state);

      // If immediate upload timing, start upload
      if ((config.uploadTiming ?? 'immediate') === 'immediate') {
        this.startUpload(field.name, fileId);
      }
    }

    // Mark form control as touched
    const formArray = this.getFileUploadFormArray(field.name);
    if (formArray) {
      formArray.markAsTouched();
      formArray.markAsDirty();
    }
  }

  /**
   * Validate a file against the config
   */
  validateFile(file: File, config: FileUploadConfig): { valid: boolean; error?: string } {
    // Check file size
    const maxSize = config.maxFileSize ?? 10 * 1024 * 1024; // Default 10MB
    if (file.size > maxSize) {
      return { valid: false, error: `File exceeds maximum size of ${this.formatFileSize(maxSize)}` };
    }

    // Check allowed extensions
    if (config.allowedExtensions && config.allowedExtensions.length > 0) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      const normalizedExtensions = config.allowedExtensions.map((e) => e.toLowerCase());
      if (!normalizedExtensions.includes(ext)) {
        return { valid: false, error: `File type not allowed. Allowed: ${config.allowedExtensions.join(', ')}` };
      }
    }

    // Check allowed MIME types
    if (config.allowedMimeTypes && config.allowedMimeTypes.length > 0) {
      const mimeMatches = config.allowedMimeTypes.some((allowed) => {
        if (allowed.endsWith('/*')) {
          // Wildcard match (e.g., 'image/*')
          const prefix = allowed.slice(0, -1);
          return file.type.startsWith(prefix);
        }
        return file.type === allowed;
      });
      if (!mimeMatches) {
        return { valid: false, error: `File type ${file.type} not allowed` };
      }
    }

    return { valid: true };
  }

  /**
   * Start uploading a file
   */
  async startUpload(fieldName: string, fileId: string): Promise<void> {
    const handler = this.fileUploadHandler();
    if (!handler) {
      // Mark the file as failed with a helpful error message
      const statesMap = this.uploadStates.get(fieldName);
      const state = statesMap?.get(fileId);
      if (state) {
        state.status = 'failed';
        state.error = 'File upload handler not configured';
        this.cdr.markForCheck();
      }
      console.error('FileUploadHandler not provided. Pass a [fileUploadHandler] function to enable file uploads.');
      return;
    }

    const statesMap = this.uploadStates.get(fieldName);
    if (!statesMap) return;

    const state = statesMap.get(fileId);
    if (!state || !state.file) return;

    // Update state to uploading
    state.status = 'uploading';
    state.progress = 0;

    // Create abort controller
    const abortController = new AbortController();
    const controllersMap = this.uploadAbortControllers.get(fieldName);
    if (controllersMap) {
      controllersMap.set(fileId, abortController);
    }

    try {
      const result = await handler(
        state.file,
        (progress) => {
          // Update progress
          state.progress = progress;
          this.cdr.markForCheck();
        },
        abortController.signal
      );

      if (result.success) {
        state.status = 'completed';
        state.progress = 100;
        state.reference = result.reference;
        state.metadata = result.metadata;

        // Add to form array
        const formArray = this.getFileUploadFormArray(fieldName);
        if (formArray) {
          const fileValue: FileUploadValue = {
            reference: result.reference!,
            fileName: state.fileName,
            fileSize: state.fileSize,
            mimeType: state.mimeType,
            metadata: result.metadata,
          };
          formArray.push(new FormControl(fileValue));
        }
      } else {
        state.status = 'failed';
        state.error = result.error || 'Upload failed';
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        state.status = 'cancelled';
      } else {
        state.status = 'failed';
        state.error = error.message || 'Upload failed';
      }
    } finally {
      // Clean up abort controller
      controllersMap?.delete(fileId);
      this.cdr.markForCheck();
    }
  }

  /**
   * Cancel an ongoing upload
   */
  cancelUpload(fieldName: string, fileId: string): void {
    const controllersMap = this.uploadAbortControllers.get(fieldName);
    const controller = controllersMap?.get(fileId);
    if (controller) {
      controller.abort();
    }
  }

  /**
   * Retry a failed upload
   */
  retryUpload(fieldName: string, fileId: string): void {
    const statesMap = this.uploadStates.get(fieldName);
    const state = statesMap?.get(fileId);
    if (state && (state.status === 'failed' || state.status === 'cancelled') && state.file) {
      state.status = 'pending';
      state.progress = 0;
      state.error = undefined;
      this.startUpload(fieldName, fileId);
    }
  }

  /**
   * Check if download is available (handler is provided and config allows)
   */
  isDownloadAvailable(field: FormFieldConfig): boolean {
    const config = field.fileuploadConfig || {};
    return !!this.fileDownloadHandler() && (config.allowDownload !== false);
  }

  /**
   * Download a completed file
   */
  async downloadFile(fieldName: string, fileId: string): Promise<void> {
    const handler = this.fileDownloadHandler();
    if (!handler) {
      console.error('FileDownloadHandler not provided');
      return;
    }

    const statesMap = this.uploadStates.get(fieldName);
    const state = statesMap?.get(fileId);
    if (!state || state.status !== 'completed' || !state.reference) {
      console.error('File not available for download');
      return;
    }

    // Create FileUploadValue from state
    const fileValue: FileUploadValue = {
      reference: state.reference,
      fileName: state.fileName,
      fileSize: state.fileSize,
      mimeType: state.mimeType,
      metadata: state.metadata,
    };

    await handler(fileValue);
  }

  /**
   * Remove a file from the upload queue or completed list
   */
  removeFile(fieldName: string, fileId: string): void {
    const statesMap = this.uploadStates.get(fieldName);
    const state = statesMap?.get(fileId);
    if (!state) return;

    // Cancel if uploading
    if (state.status === 'uploading') {
      this.cancelUpload(fieldName, fileId);
    }

    // Remove from form array if completed
    if (state.status === 'completed' && state.reference) {
      const formArray = this.getFileUploadFormArray(fieldName);
      if (formArray) {
        const index = formArray.controls.findIndex(
          (c) => c.value?.reference === state.reference
        );
        if (index !== -1) {
          formArray.removeAt(index);
        }
      }
    }

    // Remove from states
    statesMap?.delete(fileId);
    this.cdr.markForCheck();
  }

  /**
   * Trigger the hidden file input for a field
   */
  triggerFileInput(fieldName: string): void {
    const input = document.querySelector(
      `input[type="file"][data-fileupload-input="${fieldName}"]`
    ) as HTMLInputElement;
    if (input) {
      input.click();
    }
  }

  /**
   * Check if file upload field is valid
   */
  isFileUploadValid(fieldName: string): boolean {
    const field = this.getField(fieldName);
    if (!field || field.type !== 'fileupload') return true;

    const config = field.fileuploadConfig || {};
    const minFiles = config.minFiles ?? 0;
    const states = this.getFileUploadStates(fieldName);
    const completedCount = states.filter((s) => s.status === 'completed').length;

    // Check if required and has at least one file
    const isRequired = field.validations?.some((v) => v.type === 'required');
    if (isRequired && completedCount === 0) {
      return false;
    }

    // Check minimum files
    if (completedCount < minFiles) {
      return false;
    }

    return true;
  }

  /**
   * Check if file upload field has error (for display)
   */
  hasFileUploadError(fieldName: string): boolean {
    const formArray = this.getFileUploadFormArray(fieldName);
    if (!formArray?.touched) return false;

    return !this.isFileUploadValid(fieldName);
  }

  /**
   * Get file upload error message
   */
  getFileUploadErrorMessage(fieldName: string): string {
    const field = this.getField(fieldName);
    if (!field) return '';

    const config = field.fileuploadConfig || {};
    const minFiles = config.minFiles ?? 0;
    const states = this.getFileUploadStates(fieldName);
    const completedCount = states.filter((s) => s.status === 'completed').length;

    // Check required validation
    const isRequired = field.validations?.some((v) => v.type === 'required');
    if (isRequired && completedCount === 0) {
      const requiredValidation = field.validations?.find((v) => v.type === 'required');
      return requiredValidation?.message || 'File is required';
    }

    // Check minimum files
    if (completedCount < minFiles) {
      return `At least ${minFiles} file(s) required`;
    }

    return '';
  }

  /**
   * Get file validation errors for display
   */
  getFileValidationErrors(fieldName: string): { fileName: string; error: string }[] {
    const states = this.getFileUploadStates(fieldName);
    return states
      .filter((s) => s.status === 'failed' && s.error)
      .map((s) => ({ fileName: s.fileName, error: s.error! }));
  }

  /**
   * Check if maximum files reached
   */
  isMaxFilesReached(fieldName: string): boolean {
    const field = this.getField(fieldName);
    if (!field) return false;

    const config = field.fileuploadConfig || {};
    const maxFiles = config.maxFiles ?? 1;
    const states = this.getFileUploadStates(fieldName);
    const activeCount = states.filter(
      (s) => s.status === 'completed' || s.status === 'pending' || s.status === 'uploading'
    ).length;

    return activeCount >= maxFiles;
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get accept attribute for file input
   */
  getAcceptAttribute(field: FormFieldConfig): string {
    const config = field.fileuploadConfig || {};
    const accept: string[] = [];

    if (config.allowedExtensions) {
      accept.push(...config.allowedExtensions);
    }

    if (config.allowedMimeTypes) {
      accept.push(...config.allowedMimeTypes);
    }

    return accept.join(',');
  }

  /**
   * Generate unique file ID
   */
  private generateFileId(): string {
    return `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Check if there are pending uploads that need manual triggering
   */
  hasPendingUploads(fieldName: string): boolean {
    const states = this.getFileUploadStates(fieldName);
    return states.some((s) => s.status === 'pending');
  }

  /**
   * Start all pending uploads for a field
   */
  startAllPendingUploads(fieldName: string): void {
    const states = this.getFileUploadStates(fieldName);
    states
      .filter((s) => s.status === 'pending')
      .forEach((s) => this.startUpload(fieldName, s.id));
  }

  /**
   * Mark file upload fields as touched (for form submission)
   */
  private markFileUploadFieldsTouched(): void {
    const currentConfig = this.config();
    currentConfig.fields.forEach((field) => {
      if (field.type === 'fileupload') {
        const formArray = this.getFileUploadFormArray(field.name);
        if (formArray) {
          formArray.markAsTouched();
        }
      }
    });
  }

  // ============================================
  // Autocomplete Methods
  // ============================================

  /**
   * Create FormControl for an autocomplete field
   * Value is stored as { value: any, label: string } or null
   */
  private createAutocompleteFormControl(field: FormFieldConfig): FormControl {
    const validators = field.archived ? [] : this.buildValidators(field.validations || []);
    const defaultValue = field.value ?? null;

    return new FormControl(
      { value: defaultValue, disabled: field.disabled ?? field.archived ?? false },
      validators
    );
  }

  /**
   * Set up autocomplete search subscriptions for all autocomplete fields
   */
  private setupAutocompleteFields(): void {
    const currentConfig = this.config();

    currentConfig.fields.forEach((field) => {
      if (field.type === 'autocomplete' && field.autocompleteConfig) {
        this.setupAutocompleteSearch(field);
      }
    });
  }

  /**
   * Set up search subscription for a single autocomplete field
   */
  private setupAutocompleteSearch(field: FormFieldConfig): void {
    const config = field.autocompleteConfig!;
    const handler = this.autocompleteFetchRegistry.get(config.fetchHandlerName);

    if (!handler) {
      console.warn(`DynamicForm: Autocomplete fetch handler "${config.fetchHandlerName}" not registered for field "${field.name}"`);
      return;
    }

    const searchSubject = new Subject<string>();
    this.autocompleteSearchSubjects.set(field.name, searchSubject);

    const debounceMs = config.debounceMs ?? 300;
    const minSearchLength = config.minSearchLength ?? 2;

    searchSubject
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(debounceMs),
        distinctUntilChanged(),
        filter((searchText) => searchText.length >= minSearchLength),
        switchMap(async (searchText) => {
          // Mark as loading
          const loadingSet = new Set(this.autocompleteLoading());
          loadingSet.add(field.name);
          this.autocompleteLoading.set(loadingSet);
          this.cdr.markForCheck();

          try {
            const results = await handler(searchText, config.params, field, this.form.value);
            return { fieldName: field.name, results, error: null };
          } catch (error) {
            console.error(`DynamicForm: Autocomplete fetch error for "${field.name}":`, error);
            return { fieldName: field.name, results: [], error };
          }
        })
      )
      .subscribe(({ fieldName, results }) => {
        // Update options
        const optionsMap = new Map(this.autocompleteOptions());
        optionsMap.set(fieldName, results);
        this.autocompleteOptions.set(optionsMap);

        // Remove loading state
        const loadingSet = new Set(this.autocompleteLoading());
        loadingSet.delete(fieldName);
        this.autocompleteLoading.set(loadingSet);

        // Reset highlighted index
        const highlightMap = new Map(this.autocompleteHighlightedIndex());
        highlightMap.set(fieldName, 0);
        this.autocompleteHighlightedIndex.set(highlightMap);

        this.cdr.markForCheck();
      });
  }

  /**
   * Handle autocomplete input changes
   */
  onAutocompleteInput(event: Event, fieldName: string): void {
    const input = event.target as HTMLInputElement;
    const searchText = input.value;

    // Update search text
    const searchMap = new Map(this.autocompleteSearchText());
    searchMap.set(fieldName, searchText);
    this.autocompleteSearchText.set(searchMap);

    // Clear current selection if text changes
    const control = this.form.get(fieldName);
    if (control?.value && searchText !== control.value.label) {
      control.setValue(null);
    }

    // Get field config for min search length
    const field = this.config().fields.find(f => f.name === fieldName);
    const minSearchLength = field?.autocompleteConfig?.minSearchLength ?? 2;

    // Trigger search if minimum length met
    const subject = this.autocompleteSearchSubjects.get(fieldName);
    if (subject) {
      if (searchText.length >= minSearchLength) {
        this.openAutocompleteDropdown(fieldName);
        subject.next(searchText);
      } else {
        this.closeAutocompleteDropdown(fieldName);
        // Clear options when below min length
        const optionsMap = new Map(this.autocompleteOptions());
        optionsMap.delete(fieldName);
        this.autocompleteOptions.set(optionsMap);
      }
    }
  }

  /**
   * Handle autocomplete option selection
   */
  selectAutocompleteOption(fieldName: string, option: AutocompleteOption): void {
    const control = this.form.get(fieldName);
    if (control) {
      control.setValue({ value: option.value, label: option.label });
      control.markAsTouched();
      control.markAsDirty();
    }

    // Update search text to show selected label
    const searchMap = new Map(this.autocompleteSearchText());
    searchMap.set(fieldName, option.label);
    this.autocompleteSearchText.set(searchMap);

    this.closeAutocompleteDropdown(fieldName);
  }

  /**
   * Clear autocomplete selection
   */
  clearAutocompleteSelection(fieldName: string): void {
    const control = this.form.get(fieldName);
    if (control) {
      control.setValue(null);
      control.markAsTouched();
      control.markAsDirty();
    }

    const searchMap = new Map(this.autocompleteSearchText());
    searchMap.set(fieldName, '');
    this.autocompleteSearchText.set(searchMap);

    // Clear options
    const optionsMap = new Map(this.autocompleteOptions());
    optionsMap.delete(fieldName);
    this.autocompleteOptions.set(optionsMap);
  }

  /**
   * Handle keyboard navigation in autocomplete dropdown
   */
  onAutocompleteKeydown(event: KeyboardEvent, fieldName: string): void {
    const options = this.getAutocompleteOptions(fieldName);
    const currentIndex = this.getAutocompleteHighlightedIndex(fieldName);

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!this.isAutocompleteDropdownOpen(fieldName)) {
          if (options.length > 0) {
            this.openAutocompleteDropdown(fieldName);
          }
        } else if (options.length > 0) {
          const newIndex = Math.min(currentIndex + 1, options.length - 1);
          this.setAutocompleteHighlightedIndex(fieldName, newIndex);
        }
        break;

      case 'ArrowUp':
        event.preventDefault();
        if (options.length > 0) {
          const newIndex = Math.max(currentIndex - 1, 0);
          this.setAutocompleteHighlightedIndex(fieldName, newIndex);
        }
        break;

      case 'Enter':
        event.preventDefault();
        if (this.isAutocompleteDropdownOpen(fieldName) && options.length > 0) {
          this.selectAutocompleteOption(fieldName, options[currentIndex]);
        }
        break;

      case 'Escape':
        event.preventDefault();
        this.closeAutocompleteDropdown(fieldName);
        break;

      case 'Tab':
        this.closeAutocompleteDropdown(fieldName);
        break;
    }
  }

  /**
   * Open autocomplete dropdown
   */
  openAutocompleteDropdown(fieldName: string): void {
    const openSet = new Set(this.autocompleteDropdownOpen());
    openSet.add(fieldName);
    this.autocompleteDropdownOpen.set(openSet);
  }

  /**
   * Close autocomplete dropdown
   */
  closeAutocompleteDropdown(fieldName: string): void {
    const openSet = new Set(this.autocompleteDropdownOpen());
    openSet.delete(fieldName);
    this.autocompleteDropdownOpen.set(openSet);
  }

  /**
   * Check if autocomplete dropdown is open
   */
  isAutocompleteDropdownOpen(fieldName: string): boolean {
    return this.autocompleteDropdownOpen().has(fieldName);
  }

  /**
   * Check if autocomplete is loading
   */
  isAutocompleteLoading(fieldName: string): boolean {
    return this.autocompleteLoading().has(fieldName);
  }

  /**
   * Get autocomplete options for a field
   */
  getAutocompleteOptions(fieldName: string): AutocompleteOption[] {
    return this.autocompleteOptions().get(fieldName) || [];
  }

  /**
   * Get autocomplete search text for a field
   */
  getAutocompleteSearchText(fieldName: string): string {
    // If there's a selected value, show its label
    const control = this.form.get(fieldName);
    if (control?.value?.label) {
      return control.value.label;
    }
    return this.autocompleteSearchText().get(fieldName) || '';
  }

  /**
   * Get autocomplete config for a field
   */
  getAutocompleteConfig(fieldName: string): AutocompleteConfig | undefined {
    const field = this.config().fields.find(f => f.name === fieldName);
    return field?.autocompleteConfig;
  }

  /**
   * Get highlighted index for autocomplete
   */
  getAutocompleteHighlightedIndex(fieldName: string): number {
    return this.autocompleteHighlightedIndex().get(fieldName) || 0;
  }

  /**
   * Set highlighted index for autocomplete
   */
  setAutocompleteHighlightedIndex(fieldName: string, index: number): void {
    const highlightMap = new Map(this.autocompleteHighlightedIndex());
    highlightMap.set(fieldName, index);
    this.autocompleteHighlightedIndex.set(highlightMap);
  }

  /**
   * Check if autocomplete has a selected value
   */
  hasAutocompleteSelection(fieldName: string): boolean {
    const control = this.form.get(fieldName);
    return control?.value !== null && control?.value !== undefined;
  }
}
