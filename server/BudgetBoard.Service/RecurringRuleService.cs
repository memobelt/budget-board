using BudgetBoard.Database.Data;
using BudgetBoard.Database.Models;
using BudgetBoard.Service.Helpers;
using BudgetBoard.Service.Interfaces;
using BudgetBoard.Service.Models;
using BudgetBoard.Service.Resources;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Localization;
using Microsoft.Extensions.Logging;

namespace BudgetBoard.Service;

public class RecurringRuleService(
    ILogger<IRecurringRuleService> logger,
    UserDataContext userDataContext,
    INowProvider nowProvider,
    IStringLocalizer<ResponseStrings> responseLocalizer,
    IStringLocalizer<LogStrings> logLocalizer
) : IRecurringRuleService
{
    private static readonly decimal MatchAmountTolerance = 0.2M;

    public async Task CreateRecurringRuleAsync(
        Guid userGuid,
        IRecurringRuleRequest request,
        IEnumerable<Guid>? transactionIDs = null
    )
    {
        ValidateRequest(request);
        var userData = await GetCurrentUserAsync(userGuid);
        var foundAccount =
            userData.Accounts.FirstOrDefault(a => a.ID == request.AccountID)
            ?? throw new BudgetBoardServiceException(
                responseLocalizer["RecurringRuleAccountNotFoundError"]
            );

        var transactions = (transactionIDs ?? Enumerable.Empty<Guid>())
            .Distinct()
            .Select(transactionID => GetTransactionById(userData, transactionID))
            .ToList();
        foreach (var transaction in transactions)
        {
            if (transaction.AccountID != request.AccountID)
            {
                throw new BudgetBoardServiceException(
                    responseLocalizer["RecurringRuleAccountMismatchError"]
                );
            }
            if (transaction.RecurringRuleID.HasValue)
            {
                throw new BudgetBoardServiceException(
                    responseLocalizer["TransactionAlreadyRecurringError"]
                );
            }
        }

        var rule = new RecurringRule
        {
            UserID = userGuid,
            AccountID = request.AccountID,
            Account = foundAccount,
            MerchantName = request.MerchantName,
            Category = request.Category,
            Subcategory = request.Subcategory,
            Cadence = RecurringCadenceSerializer.Serialize(request.Cadence, responseLocalizer),
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            IsActive = request.IsActive,
            AmountMode = ParseAmountMode(request.AmountMode),
            Amount = request.Amount,
        };

        foreach (var transaction in transactions)
        {
            rule.Transactions.Add(transaction);
            transaction.RecurringRule = rule;
        }

        userDataContext.RecurringRules.Add(rule);
        await userDataContext.SaveChangesAsync();
    }

    public async Task<IReadOnlyList<IRecurringRuleResponse>> ReadRecurringRulesAsync(Guid userGuid)
    {
        var userData = await GetCurrentUserAsync(userGuid);
        return
        [
            .. userData
                .RecurringRules.OrderBy(rule => rule.StartDate)
                .ThenBy(rule => rule.MerchantName)
                .Select(rule =>
                    (IRecurringRuleResponse)
                        new RecurringRuleResponse(rule, nowProvider.Today, responseLocalizer)
                ),
        ];
    }

    public async Task UpdateRecurringRuleAsync(Guid userGuid, IRecurringRuleUpdateRequest request)
    {
        var userData = await GetCurrentUserAsync(userGuid);
        var rule = GetRecurringRuleById(userData, request.ID);
        var account = GetAccountById(userData, request.AccountID);

        ValidateRequest(request);

        if (rule.AccountID != request.AccountID)
        {
            foreach (var transaction in rule.Transactions.ToList())
            {
                transaction.RecurringRuleID = null;
                transaction.RecurringRule = null;
            }
        }

        rule.AccountID = request.AccountID;
        rule.Account = account;
        rule.MerchantName = request.MerchantName;
        rule.Category = request.Category;
        rule.Subcategory = request.Subcategory;
        rule.Cadence = RecurringCadenceSerializer.Serialize(request.Cadence, responseLocalizer);
        rule.StartDate = request.StartDate;
        rule.EndDate = request.EndDate;
        rule.IsActive = request.IsActive;
        rule.AmountMode = ParseAmountMode(request.AmountMode);
        rule.Amount = request.Amount;

        await userDataContext.SaveChangesAsync();
    }

    public async Task DeleteRecurringRuleAsync(Guid userGuid, Guid recurringRuleID)
    {
        var userData = await GetCurrentUserAsync(userGuid);
        var rule = GetRecurringRuleById(userData, recurringRuleID);

        userDataContext.RecurringRules.Remove(rule);
        await userDataContext.SaveChangesAsync();
    }

    public async Task<IReadOnlyList<RecurringForecastOccurrenceResponse>> ReadForecastAsync(
        Guid userGuid,
        DateOnly month
    )
    {
        var monthStart = new DateOnly(month.Year, month.Month, 1);
        var monthEnd = monthStart.AddMonths(1).AddDays(-1);
        var today = nowProvider.Today;

        if (monthEnd < today)
        {
            return [];
        }

        var rangeStart =
            monthStart > today || monthStart.Month != today.Month || monthStart.Year != today.Year
                ? monthStart
                : today;

        var userData = await GetCurrentUserAsync(userGuid);
        var rules = userData
            .RecurringRules.Where(rule =>
                rule.IsActive
                && rule.StartDate <= monthEnd
                && (rule.EndDate is null || rule.EndDate.Value >= rangeStart)
                && rule.Account!.HideTransactions == false
            )
            .ToList();
        var filteredRules = rules.Where(rule => !IsExcludedBudgetCategory(rule.Category)).ToList();

        var forecast = new List<RecurringForecastOccurrenceResponse>();
        foreach (var rule in filteredRules)
        {
            var dates = RecurringRuleOccurrenceCalculator.GetOccurrences(
                rule,
                rangeStart,
                monthEnd,
                responseLocalizer
            );
            var amount = GetForecastAmount(rule);

            // A charge counts as paid by a transaction in the same month on the rule's account
            // with the same name, category and subcategory, whatever its date or amount: either
            // linked to the rule, or not linked to any rule. Each pays its nearest due date.
            var unlinkedTransactions = (rule.Account?.Transactions ?? [])
                .Where(transaction =>
                    transaction.RecurringRuleID is null
                    && transaction.Deleted is null
                    && AreEqual(rule.MerchantName, transaction.MerchantName)
                    && AreEqual(rule.Category, transaction.Category)
                    && AreEqual(rule.Subcategory, transaction.Subcategory)
                    && IsWithinRange(transaction.Date, monthStart, monthEnd)
                )
                .ToList();
            var pairedOccurrences = PairTransactionsWithOccurrences(
                rule,
                responseLocalizer,
                [
                    .. rule.Transactions.Where(transaction =>
                        transaction.Deleted is null
                        && IsWithinRange(transaction.Date, monthStart, monthEnd)
                    ),
                    .. unlinkedTransactions,
                ],
                monthStart,
                monthEnd
            );
            foreach (var date in dates)
            {
                if (pairedOccurrences.Values.Contains(date))
                {
                    continue;
                }

                forecast.Add(
                    new RecurringForecastOccurrenceResponse
                    {
                        RuleID = rule.ID,
                        Date = date,
                        Amount = amount,
                        MerchantName = rule.MerchantName,
                        AccountID = rule.AccountID,
                        AccountName = rule.Account!.Name ?? string.Empty,
                        Category = rule.Category,
                        Subcategory = rule.Subcategory,
                    }
                );
            }
        }

        return
        [
            .. forecast
                .OrderBy(occurrence => occurrence.Date)
                .ThenBy(occurrence => occurrence.MerchantName),
        ];
    }

    public async Task MatchTransactionAsync(Guid userGuid, Transaction transaction)
    {
        if (
            transaction.RecurringRuleID.HasValue
            || transaction.Deleted.HasValue
            || IsExcludedBudgetCategory(transaction.Category)
            || transaction.SourceTransactionLink is not null
            || transaction.TargetTransactionLink is not null
        )
        {
            return;
        }

        var userData = await GetCurrentUserAsync(userGuid);
        var rules = userData
            .RecurringRules.Where(rule => rule.IsActive && rule.AccountID == transaction.AccountID)
            .Where(rule => !IsExcludedBudgetCategory(rule.Category))
            .ToList();

        // A rule on the same account with the same name, category and subcategory matches. When
        // several do, the amount picks between them.
        var matchingRules = rules
            .Where(rule => IsTransactionMatch(rule, transaction, responseLocalizer))
            .ToList();
        if (matchingRules.Count > 1)
        {
            matchingRules = NarrowMatches(
                matchingRules,
                rule => IsAmountWithinTolerance(GetForecastAmount(rule), transaction.Amount)
            );
        }
        if (matchingRules.Count != 1)
        {
            if (matchingRules.Count > 1)
            {
                logger.LogWarning(
                    "{LogMessage}",
                    logLocalizer["RecurringRuleAmbiguousMatchLog", transaction.ID]
                );
            }
            return;
        }

        var matchingRule = matchingRules[0];
        transaction.RecurringRuleID = matchingRule.ID;
        transaction.RecurringRule = matchingRule;
    }

    public async Task AssignTransactionsAsync(
        Guid userGuid,
        Guid recurringRuleID,
        IEnumerable<Guid> transactionIDs
    )
    {
        var userData = await GetCurrentUserAsync(userGuid);
        var rule =
            userData.RecurringRules.FirstOrDefault(r => r.ID == recurringRuleID)
            ?? throw new BudgetBoardServiceException(
                responseLocalizer["RecurringRuleNotFoundError"]
            );

        var transactions = transactionIDs
            .Distinct()
            .Select(transactionID => GetTransactionById(userData, transactionID))
            .ToList();

        foreach (var transaction in transactions)
        {
            if (transaction.AccountID != rule.AccountID)
            {
                throw new BudgetBoardServiceException(
                    responseLocalizer["RecurringRuleAccountMismatchError"]
                );
            }
            if (transaction.RecurringRuleID is Guid assignedRuleID && assignedRuleID != rule.ID)
            {
                throw new BudgetBoardServiceException(
                    responseLocalizer["TransactionAlreadyRecurringError"]
                );
            }
        }

        foreach (var transaction in transactions)
        {
            transaction.RecurringRuleID = rule.ID;
            transaction.RecurringRule = rule;
        }

        await userDataContext.SaveChangesAsync();
    }

    public async Task UnassignTransactionAsync(Guid userGuid, Guid transactionID)
    {
        var userData = await GetCurrentUserAsync(userGuid);
        var transaction = GetTransactionById(userData, transactionID);

        transaction.RecurringRuleID = null;
        transaction.RecurringRule = null;

        await userDataContext.SaveChangesAsync();
    }

    private async Task<ApplicationUser> GetCurrentUserAsync(Guid id)
    {
        return await UserDataServiceHelper.GetCurrentUserAsync(
            userDataContext,
            logger,
            logLocalizer,
            responseLocalizer,
            id,
            users =>
                users
                    .Include(u => u.RecurringRules)
                    .ThenInclude(r => r.Account)
                    .Include(u => u.RecurringRules)
                    .ThenInclude(r => r.Transactions)
                    .Include(u => u.Accounts)
                    .ThenInclude(a => a.Transactions)
        );
    }

    private RecurringRule GetRecurringRuleById(ApplicationUser user, Guid recurringRuleID)
    {
        return user.RecurringRules.FirstOrDefault(r => r.ID == recurringRuleID)
            ?? throw new BudgetBoardServiceException(
                responseLocalizer["RecurringRuleNotFoundError"]
            );
    }

    private Account GetAccountById(ApplicationUser user, Guid accountID)
    {
        return user.Accounts.FirstOrDefault(a => a.ID == accountID)
            ?? throw new BudgetBoardServiceException(
                responseLocalizer["RecurringRuleAccountNotFoundError"]
            );
    }

    private Transaction GetTransactionById(ApplicationUser user, Guid transactionID)
    {
        return user.Accounts.SelectMany(a => a.Transactions)
                .FirstOrDefault(t => t.ID == transactionID)
            ?? throw new BudgetBoardServiceException(responseLocalizer["TransactionNotFoundError"]);
    }

    private static bool IsTransactionMatch(
        RecurringRule rule,
        Transaction transaction,
        IStringLocalizer<ResponseStrings> responseLocalizer
    )
    {
        // The account is checked by the caller; the name, category and subcategory have to match.
        // The amount may differ, e.g. a bill that varies.
        if (
            !AreEqual(rule.MerchantName, transaction.MerchantName)
            || !AreEqual(rule.Category, transaction.Category)
            || !AreEqual(rule.Subcategory, transaction.Subcategory)
        )
        {
            return false;
        }

        return GetPairedOccurrences(
                rule,
                responseLocalizer,
                // Any due date in the transaction's month, however far from it.
                new DateOnly(transaction.Date.Year, transaction.Date.Month, 1),
                new DateOnly(transaction.Date.Year, transaction.Date.Month, 1)
                    .AddMonths(1)
                    .AddDays(-1),
                transaction
            )
            .ContainsKey(transaction);
    }

    private static IReadOnlyDictionary<Transaction, DateOnly> GetPairedOccurrences(
        RecurringRule rule,
        IStringLocalizer<ResponseStrings> responseLocalizer,
        DateOnly? requestedRangeStart = null,
        DateOnly? requestedRangeEnd = null,
        Transaction? additionalTransaction = null
    )
    {
        var transactions = rule
            .Transactions.Where(transaction =>
                transaction.Deleted is null
                && transaction != additionalTransaction
                && IsWithinRange(transaction.Date, requestedRangeStart, requestedRangeEnd)
            )
            .ToList();
        if (additionalTransaction is not null)
        {
            transactions.Add(additionalTransaction);
        }

        return PairTransactionsWithOccurrences(
            rule,
            responseLocalizer,
            transactions,
            requestedRangeStart,
            requestedRangeEnd
        );
    }

    /// <summary>
    /// Pairs each transaction with the rule's nearest occurrence within the date window, leaving
    /// ties unpaired.
    /// </summary>
    private static IReadOnlyDictionary<Transaction, DateOnly> PairTransactionsWithOccurrences(
        RecurringRule rule,
        IStringLocalizer<ResponseStrings> responseLocalizer,
        List<Transaction> transactions,
        DateOnly? requestedRangeStart,
        DateOnly? requestedRangeEnd
    )
    {
        if (transactions.Count == 0)
        {
            return new Dictionary<Transaction, DateOnly>();
        }

        var earliestDate = requestedRangeStart ?? transactions.Min(transaction => transaction.Date);
        var latestDate = requestedRangeEnd ?? transactions.Max(transaction => transaction.Date);
        var occurrenceRangeStart = earliestDate;
        var occurrenceRangeEnd = latestDate;
        var occurrences = RecurringRuleOccurrenceCalculator
            .GetOccurrences(rule, occurrenceRangeStart, occurrenceRangeEnd, responseLocalizer)
            .ToHashSet();
        var remainingTransactions = transactions.ToHashSet();
        var remainingOccurrences = occurrences.ToHashSet();
        var pairs = new List<(Transaction Transaction, DateOnly Occurrence)>();

        while (remainingTransactions.Count > 0 && remainingOccurrences.Count > 0)
        {
            var edges = remainingTransactions
                .SelectMany(transaction =>
                    remainingOccurrences.Select(occurrence =>
                        (
                            Transaction: transaction,
                            Occurrence: occurrence,
                            Distance: Math.Abs(transaction.Date.DayNumber - occurrence.DayNumber)
                        )
                    )
                )
                .ToList();
            if (edges.Count == 0)
            {
                break;
            }

            var nearestDistance = edges.Min(edge => edge.Distance);
            var nearestEdges = edges.Where(edge => edge.Distance == nearestDistance).ToList();
            var transactionCounts = nearestEdges
                .GroupBy(edge => edge.Transaction)
                .ToDictionary(group => group.Key, group => group.Count());
            var occurrenceCounts = nearestEdges
                .GroupBy(edge => edge.Occurrence)
                .ToDictionary(group => group.Key, group => group.Count());
            var unambiguousPairs = nearestEdges.Where(edge =>
                transactionCounts[edge.Transaction] == 1 && occurrenceCounts[edge.Occurrence] == 1
            );
            var pairCount = 0;
            foreach (var edge in unambiguousPairs)
            {
                pairs.Add((edge.Transaction, edge.Occurrence));
                remainingTransactions.Remove(edge.Transaction);
                remainingOccurrences.Remove(edge.Occurrence);
                pairCount++;
            }

            if (pairCount == 0)
            {
                break;
            }
        }

        return pairs.ToDictionary(pair => pair.Transaction, pair => pair.Occurrence);
    }

    /// <summary>
    /// Keeps the rules that pass the test, unless none do, in which case all are kept.
    /// </summary>
    private static List<RecurringRule> NarrowMatches(
        List<RecurringRule> rules,
        Func<RecurringRule, bool> test
    )
    {
        var narrowed = rules.Where(test).ToList();
        return narrowed.Count > 0 ? narrowed : rules;
    }

    private static bool IsWithinRange(DateOnly date, DateOnly? rangeStart, DateOnly? rangeEnd)
    {
        if (rangeStart is null || rangeEnd is null)
        {
            return true;
        }

        return date >= rangeStart.Value && date <= rangeEnd.Value;
    }

    private static decimal GetForecastAmount(RecurringRule rule)
    {
        if (rule.AmountMode == RecurringAmountMode.Fixed || rule.Transactions.Count < 2)
        {
            return rule.Amount;
        }

        var amounts = rule
            .Transactions.Where(transaction => transaction.Deleted is null)
            .Select(transaction => transaction.Amount)
            .OrderBy(amount => amount)
            .ToList();
        if (amounts.Count < 2)
        {
            return rule.Amount;
        }

        var middle = amounts.Count / 2;
        return amounts.Count % 2 == 0
            ? (amounts[middle - 1] + amounts[middle]) / 2
            : amounts[middle];
    }

    private static bool IsAmountWithinTolerance(decimal expected, decimal actual)
    {
        if (expected == 0)
        {
            return actual == 0;
        }

        return Math.Abs(actual - expected) <= Math.Abs(expected) * MatchAmountTolerance;
    }

    private static bool AreEqual(string? first, string? second) =>
        string.Equals(Normalize(first), Normalize(second), StringComparison.OrdinalIgnoreCase);

    private static string Normalize(string? value) =>
        new([.. (value ?? string.Empty).Where(char.IsLetterOrDigit)]);

    private static bool IsExcludedBudgetCategory(string? category) =>
        string.Equals(
            category,
            TransactionCategoriesConstants.TransferCategory,
            StringComparison.OrdinalIgnoreCase
        )
        || string.Equals(
            category,
            TransactionCategoriesConstants.HideFromBudgetsCategory,
            StringComparison.OrdinalIgnoreCase
        );

    private void ValidateCadence(RecurringCadence cadence)
    {
        try
        {
            RecurringCadenceSerializer.Validate(cadence, responseLocalizer);
        }
        catch (RecurringCadenceValidationException)
        {
            throw new BudgetBoardServiceException(
                responseLocalizer["RecurringRuleInvalidCadenceError"]
            );
        }
    }

    private RecurringAmountMode ParseAmountMode(string amountMode)
    {
        if (Enum.TryParse<RecurringAmountMode>(amountMode, true, out var parsed))
        {
            return parsed;
        }

        throw new BudgetBoardServiceException(
            responseLocalizer["RecurringRuleInvalidAmountModeError"]
        );
    }

    private void ValidateRequest(IRecurringRuleRequest request)
    {
        ValidateCadence(request.Cadence);
        ParseAmountMode(request.AmountMode);
        if (request.AccountID == Guid.Empty || request.StartDate == DateOnly.MinValue)
        {
            throw new BudgetBoardServiceException(
                responseLocalizer["RecurringRuleAccountAndStartDateRequiredError"]
            );
        }
        if (request.EndDate.HasValue && request.EndDate.Value < request.StartDate)
        {
            throw new BudgetBoardServiceException(
                responseLocalizer["RecurringRuleEndDateBeforeStartDateError"]
            );
        }
        if (request.Amount == 0)
        {
            throw new BudgetBoardServiceException(
                responseLocalizer["RecurringRuleZeroAmountError"]
            );
        }
    }
}
