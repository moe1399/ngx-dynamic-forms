import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DynamicForm, NgxFormBuilder, FormConfig, UrlSchemaService } from 'ngx-dynamic-forms';
import { marked } from 'marked';

type ViewType = 'builder' | 'preview' | 'docs' | 'changelog' | 'theme';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, DynamicForm, NgxFormBuilder],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private urlSchemaService = inject(UrlSchemaService);

  // Current view
  currentView = signal<ViewType>('builder');

  // Current form configuration
  currentConfig = signal<FormConfig | null>(null);

  // Submission result
  submissionResult = signal<string>('');

  // Share notification
  shareNotification = signal<string>('');

  // Theme CSS copied notification
  themeCopied = signal<boolean>(false);

  // Documentation content (parsed from README.md)
  docsHtml = signal<string>('');
  docsLoading = signal<boolean>(false);

  ngOnInit(): void {
    this.loadSchemaFromUrl();
    this.loadDocumentation();
  }

  private async loadDocumentation(): Promise<void> {
    this.docsLoading.set(true);
    try {
      const response = await fetch('README.md');
      if (response.ok) {
        const markdown = await response.text();
        const html = await marked(markdown);
        this.docsHtml.set(html);
      }
    } catch (error) {
      console.error('Failed to load documentation:', error);
    } finally {
      this.docsLoading.set(false);
    }
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

  switchView(view: ViewType): void {
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

  async copyThemeCss(): Promise<void> {
    const cssElement = document.getElementById('theme-css-content');
    if (cssElement) {
      try {
        await navigator.clipboard.writeText(cssElement.textContent || '');
        this.themeCopied.set(true);
        setTimeout(() => {
          this.themeCopied.set(false);
        }, 2000);
      } catch {
        console.error('Failed to copy CSS to clipboard');
      }
    }
  }
}
