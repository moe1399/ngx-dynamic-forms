import { Injectable } from '@angular/core';
import { FormFieldConfig, AsyncValidationResult, AutocompleteOption } from '../models';

/**
 * Custom validator function signature for named validators.
 * Named validators can be registered and used across client and server.
 */
export type CustomValidatorFn = (
  value: any,
  params?: Record<string, any>,
  fieldConfig?: FormFieldConfig,
  formData?: Record<string, any>
) => boolean;

/**
 * Async validator function signature for named validators.
 * Named validators can be registered and used across client and server.
 */
export type AsyncValidatorFn = (
  value: any,
  params?: Record<string, any>,
  fieldConfig?: FormFieldConfig,
  formData?: Record<string, any>
) => Promise<AsyncValidationResult>;

/**
 * Autocomplete fetch handler function signature.
 * Returns a promise that resolves to an array of options.
 *
 * @example
 * ```typescript
 * autocompleteFetchRegistry.register('searchUsers', async (searchText, params) => {
 *   const response = await fetch(`/api/users?q=${encodeURIComponent(searchText)}`);
 *   const users = await response.json();
 *   return users.map(u => ({ value: u.id, label: u.name }));
 * });
 * ```
 */
export type AutocompleteFetchHandler = (
  searchText: string,
  params?: Record<string, any>,
  fieldConfig?: FormFieldConfig,
  formData?: Record<string, any>
) => Promise<AutocompleteOption[]>;

// Shared storage maps - used by both Angular DI instances and global singletons
// This ensures validators registered on the global singleton are visible to Angular components
const sharedValidatorMap = new Map<string, CustomValidatorFn>();
const sharedAsyncValidatorMap = new Map<string, AsyncValidatorFn>();
const sharedFetchHandlerMap = new Map<string, AutocompleteFetchHandler>();

/**
 * Registry for custom validators that can be referenced by name.
 * Register validators here to use them in ValidationRule.customValidatorName.
 *
 * @example
 * ```typescript
 * // Register at app startup
 * validatorRegistry.register('australianPhoneNumber', (value) => {
 *   if (!value) return true;
 *   return /^(\+61|0)[2-478]\d{8}$/.test(value.replace(/\s/g, ''));
 * });
 *
 * // Use in form config
 * {
 *   type: 'custom',
 *   customValidatorName: 'australianPhoneNumber',
 *   message: 'Invalid Australian phone number'
 * }
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class ValidatorRegistry {
  private validators = sharedValidatorMap;

  /**
   * Register a custom validator by name
   */
  register(name: string, validator: CustomValidatorFn): void {
    if (this.validators.has(name)) {
      console.warn(`ValidatorRegistry: Validator "${name}" is being overwritten`);
    }
    this.validators.set(name, validator);
  }

  /**
   * Register multiple validators at once
   */
  registerAll(validators: Record<string, CustomValidatorFn>): void {
    for (const [name, validator] of Object.entries(validators)) {
      this.register(name, validator);
    }
  }

  /**
   * Get a validator by name
   */
  get(name: string): CustomValidatorFn | undefined {
    return this.validators.get(name);
  }

  /**
   * Check if a validator exists
   */
  has(name: string): boolean {
    return this.validators.has(name);
  }

  /**
   * List all registered validator names
   */
  list(): string[] {
    return Array.from(this.validators.keys());
  }

  /**
   * Remove a validator
   */
  unregister(name: string): boolean {
    return this.validators.delete(name);
  }

  /**
   * Clear all custom validators
   */
  clear(): void {
    this.validators.clear();
  }
}

/**
 * Registry for async validators that can be referenced by name.
 * Register async validators here to use them in AsyncValidationConfig.validatorName.
 *
 * @example
 * ```typescript
 * // Register at app startup
 * asyncValidatorRegistry.register('checkEmailExists', async (value) => {
 *   const response = await fetch(`/api/validate/email?email=${encodeURIComponent(value)}`);
 *   const result = await response.json();
 *   return { valid: result.available, message: result.available ? undefined : 'Email already exists' };
 * });
 *
 * // Use in form config
 * {
 *   name: 'email',
 *   type: 'email',
 *   asyncValidation: {
 *     validatorName: 'checkEmailExists',
 *     trigger: 'blur'
 *   }
 * }
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class AsyncValidatorRegistry {
  private validators = sharedAsyncValidatorMap;

  /**
   * Register an async validator by name
   */
  register(name: string, validator: AsyncValidatorFn): void {
    if (this.validators.has(name)) {
      console.warn(`AsyncValidatorRegistry: Validator "${name}" is being overwritten`);
    }
    this.validators.set(name, validator);
  }

  /**
   * Register multiple async validators at once
   */
  registerAll(validators: Record<string, AsyncValidatorFn>): void {
    for (const [name, validator] of Object.entries(validators)) {
      this.register(name, validator);
    }
  }

  /**
   * Get an async validator by name
   */
  get(name: string): AsyncValidatorFn | undefined {
    return this.validators.get(name);
  }

  /**
   * Check if an async validator exists
   */
  has(name: string): boolean {
    return this.validators.has(name);
  }

  /**
   * List all registered async validator names
   */
  list(): string[] {
    return Array.from(this.validators.keys());
  }

  /**
   * Remove an async validator
   */
  unregister(name: string): boolean {
    return this.validators.delete(name);
  }

  /**
   * Clear all async validators
   */
  clear(): void {
    this.validators.clear();
  }
}

/**
 * Global validator registry instance (for backwards compatibility)
 * @deprecated Use ValidatorRegistry as a service injected via constructor
 */
export const validatorRegistry = new ValidatorRegistry();

/**
 * Global async validator registry instance
 * @deprecated Use AsyncValidatorRegistry as a service injected via constructor
 */
export const asyncValidatorRegistry = new AsyncValidatorRegistry();

/**
 * Registry for autocomplete fetch handlers that can be referenced by name.
 * Register fetch handlers here to use them in AutocompleteConfig.fetchHandlerName.
 *
 * @example
 * ```typescript
 * // Register at app startup
 * autocompleteFetchRegistry.register('searchUsers', async (searchText) => {
 *   const response = await fetch(`/api/users?q=${encodeURIComponent(searchText)}`);
 *   const users = await response.json();
 *   return users.map(u => ({ value: u.id, label: u.name }));
 * });
 *
 * // Use in form config
 * {
 *   name: 'assignee',
 *   type: 'autocomplete',
 *   autocompleteConfig: {
 *     fetchHandlerName: 'searchUsers',
 *     minSearchLength: 2
 *   }
 * }
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class AutocompleteFetchRegistry {
  private handlers = sharedFetchHandlerMap;

  /**
   * Register a fetch handler by name
   */
  register(name: string, handler: AutocompleteFetchHandler): void {
    if (this.handlers.has(name)) {
      console.warn(`AutocompleteFetchRegistry: Handler "${name}" is being overwritten`);
    }
    this.handlers.set(name, handler);
  }

  /**
   * Register multiple handlers at once
   */
  registerAll(handlers: Record<string, AutocompleteFetchHandler>): void {
    for (const [name, handler] of Object.entries(handlers)) {
      this.register(name, handler);
    }
  }

  /**
   * Get a handler by name
   */
  get(name: string): AutocompleteFetchHandler | undefined {
    return this.handlers.get(name);
  }

  /**
   * Check if a handler exists
   */
  has(name: string): boolean {
    return this.handlers.has(name);
  }

  /**
   * List all registered handler names
   */
  list(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Remove a handler
   */
  unregister(name: string): boolean {
    return this.handlers.delete(name);
  }

  /**
   * Clear all handlers
   */
  clear(): void {
    this.handlers.clear();
  }
}

/**
 * Global autocomplete fetch registry instance
 * @deprecated Use AutocompleteFetchRegistry as a service injected via constructor
 */
export const autocompleteFetchRegistry = new AutocompleteFetchRegistry();
