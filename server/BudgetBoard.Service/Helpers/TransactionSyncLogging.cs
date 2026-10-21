using Microsoft.Extensions.Logging;

namespace BudgetBoard.Service.Helpers;

/// <summary>
/// Writes transaction sync log entries tagged with the <see cref="PropertyName"/> property,
/// so the logging configuration can route them to a dedicated log file.
/// </summary>
public static class TransactionSyncLogging
{
    public const string PropertyName = "TransactionSync";

    private static readonly Dictionary<string, object> Scope = new() { [PropertyName] = true };

    public static void LogTransactionSync(this ILogger logger, string message)
    {
        using (logger.BeginScope(Scope))
        {
            logger.LogInformation("{LogMessage}", message);
        }
    }
}
