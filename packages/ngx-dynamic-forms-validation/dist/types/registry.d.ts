import { CustomValidatorFn } from './types.js';
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
 * Global validator registry singleton
 */
export declare const validatorRegistry: ValidatorRegistry;
export {};
