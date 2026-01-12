using System.Text.Json.Serialization;

namespace DynamicForms.FormValidation.Models;

/// <summary>
/// Supported form field types
/// </summary>
public enum FieldType
{
    [JsonPropertyName("text")]
    Text,

    [JsonPropertyName("email")]
    Email,

    [JsonPropertyName("number")]
    Number,

    [JsonPropertyName("textarea")]
    Textarea,

    [JsonPropertyName("select")]
    Select,

    [JsonPropertyName("checkbox")]
    Checkbox,

    [JsonPropertyName("radio")]
    Radio,

    [JsonPropertyName("date")]
    Date,

    [JsonPropertyName("daterange")]
    DateRange,

    [JsonPropertyName("table")]
    Table,

    [JsonPropertyName("info")]
    Info,

    [JsonPropertyName("datagrid")]
    DataGrid,

    [JsonPropertyName("phone")]
    Phone,

    [JsonPropertyName("formref")]
    FormRef
}

/// <summary>
/// Select option configuration
/// </summary>
public class SelectOption
{
    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;

    [JsonPropertyName("value")]
    public object? Value { get; set; }
}

/// <summary>
/// Table column configuration
/// </summary>
public class TableColumnConfig
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;

    [JsonPropertyName("type")]
    public string Type { get; set; } = "text";

    [JsonPropertyName("placeholder")]
    public string? Placeholder { get; set; }

    [JsonPropertyName("validations")]
    public List<ValidationRule>? Validations { get; set; }

    [JsonPropertyName("options")]
    public List<SelectOption>? Options { get; set; }

    [JsonPropertyName("width")]
    public int? Width { get; set; }
}

/// <summary>
/// Table field configuration
/// </summary>
public class TableConfig
{
    [JsonPropertyName("columns")]
    public List<TableColumnConfig> Columns { get; set; } = new();

    [JsonPropertyName("rowMode")]
    public string RowMode { get; set; } = "fixed";

    [JsonPropertyName("fixedRowCount")]
    public int? FixedRowCount { get; set; }

    [JsonPropertyName("minRows")]
    public int? MinRows { get; set; }

    [JsonPropertyName("maxRows")]
    public int? MaxRows { get; set; }
}

/// <summary>
/// DataGrid column configuration
/// </summary>
public class DataGridColumnConfig
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;

    [JsonPropertyName("type")]
    public string Type { get; set; } = "text";

    [JsonPropertyName("validations")]
    public List<ValidationRule>? Validations { get; set; }

    [JsonPropertyName("computed")]
    public bool? Computed { get; set; }
}

/// <summary>
/// DataGrid row label configuration
/// </summary>
public class DataGridRowLabel
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;
}

/// <summary>
/// DataGrid field configuration
/// </summary>
public class DataGridConfig
{
    [JsonPropertyName("columns")]
    public List<DataGridColumnConfig> Columns { get; set; } = new();

    [JsonPropertyName("rowLabels")]
    public List<DataGridRowLabel> RowLabels { get; set; } = new();
}

/// <summary>
/// Date range configuration
/// </summary>
public class DateRangeConfig
{
    [JsonPropertyName("fromLabel")]
    public string? FromLabel { get; set; }

    [JsonPropertyName("toLabel")]
    public string? ToLabel { get; set; }

    [JsonPropertyName("toDateOptional")]
    public bool? ToDateOptional { get; set; }
}

/// <summary>
/// Form field configuration
/// </summary>
public class FormFieldConfig
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;

    [JsonPropertyName("type")]
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public FieldType Type { get; set; }

    [JsonPropertyName("placeholder")]
    public string? Placeholder { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("value")]
    public object? Value { get; set; }

    [JsonPropertyName("validations")]
    public List<ValidationRule>? Validations { get; set; }

    [JsonPropertyName("asyncValidation")]
    public AsyncValidationConfig? AsyncValidation { get; set; }

    [JsonPropertyName("options")]
    public List<SelectOption>? Options { get; set; }

    [JsonPropertyName("disabled")]
    public bool? Disabled { get; set; }

    [JsonPropertyName("archived")]
    public bool? Archived { get; set; }

    [JsonPropertyName("sectionId")]
    public string? SectionId { get; set; }

    [JsonPropertyName("tableConfig")]
    public TableConfig? TableConfig { get; set; }

    [JsonPropertyName("datagridConfig")]
    public DataGridConfig? DataGridConfig { get; set; }

    [JsonPropertyName("daterangeConfig")]
    public DateRangeConfig? DateRangeConfig { get; set; }

    /// <summary>
    /// Visibility condition - field hidden when condition is not met
    /// </summary>
    [JsonPropertyName("condition")]
    public ValidationCondition? Condition { get; set; }
}

/// <summary>
/// Form section configuration
/// </summary>
public class FormSection
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    /// <summary>
    /// Visibility condition - section hidden when condition is not met
    /// </summary>
    [JsonPropertyName("condition")]
    public ValidationCondition? Condition { get; set; }
}

/// <summary>
/// Complete form configuration
/// </summary>
public class FormConfig
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("fields")]
    public List<FormFieldConfig> Fields { get; set; } = new();

    [JsonPropertyName("sections")]
    public List<FormSection>? Sections { get; set; }
}
