namespace BudgetBoard.Database.Models;

/// <summary>
/// A manually logged contribution towards a manual goal.
/// </summary>
public class GoalContribution
{
    /// <summary>
    /// Unique identifier for the contribution.
    /// </summary>
    public Guid ID { get; set; } = Guid.NewGuid();

    /// <summary>
    /// The amount contributed. Negative values represent withdrawals.
    /// </summary>
    public required decimal Amount { get; set; }

    /// <summary>
    /// The date of the contribution.
    /// </summary>
    public required DateOnly Date { get; set; }

    /// <summary>
    /// Identifier of the goal this contribution belongs to.
    /// </summary>
    public required Guid GoalID { get; set; }

    /// <summary>
    /// Reference to the owning goal.
    /// </summary>
    public Goal? Goal { get; set; } = null;
}
