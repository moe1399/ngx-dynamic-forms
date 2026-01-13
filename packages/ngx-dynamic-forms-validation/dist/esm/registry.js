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
class ValidatorRegistry {
    validators = new Map();
    /**
     * Register a custom validator by name
     */
    register(name, validator) {
        if (this.validators.has(name)) {
            console.warn(`ValidatorRegistry: Validator "${name}" is being overwritten`);
        }
        this.validators.set(name, validator);
    }
    /**
     * Register multiple validators at once
     */
    registerAll(validators) {
        for (const [name, validator] of Object.entries(validators)) {
            this.register(name, validator);
        }
    }
    /**
     * Get a validator by name
     */
    get(name) {
        return this.validators.get(name);
    }
    /**
     * Check if a validator exists
     */
    has(name) {
        return this.validators.has(name);
    }
    /**
     * List all registered validator names
     */
    list() {
        return Array.from(this.validators.keys());
    }
    /**
     * Remove a validator
     */
    unregister(name) {
        return this.validators.delete(name);
    }
    /**
     * Clear all custom validators
     */
    clear() {
        this.validators.clear();
    }
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
class AsyncValidatorRegistry {
    validators = new Map();
    /**
     * Register an async validator by name
     */
    register(name, validator) {
        if (this.validators.has(name)) {
            console.warn(`AsyncValidatorRegistry: Validator "${name}" is being overwritten`);
        }
        this.validators.set(name, validator);
    }
    /**
     * Register multiple async validators at once
     */
    registerAll(validators) {
        for (const [name, validator] of Object.entries(validators)) {
            this.register(name, validator);
        }
    }
    /**
     * Get an async validator by name
     */
    get(name) {
        return this.validators.get(name);
    }
    /**
     * Check if an async validator exists
     */
    has(name) {
        return this.validators.has(name);
    }
    /**
     * List all registered async validator names
     */
    list() {
        return Array.from(this.validators.keys());
    }
    /**
     * Remove an async validator
     */
    unregister(name) {
        return this.validators.delete(name);
    }
    /**
     * Clear all async validators
     */
    clear() {
        this.validators.clear();
    }
}
/**
 * Global validator registry singleton
 */
export const validatorRegistry = new ValidatorRegistry();
/**
 * Global async validator registry singleton
 */
export const asyncValidatorRegistry = new AsyncValidatorRegistry();
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
class AutocompleteFetchRegistry {
    handlers = new Map();
    /**
     * Register a fetch handler by name
     */
    register(name, handler) {
        if (this.handlers.has(name)) {
            console.warn(`AutocompleteFetchRegistry: Handler "${name}" is being overwritten`);
        }
        this.handlers.set(name, handler);
    }
    /**
     * Register multiple handlers at once
     */
    registerAll(handlers) {
        for (const [name, handler] of Object.entries(handlers)) {
            this.register(name, handler);
        }
    }
    /**
     * Get a handler by name
     */
    get(name) {
        return this.handlers.get(name);
    }
    /**
     * Check if a handler exists
     */
    has(name) {
        return this.handlers.has(name);
    }
    /**
     * List all registered handler names
     */
    list() {
        return Array.from(this.handlers.keys());
    }
    /**
     * Remove a handler
     */
    unregister(name) {
        return this.handlers.delete(name);
    }
    /**
     * Clear all handlers
     */
    clear() {
        this.handlers.clear();
    }
}
/**
 * Global autocomplete fetch registry singleton
 */
export const autocompleteFetchRegistry = new AutocompleteFetchRegistry();
