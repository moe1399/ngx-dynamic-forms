"use strict";
/**
 * @moe1399/ngx-dynamic-forms-validation
 *
 * Server-side form validation library compatible with @moe1399/ngx-dynamic-forms.
 * Use the same form configuration and validation rules on both client and server.
 *
 * @example
 * ```typescript
 * import { validateForm, validatorRegistry } from '@moe1399/ngx-dynamic-forms-validation';
 *
 * // Register custom validators (same implementation as Angular)
 * validatorRegistry.register('australianPhoneNumber', (value) => {
 *   if (!value) return true;
 *   return /^(\+61|0)[2-478]\d{8}$/.test(value.replace(/\s/g, ''));
 * });
 *
 * // Validate submitted form data
 * const result = validateForm(formConfig, formData);
 *
 * if (!result.valid) {
 *   // Return validation errors to client
 *   res.status(400).json({ errors: result.errors });
 * }
 * ```
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.autocompleteFetchRegistry = exports.asyncValidatorRegistry = exports.validatorRegistry = exports.loadConfigSync = exports.loadConfig = exports.validateConfig = exports.parseConfig = exports.validateFormAsync = exports.validateFieldAsync = exports.validateFieldValue = exports.validateForm = void 0;
// Main validation functions
var validator_js_1 = require("./validator.js");
Object.defineProperty(exports, "validateForm", { enumerable: true, get: function () { return validator_js_1.validateForm; } });
Object.defineProperty(exports, "validateFieldValue", { enumerable: true, get: function () { return validator_js_1.validateFieldValue; } });
Object.defineProperty(exports, "validateFieldAsync", { enumerable: true, get: function () { return validator_js_1.validateFieldAsync; } });
Object.defineProperty(exports, "validateFormAsync", { enumerable: true, get: function () { return validator_js_1.validateFormAsync; } });
// Config loading and validation
var config_loader_js_1 = require("./config-loader.js");
Object.defineProperty(exports, "parseConfig", { enumerable: true, get: function () { return config_loader_js_1.parseConfig; } });
Object.defineProperty(exports, "validateConfig", { enumerable: true, get: function () { return config_loader_js_1.validateConfig; } });
Object.defineProperty(exports, "loadConfig", { enumerable: true, get: function () { return config_loader_js_1.loadConfig; } });
Object.defineProperty(exports, "loadConfigSync", { enumerable: true, get: function () { return config_loader_js_1.loadConfigSync; } });
// Validator registry and autocomplete fetch registry
var registry_js_1 = require("./registry.js");
Object.defineProperty(exports, "validatorRegistry", { enumerable: true, get: function () { return registry_js_1.validatorRegistry; } });
Object.defineProperty(exports, "asyncValidatorRegistry", { enumerable: true, get: function () { return registry_js_1.asyncValidatorRegistry; } });
Object.defineProperty(exports, "autocompleteFetchRegistry", { enumerable: true, get: function () { return registry_js_1.autocompleteFetchRegistry; } });
