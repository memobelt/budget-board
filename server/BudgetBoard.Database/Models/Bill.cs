namespace BudgetBoard.Database.Models;

/// <summary>
/// Represents a manually entered bill (for example, a credit card payment) that recurs monthly.
/// </summary>
public class Bill
{
    public const int MaxNameLength = 100;
    public const int AccountLastFourLength = 4;

    /// <summary>
    /// Unique identifier for the bill.
    /// </summary>
    public Guid ID { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Name of the bill.
    /// </summary>
    public required string Name { get; set; }

    /// <summary>
    /// The fixed amount due. Ignored when <see cref="UseAccountBalance"/> is true.
    /// </summary>
    public decimal Amount { get; set; } = 0.0M;

    /// <summary>
    /// Day of the month the bill is due (1-31). Clamped to the last day for shorter months.
    /// </summary>
    public required int DueDay { get; set; }

    /// <summary>
    /// When true, the amount due is taken from the linked account's current balance.
    /// </summary>
    public bool UseAccountBalance { get; set; } = false;

    /// <summary>
    /// The due date of the most recent payment that was marked as paid, if any.
    /// </summary>
    public DateOnly? LastPaidDueDate { get; set; } = null;

    /// <summary>
    /// The last four digits of the account number this bill is paid towards, if entered.
    /// </summary>
    public string? AccountLastFour { get; set; } = null;

    /// <summary>
    /// Identifier for the account this bill is paid towards, if any.
    /// </summary>
    public Guid? AccountID { get; set; } = null;

    /// <summary>
    /// Reference to the account this bill is paid towards.
    /// </summary>
    public Account? Account { get; set; } = null;

    /// <summary>
    /// Identifier for the user who owns the bill.
    /// </summary>
    public required Guid UserID { get; set; }

    /// <summary>
    /// Reference to the owning user.
    /// </summary>
    public ApplicationUser? User { get; set; } = null;
}
