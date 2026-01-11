import { FormConfig } from './types.js';
/**
 * Config validation error
 */
export interface ConfigValidationError {
    path: string;
    message: string;
}
/**
 * Result of config validation
 */
export interface ConfigValidationResult {
    valid: boolean;
    errors: ConfigValidationError[];
    config?: FormConfig;
}
/**
 * Validate a form config object
 */
export declare function validateConfig(config: any): ConfigValidationResult;
/**
 * Parse and validate a JSON string as FormConfig
 *
 * @param json - JSON string containing form configuration
 * @returns Validation result with parsed config if valid
 *
 * @example
 * ```typescript
 * import { parseConfig } from '@moe1399/form-validation';
 *
 * const json = fs.readFileSync('form-config.json', 'utf-8');
 * const result = parseConfig(json);
 *
 * if (!result.valid) {
 *   console.error('Config errors:', result.errors);
 *   process.exit(1);
 * }
 *
 * // Use validated config
 * const formConfig = result.config;
 * ```
 */
export declare function parseConfig(json: string): ConfigValidationResult;
/**
 * Load and validate a form config from a file (Node.js only)
 *
 * @param filePath - Path to JSON config file
 * @returns Promise with validation result
 *
 * @example
 * ```typescript
 * import { loadConfig } from '@moe1399/form-validation';
 *
 * const result = await loadConfig('./forms/contact-form.json');
 * if (result.valid) {
 *   // Use result.config
 * }
 * ```
 */
export declare function loadConfig(filePath: string): Promise<ConfigValidationResult>;
/**
 * Synchronously load and validate a form config from a file (Node.js only)
 *
 * @param filePath - Path to JSON config file
 * @returns Validation result
 */
export declare function loadConfigSync(filePath: string): ConfigValidationResult;
