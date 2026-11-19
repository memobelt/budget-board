using System.Text.Json.Serialization;

namespace BudgetBoard.Service.Models.Widgets.FlowsWidget;

public class FlowsWidgetConfiguration
{
    [JsonPropertyName("monthCount")]
    public int MonthCount { get; set; } = 1;

    /// <summary>
    /// Whether the flow includes budget rollover balances carried into the period. Only saved
    /// when turned on.
    /// </summary>
    [JsonPropertyName("showRollovers")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public bool ShowRollovers { get; set; } = false;
}
