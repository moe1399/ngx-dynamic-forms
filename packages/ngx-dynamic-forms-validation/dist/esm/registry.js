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
 * Global validator registry singleton
 */
export const validatorRegistry = new ValidatorRegistry();
