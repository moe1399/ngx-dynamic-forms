using System.Text.Json;
using System.Text.RegularExpressions;
using DynamicForms.FormValidation.Models;

namespace DynamicForms.FormValidation;

/// <summary>
/// Form validation engine compatible with @moe1399/ngx-dynamic-forms
/// </summary>
public static class FormValidator
{
    private static readonly Regex EmailRegex = new(
        @"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$",
        RegexOptions.Compiled
    );

    /// <summary>
    /// Validate an entire form against its configuration
    /// </summary>
    /// <param name="config">The form configuration</param>
    /// <param name="data">The form data to validate</param>
    /// <returns>Validation result with any errors</returns>
    public static ValidationResult ValidateForm(FormConfig config, Dictionary<string, object?> data)
    {
        var errors = new List<FieldValidationError>();

        // Pre-compute visible sections for performance
        var visibleSections = new HashSet<string>();
        if (config.Sections != null)
        {
            foreach (var section in config.Sections)
            {
                if (section.Condition == null || EvaluateCondition(section.Condition, data, null))
                {
                    visibleSections.Add(section.Id);
                }
            }
        }

        foreach (var field in config.Fields)
        {
            // Skip archived fields
            if (field.Archived == true) continue;

            // Skip non-input field types
            if (field.Type == FieldType.Info || field.Type == FieldType.FormRef) continue;

            // Skip fields with visibility conditions that evaluate to false
            if (field.Condition != null && !EvaluateCondition(field.Condition, data, null)) continue;

            // Skip fields in hidden sections
            if (field.SectionId is not null && !visibleSections.Contains(field.SectionId)) continue;

            data.TryGetValue(field.Name, out var value);

            // Handle special field types
            var fieldErrors = field.Type switch
            {
                FieldType.Table => ValidateTableField(field, value, data),
                FieldType.DataGrid => ValidateDataGridField(field, value, data),
                FieldType.Phone => ValidatePhoneField(field, value, data),
                FieldType.DateRange => ValidateDateRangeField(field, value, data),
                _ => ValidateField(field, value, data)
            };

            errors.AddRange(fieldErrors);
        }

        return errors.Count == 0
            ? ValidationResult.Success()
            : ValidationResult.Failure(errors);
    }

    /// <summary>
    /// Validate a single field value
    /// </summary>
    /// <param name="fieldConfig">The field configuration</param>
    /// <param name="value">The value to validate</param>
    /// <param name="formData">Optional full form data for contextual validation</param>
    /// <returns>Validation result for the single field</returns>
    public static ValidationResult ValidateFieldValue(
        FormFieldConfig fieldConfig,
        object? value,
        Dictionary<string, object?>? formData = null
    )
    {
        var errors = ValidateField(fieldConfig, value, formData ?? new Dictionary<string, object?>());
        return errors.Count == 0
            ? ValidationResult.Success()
            : ValidationResult.Failure(errors);
    }

    private static List<FieldValidationError> ValidateField(
        FormFieldConfig field,
        object? value,
        Dictionary<string, object?> formData,
        string? fieldPath = null
    )
    {
        var errors = new List<FieldValidationError>();
        var path = fieldPath ?? field.Name;

        if (field.Validations == null || field.Validations.Count == 0)
            return errors;

        foreach (var rule in field.Validations)
        {
            if (!ValidateRule(value, rule, field, formData))
            {
                errors.Add(new FieldValidationError
                {
                    Field = path,
                    Message = rule.Message,
                    Rule = rule.Type.ToString().ToLowerInvariant()
                });
            }
        }

        return errors;
    }

    private static bool ValidateRule(
        object? value,
        ValidationRule rule,
        FormFieldConfig fieldConfig,
        Dictionary<string, object?> formData,
        Dictionary<string, object?>? rowData = null
    )
    {
        // Check if validation has a condition and if it's met
        if (rule.Condition != null)
        {
            if (!EvaluateCondition(rule.Condition, formData, rowData))
            {
                return true; // Condition not met, validation passes (doesn't apply)
            }
        }

        return rule.Type switch
        {
            ValidationRuleType.Required => !IsEmpty(value),
            ValidationRuleType.Email => IsEmpty(value) || IsValidEmail(value),
            ValidationRuleType.MinLength => IsEmpty(value) || HasMinLength(value, rule.Value),
            ValidationRuleType.MaxLength => IsEmpty(value) || HasMaxLength(value, rule.Value),
            ValidationRuleType.Min => IsEmpty(value) || IsAtLeast(value, rule.Value),
            ValidationRuleType.Max => IsEmpty(value) || IsAtMost(value, rule.Value),
            ValidationRuleType.Pattern => IsEmpty(value) || MatchesPattern(value, rule.Value),
            ValidationRuleType.Custom => ValidateCustom(value, rule, fieldConfig, formData),
            _ => true
        };
    }

    private static bool EvaluateCondition(
        ValidationCondition condition,
        Dictionary<string, object?> formData,
        Dictionary<string, object?>? rowData
    )
    {
        object? fieldValue;

        if (condition.Field.StartsWith("$form."))
        {
            // Form-level field reference (used from within table/datagrid context)
            var fieldName = condition.Field.Substring(6);
            formData.TryGetValue(fieldName, out fieldValue);
        }
        else if (rowData != null)
        {
            // Same-row column reference (table/datagrid context)
            rowData.TryGetValue(condition.Field, out fieldValue);
        }
        else
        {
            // Standalone field context
            formData.TryGetValue(condition.Field, out fieldValue);
        }

        return condition.Operator switch
        {
            ValidationConditionOperator.Equals => AreValuesEqual(fieldValue, condition.Value),
            ValidationConditionOperator.NotEquals => !AreValuesEqual(fieldValue, condition.Value),
            ValidationConditionOperator.IsEmpty => IsEmpty(fieldValue),
            ValidationConditionOperator.IsNotEmpty => !IsEmpty(fieldValue),
            _ => true
        };
    }

    private static bool AreValuesEqual(object? a, object? b)
    {
        if (a == null && b == null) return true;
        if (a == null || b == null) return false;

        // Handle JsonElement comparisons
        var aStr = GetStringValue(a);
        var bStr = GetStringValue(b);

        if (aStr != null && bStr != null)
            return aStr == bStr;

        return a.Equals(b);
    }

    private static bool IsEmpty(object? value)
    {
        if (value == null) return true;

        return value switch
        {
            string s => string.IsNullOrWhiteSpace(s),
            JsonElement je when je.ValueKind == JsonValueKind.Null => true,
            JsonElement je when je.ValueKind == JsonValueKind.String =>
                string.IsNullOrWhiteSpace(je.GetString()),
            JsonElement je when je.ValueKind == JsonValueKind.Array => je.GetArrayLength() == 0,
            System.Collections.IList list => list.Count == 0,
            _ => false
        };
    }

    private static bool IsValidEmail(object? value)
    {
        var str = GetStringValue(value);
        return str != null && EmailRegex.IsMatch(str);
    }

    private static bool HasMinLength(object? value, object? minValue)
    {
        var str = GetStringValue(value);
        if (str == null) return true;

        var min = GetIntValue(minValue);
        return min == null || str.Length >= min.Value;
    }

    private static bool HasMaxLength(object? value, object? maxValue)
    {
        var str = GetStringValue(value);
        if (str == null) return true;

        var max = GetIntValue(maxValue);
        return max == null || str.Length <= max.Value;
    }

    private static bool IsAtLeast(object? value, object? minValue)
    {
        var num = GetDoubleValue(value);
        var min = GetDoubleValue(minValue);
        return num == null || min == null || num.Value >= min.Value;
    }

    private static bool IsAtMost(object? value, object? maxValue)
    {
        var num = GetDoubleValue(value);
        var max = GetDoubleValue(maxValue);
        return num == null || max == null || num.Value <= max.Value;
    }

    private static bool MatchesPattern(object? value, object? pattern)
    {
        var str = GetStringValue(value);
        var patternStr = GetStringValue(pattern);

        if (str == null || patternStr == null) return true;

        try
        {
            return Regex.IsMatch(str, patternStr);
        }
        catch
        {
            Console.WriteLine($"Invalid regex pattern: {patternStr}");
            return true;
        }
    }

    private static bool ValidateCustom(
        object? value,
        ValidationRule rule,
        FormFieldConfig fieldConfig,
        Dictionary<string, object?> formData
    )
    {
        if (string.IsNullOrEmpty(rule.CustomValidatorName))
            return true;

        var validator = ValidatorRegistry.Instance.Get(rule.CustomValidatorName!);
        if (validator == null)
        {
            Console.WriteLine($"Custom validator \"{rule.CustomValidatorName}\" not registered");
            return true;
        }

        return validator(value, rule.CustomValidatorParams, fieldConfig, formData);
    }

    private static List<FieldValidationError> ValidateTableField(
        FormFieldConfig field,
        object? value,
        Dictionary<string, object?> formData
    )
    {
        var errors = new List<FieldValidationError>();
        var config = field.TableConfig;

        if (config == null) return errors;

        var rows = GetArrayValue(value);
        if (rows == null) return errors;

        for (var rowIndex = 0; rowIndex < rows.Count; rowIndex++)
        {
            var row = rows[rowIndex] as Dictionary<string, object?>;
            if (row == null) continue;

            // Check if row is empty
            var isEmptyRow = config.Columns.All(col =>
            {
                row.TryGetValue(col.Name, out var cellValue);
                return IsEmpty(cellValue);
            });

            if (isEmptyRow) continue;

            foreach (var column in config.Columns)
            {
                if (column.Validations == null) continue;

                row.TryGetValue(column.Name, out var cellValue);
                var cellPath = $"{field.Name}[{rowIndex}].{column.Name}";

                foreach (var rule in column.Validations)
                {
                    var tempField = new FormFieldConfig { Name = column.Name };
                    if (!ValidateRule(cellValue, rule, tempField, formData, row))
                    {
                        errors.Add(new FieldValidationError
                        {
                            Field = cellPath,
                            Message = rule.Message,
                            Rule = rule.Type.ToString().ToLowerInvariant()
                        });
                    }
                }
            }
        }

        return errors;
    }

    private static List<FieldValidationError> ValidateDataGridField(
        FormFieldConfig field,
        object? value,
        Dictionary<string, object?> formData
    )
    {
        var errors = new List<FieldValidationError>();
        var config = field.DataGridConfig;

        if (config == null) return errors;

        var gridData = GetDictionaryValue(value);
        if (gridData == null) return errors;

        foreach (var rowLabel in config.RowLabels)
        {
            gridData.TryGetValue(rowLabel.Id, out var rowValue);
            var rowData = GetDictionaryValue(rowValue);
            if (rowData == null) continue;

            foreach (var column in config.Columns)
            {
                // Skip computed columns
                if (column.Computed == true) continue;
                if (column.Validations == null) continue;

                rowData.TryGetValue(column.Name, out var cellValue);
                var cellPath = $"{field.Name}.{rowLabel.Id}.{column.Name}";

                foreach (var rule in column.Validations)
                {
                    var tempField = new FormFieldConfig { Name = column.Name };
                    if (!ValidateRule(cellValue, rule, tempField, formData, rowData))
                    {
                        errors.Add(new FieldValidationError
                        {
                            Field = cellPath,
                            Message = rule.Message,
                            Rule = rule.Type.ToString().ToLowerInvariant()
                        });
                    }
                }
            }
        }

        return errors;
    }

    private static List<FieldValidationError> ValidatePhoneField(
        FormFieldConfig field,
        object? value,
        Dictionary<string, object?> formData
    )
    {
        var errors = new List<FieldValidationError>();

        if (field.Validations == null) return errors;

        var phoneData = GetDictionaryValue(value);

        var hasRequired = field.Validations.Any(v => v.Type == ValidationRuleType.Required);
        if (hasRequired)
        {
            var isPhoneEmpty = phoneData == null ||
                (!phoneData.TryGetValue("number", out var num) || IsEmpty(num));

            if (isPhoneEmpty)
            {
                var requiredRule = field.Validations.FirstOrDefault(v => v.Type == ValidationRuleType.Required);
                errors.Add(new FieldValidationError
                {
                    Field = field.Name,
                    Message = requiredRule?.Message ?? "This field is required",
                    Rule = "required"
                });
            }
        }

        // Validate other rules on the phone number
        if (phoneData != null && phoneData.TryGetValue("number", out var phoneNumber) && !IsEmpty(phoneNumber))
        {
            foreach (var rule in field.Validations.Where(r => r.Type != ValidationRuleType.Required))
            {
                if (!ValidateRule(phoneNumber, rule, field, formData))
                {
                    errors.Add(new FieldValidationError
                    {
                        Field = field.Name,
                        Message = rule.Message,
                        Rule = rule.Type.ToString().ToLowerInvariant()
                    });
                }
            }
        }

        return errors;
    }

    private static List<FieldValidationError> ValidateDateRangeField(
        FormFieldConfig field,
        object? value,
        Dictionary<string, object?> formData
    )
    {
        var errors = new List<FieldValidationError>();

        if (field.Validations == null) return errors;

        var dateRangeData = GetDictionaryValue(value);
        var toDateOptional = field.DateRangeConfig?.ToDateOptional ?? false;

        var hasRequired = field.Validations.Any(v => v.Type == ValidationRuleType.Required);
        if (hasRequired)
        {
            object? fromDate = null;
            object? toDate = null;
            dateRangeData?.TryGetValue("fromDate", out fromDate);
            dateRangeData?.TryGetValue("toDate", out toDate);

            var fromEmpty = dateRangeData == null || IsEmpty(fromDate);
            var toEmpty = IsEmpty(toDate);

            if (fromEmpty || (!toDateOptional && toEmpty))
            {
                var requiredRule = field.Validations.FirstOrDefault(v => v.Type == ValidationRuleType.Required);
                errors.Add(new FieldValidationError
                {
                    Field = field.Name,
                    Message = requiredRule?.Message ?? "This field is required",
                    Rule = "required"
                });
            }
        }

        return errors;
    }

    #region Helper Methods

    private static string? GetStringValue(object? value)
    {
        return value switch
        {
            string s => s,
            JsonElement je when je.ValueKind == JsonValueKind.String => je.GetString(),
            JsonElement je => je.ToString(),
            null => null,
            _ => value.ToString()
        };
    }

    private static int? GetIntValue(object? value)
    {
        return value switch
        {
            int i => i,
            long l => (int)l,
            double d => (int)d,
            string s when int.TryParse(s, out var i) => i,
            JsonElement je when je.ValueKind == JsonValueKind.Number => je.GetInt32(),
            JsonElement je when je.ValueKind == JsonValueKind.String &&
                int.TryParse(je.GetString(), out var i) => i,
            _ => null
        };
    }

    private static double? GetDoubleValue(object? value)
    {
        return value switch
        {
            double d => d,
            float f => f,
            int i => i,
            long l => l,
            decimal m => (double)m,
            string s when double.TryParse(s, out var d) => d,
            JsonElement je when je.ValueKind == JsonValueKind.Number => je.GetDouble(),
            JsonElement je when je.ValueKind == JsonValueKind.String &&
                double.TryParse(je.GetString(), out var d) => d,
            _ => null
        };
    }

    private static List<object?>? GetArrayValue(object? value)
    {
        return value switch
        {
            List<object?> list => list,
            JsonElement je when je.ValueKind == JsonValueKind.Array =>
                je.EnumerateArray()
                    .Select(e => (object?)JsonElementToObject(e))
                    .ToList(),
            System.Collections.IEnumerable enumerable when value is not string =>
                enumerable.Cast<object?>().ToList(),
            _ => null
        };
    }

    private static Dictionary<string, object?>? GetDictionaryValue(object? value)
    {
        return value switch
        {
            Dictionary<string, object?> dict => dict,
            JsonElement je when je.ValueKind == JsonValueKind.Object =>
                je.EnumerateObject()
                    .ToDictionary(p => p.Name, p => (object?)JsonElementToObject(p.Value)),
            _ => null
        };
    }

    private static object? JsonElementToObject(JsonElement element)
    {
        return element.ValueKind switch
        {
            JsonValueKind.Object => element.EnumerateObject()
                .ToDictionary(p => p.Name, p => JsonElementToObject(p.Value)),
            JsonValueKind.Array => element.EnumerateArray()
                .Select(JsonElementToObject)
                .ToList(),
            JsonValueKind.String => element.GetString(),
            JsonValueKind.Number => element.TryGetInt64(out var l) ? l : element.GetDouble(),
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.Null => null,
            _ => element.ToString()
        };
    }

    #endregion
}
