import { CustomValidatorFn, AsyncValidatorFn, AutocompleteFetchHandler } from './types.js';
/**
 * Registry for custom validators that can be referenced by name.
 * Register validators here to use them with ValidationRule.customValidatorName.
 *
 * @example
 * ```typescript
 * import { validatorRegistry } from '@moe1399/form-validation';
 *
 * validatorRegistry.register('australianPhoneNumber', (value) => {
 *   if (!value) return true;
 *   return /^(\+61|0)[2-478]\d{8}$/.test(value.replace(/\s/g, ''));
 * });
 * ```
 */
declare class ValidatorRegistry {
    private validators;
    /**
     * Register a custom validator by name
     */
    register(name: string, validator: CustomValidatorFn): void;
    /**
     * Register multiple validators at once
     */
    registerAll(validators: Record<string, CustomValidatorFn>): void;
    /**
     * Get a validator by name
     */
    get(name: string): CustomValidatorFn | undefined;
    /**
     * Check if a validator exists
     */
    has(name: string): boolean;
    /**
     * List all registered validator names
     */
    list(): string[];
    /**
     * Remove a validator
     */
    unregister(name: string): boolean;
    /**
     * Clear all custom validators
     */
    clear(): void;
}
/**
 * Registry for async validators that can be referenced by name.
 * Register async validators here to use them with AsyncValidationConfig.validatorName.
 *
 * @example
 * ```typescript
 * import { asyncValidatorRegistry } from '@moe1399/form-validation';
 *
 * asyncValidatorRegistry.register('checkEmailExists', async (value, params) => {
 *   const response = await fetch(`/api/validate/email?email=${encodeURIComponent(value)}`);
 *   const result = await response.json();
 *   return { valid: result.available, message: result.available ? undefined : 'Email already exists' };
 * });
 * ```
 */
declare class AsyncValidatorRegistry {
    private validators;
    /**
     * Register an async validator by name
     */
    register(name: string, validator: AsyncValidatorFn): void;
    /**
     * Register multiple async validators at once
     */
    registerAll(validators: Record<string, AsyncValidatorFn>): void;
    /**
     * Get an async validator by name
     */
    get(name: string): AsyncValidatorFn | undefined;
    /**
     * Check if an async validator exists
     */
    has(name: string): boolean;
    /**
     * List all registered async validator names
     */
    list(): string[];
    /**
     * Remove an async validator
     */
    unregister(name: string): boolean;
    /**
     * Clear all async validators
     */
    clear(): void;
}
/**
 * Global validator registry singleton
 */
export declare const validatorRegistry: ValidatorRegistry;
/**
 * Global async validator registry singleton
 */
export declare const asyncValidatorRegistry: AsyncValidatorRegistry;
/**
 * Registry for autocomplete fetch handlers that can be referenced by name.
 * Register fetch handlers here to use them with AutocompleteConfig.fetchHandlerName.
 *
 * @example
 * ```typescript
 * import { autocompleteFetchRegistry } from '@moe1399/ngx-dynamic-forms-validation';
 *
 * autocompleteFetchRegistry.register('searchUsers', async (searchText, params) => {
 *   const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchText)}`);
 *   const users = await response.json();
 *   return users.map(u => ({ value: u.id, label: u.name }));
 * });
 * ```
 */
declare class AutocompleteFetchRegistry {
    private handlers;
    /**
     * Register a fetch handler by name
     */
    register(name: string, handler: AutocompleteFetchHandler): void;
    /**
     * Register multiple handlers at once
     */
    registerAll(handlers: Record<string, AutocompleteFetchHandler>): void;
    /**
     * Get a handler by name
     */
    get(name: string): AutocompleteFetchHandler | undefined;
    /**
     * Check if a handler exists
     */
    has(name: string): boolean;
    /**
     * List all registered handler names
     */
    list(): string[];
    /**
     * Remove a handler
     */
    unregister(name: string): boolean;
    /**
     * Clear all handlers
     */
    clear(): void;
}
/**
 * Global autocomplete fetch registry singleton
 */
export declare const autocompleteFetchRegistry: AutocompleteFetchRegistry;
export {};
