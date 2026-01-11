import { Component, inject, OnInit, signal, viewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {
  DynamicForm,
  NgxFormBuilder,
  FormConfig,
  UrlSchemaService,
  FileUploadHandler,
  FileDownloadHandler,
  FileUploadValue,
} from 'ngx-dynamic-forms';
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

  // Form submitted state (for demo of disable functionality)
  formSubmitted = signal<boolean>(false);

  // Reference to the dynamic form component
  dynamicForm = viewChild<DynamicForm>('dynamicForm');

  // Documentation content (parsed from README.md)
  docsHtml = signal<string>('');
  docsLoading = signal<boolean>(false);

  // Theme CSS content (loaded from default-theme.scss)
  themeCss = signal<string>('');
  themeCssLoading = signal<boolean>(false);

  ngOnInit(): void {
    this.loadSchemaFromUrl();
    this.loadDocumentation();
    this.loadThemeCss();
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

  private async loadThemeCss(): Promise<void> {
    this.themeCssLoading.set(true);
    try {
      const response = await fetch('default-theme.scss');
      if (response.ok) {
        const css = await response.text();
        this.themeCss.set(css);
      }
    } catch (error) {
      console.error('Failed to load theme CSS:', error);
    } finally {
      this.themeCssLoading.set(false);
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

    // Set form to read-only after successful submission
    this.dynamicForm()?.setReadOnly(true);
    this.formSubmitted.set(true);
  }

  /**
   * Re-enable the form for editing
   */
  editForm(): void {
    this.dynamicForm()?.setReadOnly(false);
    this.formSubmitted.set(false);
    this.submissionResult.set('');
  }

  onFormSave(data: { [key: string]: any }): void {
    console.log('Form saved:', data);
  }

  onValidationErrors(errors: any[]): void {
    console.log('Validation errors:', errors);
  }

  /**
   * Mock file upload handler for demo purposes
   * Simulates upload progress and returns a fake reference
   */
  fileUploadHandler: FileUploadHandler = (file, onProgress, abortSignal) => {
    return new Promise((resolve, reject) => {
      let progress = 0;
      // Slower progress to demonstrate the progress bar (5-15% per tick)
      const interval = setInterval(() => {
        if (abortSignal.aborted) {
          clearInterval(interval);
          reject(new DOMException('Upload cancelled', 'AbortError'));
          return;
        }

        progress += 5 + Math.random() * 10;
        if (progress >= 100) {
          progress = 100;
          onProgress(progress);
          clearInterval(interval);
          // Simulate successful upload with mock reference
          resolve({
            success: true,
            reference: `demo-file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            metadata: {
              uploadedAt: new Date().toISOString(),
              originalName: file.name,
            },
          });
        } else {
          onProgress(Math.round(progress));
        }
      }, 300);
    });
  };

  /**
   * Mock file download handler for demo purposes
   * Creates a blob URL and triggers download (in real app, would fetch from server)
   */
  fileDownloadHandler: FileDownloadHandler = (fileValue: FileUploadValue) => {
    // In a real application, this would fetch the file from the server using fileValue.reference
    // For demo purposes, we show an alert with the file info
    alert(
      `Download requested for:\n\n` +
      `File: ${fileValue.fileName}\n` +
      `Size: ${(fileValue.fileSize / 1024).toFixed(2)} KB\n` +
      `Reference: ${fileValue.reference}\n\n` +
      `In a real application, this would download the file from the server.`
    );
  };

  async copyThemeCss(): Promise<void> {
    const css = this.themeCss();
    if (css) {
      try {
        await navigator.clipboard.writeText(css);
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
