import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DynamicForm } from './components/dynamic-form/dynamic-form';
import { FormBuilder } from './components/form-builder/form-builder';
import { FormConfig } from './models/form-config.interface';
import { UrlSchemaService } from './services/url-schema';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, DynamicForm, FormBuilder],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private urlSchemaService = inject(UrlSchemaService);

  // Current view: 'builder' or 'preview'
  currentView = signal<'builder' | 'preview'>('builder');

  // Current form configuration
  currentConfig = signal<FormConfig | null>(null);

  // Submission result
  submissionResult = signal<string>('');

  // Share notification
  shareNotification = signal<string>('');

  ngOnInit(): void {
    this.loadSchemaFromUrl();
  }

  private loadSchemaFromUrl(): void {
    if (this.urlSchemaService.hasSchemaInUrl()) {
      const schema = this.urlSchemaService.getSchemaFromUrl();
      if (schema) {
        this.currentConfig.set(schema);
        // Switch to preview tab when loading a shared form
        if (schema.fields.length > 0) {
          this.currentView.set('preview');
        }
        // Clear the URL parameter to avoid confusion
        this.urlSchemaService.clearSchemaFromUrl();
      }
    }
  }

  onConfigChanged(config: FormConfig): void {
    this.currentConfig.set(config);
  }

  async shareForm(): Promise<void> {
    const config = this.currentConfig();
    if (!config || config.fields.length === 0) {
      this.showNotification('No form to share');
      return;
    }

    const success = await this.urlSchemaService.copyShareUrlToClipboard(config);
    if (success) {
      this.showNotification('Share URL copied to clipboard!');
    } else {
      this.showNotification('Failed to copy URL to clipboard');
    }
  }

  private showNotification(message: string): void {
    this.shareNotification.set(message);
    setTimeout(() => {
      this.shareNotification.set('');
    }, 3000);
  }

  switchView(view: 'builder' | 'preview'): void {
    this.currentView.set(view);
  }

  onFormSubmit(data: { [key: string]: any }): void {
    console.log('Form submitted:', data);
    this.submissionResult.set(`Form submitted successfully! Data: ${JSON.stringify(data, null, 2)}`);

    setTimeout(() => {
      this.submissionResult.set('');
    }, 5000);
  }

  onFormSave(data: { [key: string]: any }): void {
    console.log('Form saved:', data);
  }

  onValidationErrors(errors: any[]): void {
    console.log('Validation errors:', errors);
  }
}
