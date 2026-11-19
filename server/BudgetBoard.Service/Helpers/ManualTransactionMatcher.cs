using BudgetBoard.Database.Models;

namespace BudgetBoard.Service.Helpers;

/// <summary>
/// Pairs a transaction coming in from a bank sync with one the user already entered by hand
/// (or imported from a file), so the same purchase isn't counted twice.
/// </summary>
public static class ManualTransactionMatcher
{
    /// <summary>
    /// How many days apart the manual entry and the bank's date may be and still match.
    /// Banks often post a purchase a few days after it was made.
    /// </summary>
    public const int MatchWindowDays = 7;

    /// <summary>
    /// Finds the manual transaction that best matches a synced one: same account (the caller
    /// passes only that account's transactions), exactly the same amount, not deleted, not
    /// already linked to a synced transaction, and dated within <see cref="MatchWindowDays"/>.
    /// When several qualify, the one closest in date wins; ties go to the earliest.
    /// </summary>
    public static Transaction? FindMatch(
        IEnumerable<Transaction> accountTransactions,
        decimal amount,
        DateOnly date
    ) =>
        accountTransactions
            .Where(t =>
                t.Deleted == null
                && t.Source == TransactionSource.Manual
                && string.IsNullOrEmpty(t.SyncID)
                && t.Amount == amount
                && Math.Abs(t.Date.DayNumber - date.DayNumber) <= MatchWindowDays
            )
            .OrderBy(t => Math.Abs(t.Date.DayNumber - date.DayNumber))
            .ThenBy(t => t.Date)
            .FirstOrDefault();

    /// <summary>
    /// Links a manual transaction to the synced one, so later syncs see it as already present.
    /// The user's date, category, notes and tags are kept; the bank's description only fills
    /// in the merchant when the user left it blank.
    /// </summary>
    public static void Link(
        Transaction manualTransaction,
        string syncId,
        string source,
        string? merchantName
    )
    {
        manualTransaction.SyncID = syncId;
        manualTransaction.Source = source;
        if (string.IsNullOrWhiteSpace(manualTransaction.MerchantName))
        {
            manualTransaction.MerchantName = merchantName;
        }
    }
}
