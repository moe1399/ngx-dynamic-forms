import { Component, input, output, OnInit, OnDestroy, effect } from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import {
  FormConfig,
  FormFieldConfig,
  ValidationRule,
  FieldError,
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
  form!: FormGroup;
  errors: FieldError[] = [];
  activePopover: string | null = null;
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
    const group: { [key: string]: FormControl } = {};
    const currentConfig = this.config();

    // Sort fields by order if specified
    const sortedFields = [...currentConfig.fields].sort((a, b) => {
      return (a.order ?? 0) - (b.order ?? 0);
    });

    sortedFields.forEach((field) => {
      const validators = this.buildValidators(field.validations || []);
      group[field.name] = new FormControl(
        { value: field.value ?? '', disabled: field.disabled ?? false },
        validators
      );
    });

    this.form = new FormGroup(group);

    // Listen to value changes for validation
    this.form.valueChanges.subscribe(() => {
      this.updateErrors();
    });
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

    this.updateErrors();

    if (this.form.valid) {
      const currentConfig = this.config();
      this.formStorage.saveForm(currentConfig.id, this.form.value, true);
      this.formSubmit.emit(this.form.value);
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
}
