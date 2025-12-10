import { Component, output, signal, computed, input, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  FormConfig,
  FormFieldConfig,
  FormSection,
  ValidationRule,
  FieldType,
} from '../../models/form-config.interface';
import { FormBuilder as FormBuilderService } from '../../services/form-builder';

@Component({
  selector: 'app-form-builder',
  imports: [CommonModule, FormsModule],
  templateUrl: './form-builder.html',
  styleUrl: './form-builder.scss',
})
export class FormBuilder {
  // Inputs
  initialConfig = input<FormConfig | null>(null);

  // Outputs
  configChanged = output<FormConfig>();

  // Current form configuration being edited
  currentConfig!: ReturnType<typeof signal<FormConfig>>;

  // Saved configurations
  savedConfigs = computed(() => this.formBuilderService.savedConfigs());

  // UI state
  selectedFieldIndex = signal<number | null>(null);
  selectedSectionId = signal<string | null>(null);
  showJsonEditor = signal(false);
  jsonEditorContent = signal('');
  message = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  // Field types for dropdown
  fieldTypes: FieldType[] = ['text', 'email', 'number', 'textarea', 'date', 'select', 'radio', 'checkbox'];

  // Validation types
  validationTypes = ['required', 'email', 'minLength', 'maxLength', 'min', 'max', 'pattern'];

  constructor(private formBuilderService: FormBuilderService) {
    // Initialize with blank config, will be updated by effect if initialConfig is provided
    this.currentConfig = signal<FormConfig>(this.formBuilderService.createBlankConfig());

    // Use effect to initialize from input when component is created
    effect(() => {
      const initial = this.initialConfig();
      if (initial) {
        this.currentConfig.set(initial);
      }
    });
  }

  /**
   * Create a new blank form
   */
  createNewForm(): void {
    this.currentConfig.set(this.formBuilderService.createBlankConfig());
    this.selectedFieldIndex.set(null);
    this.showMessage('success', 'New form created');
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
    this.currentConfig.set(config);
    this.selectedFieldIndex.set(config.fields.length - 1);
    this.emitConfigChange();
  }

  /**
   * Update a field
   */
  updateField(index: number, field: FormFieldConfig): void {
    const config = { ...this.currentConfig() };
    config.fields = [...config.fields];
    config.fields[index] = { ...field };
    this.currentConfig.set(config);
    this.emitConfigChange();
  }

  /**
   * Remove a field
   */
  removeField(index: number): void {
    const config = { ...this.currentConfig() };
    config.fields = config.fields.filter((_, i) => i !== index);
    this.currentConfig.set(config);
    this.selectedFieldIndex.set(null);
    this.emitConfigChange();
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
    this.currentConfig.set(config);
    this.selectedFieldIndex.set(index - 1);
    this.emitConfigChange();
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
    this.currentConfig.set(newConfig);
    this.selectedFieldIndex.set(index + 1);
    this.emitConfigChange();
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
    this.currentConfig.set(config);
    this.emitConfigChange();
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
    this.currentConfig.set(config);
    this.emitConfigChange();
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
    this.currentConfig.set(config);
    this.emitConfigChange();
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
    this.showMessage('success', 'Configuration saved successfully');
  }

  /**
   * Load a configuration
   */
  loadConfiguration(id: string): void {
    const config = this.formBuilderService.loadConfig(id);
    if (config) {
      this.currentConfig.set(config);
      this.selectedFieldIndex.set(null);
      this.emitConfigChange();
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
    const json = this.formBuilderService.exportConfig(this.currentConfig());
    this.jsonEditorContent.set(json);
    this.showJsonEditor.set(true);
  }

  /**
   * Import configuration from JSON
   */
  importJson(): void {
    const config = this.formBuilderService.importConfig(this.jsonEditorContent());
    if (config) {
      this.currentConfig.set(config);
      this.selectedFieldIndex.set(null);
      this.showJsonEditor.set(false);
      this.emitConfigChange();
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
    this.currentConfig.set(config);
    this.emitConfigChange();
  }

  /**
   * Emit configuration change
   */
  private emitConfigChange(): void {
    this.configChanged.emit(this.currentConfig());
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
    this.currentConfig.set(config);
    this.selectedSectionId.set(newSection.id);
    this.emitConfigChange();
  }

  /**
   * Update a section
   */
  updateSection(id: string, updates: Partial<FormSection>): void {
    const config = { ...this.currentConfig() };
    config.sections = (config.sections || []).map((section) =>
      section.id === id ? { ...section, ...updates } : section
    );
    this.currentConfig.set(config);
    this.emitConfigChange();
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
    this.currentConfig.set(config);
    this.selectedSectionId.set(null);
    this.emitConfigChange();
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
    this.currentConfig.set(config);
    this.emitConfigChange();
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
    this.currentConfig.set(config);
    this.emitConfigChange();
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
}
