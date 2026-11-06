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

public class GoalService(
    ILogger<IGoalService> logger,
    UserDataContext userDataContext,
    INowProvider nowProvider,
    IStringLocalizer<ResponseStrings> responseLocalizer,
    IStringLocalizer<LogStrings> logLocalizer
) : IGoalService
{
    /// <inheritdoc />
    public async Task CreateGoalAsync(Guid userGuid, IGoalCreateRequest request)
    {
        var userData = await GetCurrentUserAsync(userGuid);

        // A goal may have a target date, a monthly contribution, or neither (an open-ended goal).
        // A monthly contribution of zero is treated as not set.
        var monthlyContribution =
            request.MonthlyContribution == 0 ? null : request.MonthlyContribution;

        if (monthlyContribution.HasValue && request.CompleteDate.HasValue)
        {
            logger.LogError("{LogMessage}", logLocalizer["GoalBothDateAndContributionLog"]);
            throw new BudgetBoardServiceException(
                responseLocalizer["GoalBothDateAndContributionError"]
            );
        }

        if (request.CompleteDate.HasValue && request.CompleteDate.Value < nowProvider.Today)
        {
            logger.LogError("{LogMessage}", logLocalizer["GoalCreatePastDateLog"]);
            throw new BudgetBoardServiceException(responseLocalizer["GoalCreateInPastError"]);
        }

        if (request.IsManual)
        {
            await CreateManualGoalAsync(userData, request, monthlyContribution);
            return;
        }

        if (!request.AccountIds.Any())
        {
            logger.LogError("{LogMessage}", logLocalizer["GoalCreateNoAccountsLog"]);
            throw new BudgetBoardServiceException(responseLocalizer["GoalCreateNoAccountsError"]);
        }

        decimal runningBalance = 0.0M;
        var accounts = new List<Account>();
        foreach (var accountId in request.AccountIds)
        {
            var account = userData.Accounts.FirstOrDefault((a) => a.ID == accountId);
            if (account == null)
            {
                logger.LogError("{LogMessage}", logLocalizer["GoalCreateInvalidAccountLog"]);
                throw new BudgetBoardServiceException(
                    responseLocalizer["GoalCreateInvalidAccountError"]
                );
            }

            runningBalance +=
                account.Balances.OrderByDescending(b => b.Date).FirstOrDefault()?.Amount ?? 0;
            accounts.Add(account);
        }

        var newGoal = new Goal
        {
            Name = request.Name,
            CompleteDate = request.CompleteDate,
            Amount = request.Amount,
            InitialAmount = request.ApplyExistingBalanceTowardsGoal ? 0.0M : runningBalance,
            MonthlyContribution = monthlyContribution,
            Accounts = accounts,
            UserID = userData.Id,
        };

        userDataContext.Goals.Add(newGoal);
        await userDataContext.SaveChangesAsync();
    }

    private async Task CreateManualGoalAsync(
        ApplicationUser userData,
        IGoalCreateRequest request,
        decimal? monthlyContribution
    )
    {
        if (request.Amount <= 0)
        {
            logger.LogError("{LogMessage}", logLocalizer["GoalCreateManualInvalidAmountLog"]);
            throw new BudgetBoardServiceException(
                responseLocalizer["GoalCreateManualInvalidAmountError"]
            );
        }

        if (request.AccountIds.Any())
        {
            logger.LogError("{LogMessage}", logLocalizer["GoalCreateManualWithAccountsLog"]);
            throw new BudgetBoardServiceException(
                responseLocalizer["GoalCreateManualWithAccountsError"]
            );
        }

        var newGoal = new Goal
        {
            Name = request.Name,
            CompleteDate = request.CompleteDate,
            Amount = request.Amount,
            InitialAmount = 0.0M,
            MonthlyContribution = monthlyContribution,
            IsManual = true,
            UserID = userData.Id,
        };

        if (request.StartingAmount is decimal startingAmount && startingAmount != 0)
        {
            newGoal.Contributions.Add(
                new GoalContribution
                {
                    Amount = startingAmount,
                    Date = nowProvider.Today,
                    GoalID = newGoal.ID,
                }
            );
        }

        userDataContext.Goals.Add(newGoal);
        await userDataContext.SaveChangesAsync();
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<IGoalResponse>> ReadGoalsAsync(
        Guid userGuid,
        bool includeInterest
    )
    {
        var userData = await GetCurrentUserAsync(userGuid);

        var goalsResponse = new List<IGoalResponse>();
        var goals = userData.Goals.ToList();
        foreach (var goal in goals)
        {
            goalsResponse.Add(
                new GoalResponse(goal)
                {
                    CompleteDate = EstimateGoalCompleteDate(goal, includeInterest),
                    // Have to manually set this, since we override the CompleteDate in the constructor.
                    IsCompleteDateEditable = goal.CompleteDate != null,
                    MonthlyContribution = EstimateGoalMonthlyContribution(goal, includeInterest),
                    // Have to manually set this, since we override the MonthlyContribution in the constructor.
                    IsMonthlyContributionEditable = goal.MonthlyContribution != null,
                    MonthlyContributionProgress = GetGoalMonthlyContributionProgress(goal),
                    CurrentAmount = GetGoalBalance(goal) - goal.InitialAmount,
                    InterestRate = CalculateAverageInterestRate(goal),
                    PercentComplete = CalculatePercentComplete(goal),
                }
            );
        }

        return goalsResponse;
    }

    /// <inheritdoc />
    public async Task UpdateGoalAsync(Guid userGuid, IGoalUpdateRequest request)
    {
        var userData = await GetCurrentUserAsync(userGuid);
        var goal = GetGoalById(userData, request.ID);

        if (
            request.CompleteDate.IsSpecified
            && request.CompleteDate.Value.HasValue
            && request.MonthlyContribution.IsSpecified
            && request.MonthlyContribution.Value.HasValue
        )
        {
            logger.LogError("{LogMessage}", logLocalizer["GoalBothDateAndContributionLog"]);
            throw new BudgetBoardServiceException(
                responseLocalizer["GoalBothDateAndContributionError"]
            );
        }

        var completeDate = request.CompleteDate;
        if (
            completeDate.IsSpecified
            && completeDate.Value is DateOnly completeDateValue
            && completeDateValue < nowProvider.Today
        )
        {
            logger.LogError("{LogMessage}", logLocalizer["GoalUpdatePastDateLog"]);
            throw new BudgetBoardServiceException(responseLocalizer["GoalUpdatePastDateError"]);
        }

        var monthlyContribution = request.MonthlyContribution;
        if (
            monthlyContribution.IsSpecified
            && monthlyContribution.Value is decimal monthlyContributionValue
            && monthlyContributionValue <= 0
        )
        {
            logger.LogError("{LogMessage}", logLocalizer["GoalUpdateNoMonthlyContributionLog"]);
            throw new BudgetBoardServiceException(
                responseLocalizer["GoalUpdateNoMonthlyContributionError"]
            );
        }

        if (!string.IsNullOrEmpty(request.Name))
        {
            goal.Name = request.Name;
        }
        if (request.Amount.HasValue)
        {
            goal.Amount = request.Amount.Value;
        }
        if (request.CompleteDate.IsSpecified)
        {
            goal.CompleteDate = request.CompleteDate.Value;
        }
        if (request.MonthlyContribution.IsSpecified)
        {
            goal.MonthlyContribution = request.MonthlyContribution.Value;
        }

        await userDataContext.SaveChangesAsync();
    }

    /// <inheritdoc />
    public async Task DeleteGoalAsync(Guid userGuid, Guid guid)
    {
        var userData = await GetCurrentUserAsync(userGuid);
        var goal = GetGoalById(userData, guid);

        userDataContext.Goals.Remove(goal);
        await userDataContext.SaveChangesAsync();
    }

    /// <inheritdoc />
    public async Task CompleteGoalAsync(Guid userGuid, Guid goalID, DateOnly completedDate)
    {
        var userData = await GetCurrentUserAsync(userGuid);
        var goal = GetGoalById(userData, goalID);

        if (goal.Completed.HasValue)
        {
            logger.LogError("{LogMessage}", logLocalizer["GoalCompleteAlreadyCompletedLog"]);
            throw new BudgetBoardServiceException(
                responseLocalizer["GoalCompleteAlreadyCompletedError"]
            );
        }

        goal.Completed = completedDate;
        await userDataContext.SaveChangesAsync();
    }

    /// <inheritdoc />
    public async Task CompleteEligibleGoalsAsync(Guid userGuid)
    {
        var userData = await GetCurrentUserAsync(userGuid);

        var goals = userData.Goals.ToList();
        foreach (var goal in goals)
        {
            // Skip goals that are already completed
            if (goal.Completed.HasValue)
                continue;

            var percentComplete = CalculatePercentComplete(goal);

            // Complete the goal if it's 100% complete
            if (percentComplete >= 100.0M)
            {
                goal.Completed = nowProvider.Today;
            }
        }

        await userDataContext.SaveChangesAsync();
    }

    /// <inheritdoc />
    public async Task AddContributionAsync(Guid userGuid, IGoalContributionCreateRequest request)
    {
        var userData = await GetCurrentUserAsync(userGuid);
        var goal = GetGoalById(userData, request.GoalID);

        if (!goal.IsManual)
        {
            logger.LogError("{LogMessage}", logLocalizer["GoalContributionNotManualLog"]);
            throw new BudgetBoardServiceException(
                responseLocalizer["GoalContributionNotManualError"]
            );
        }

        if (request.Amount == 0)
        {
            logger.LogError("{LogMessage}", logLocalizer["GoalContributionZeroAmountLog"]);
            throw new BudgetBoardServiceException(
                responseLocalizer["GoalContributionZeroAmountError"]
            );
        }

        var contribution = new GoalContribution
        {
            Amount = request.Amount,
            Date = request.Date ?? nowProvider.Today,
            GoalID = goal.ID,
        };

        userDataContext.GoalContributions.Add(contribution);
        await userDataContext.SaveChangesAsync();
    }

    /// <inheritdoc />
    public async Task DeleteContributionAsync(Guid userGuid, Guid contributionId)
    {
        var userData = await GetCurrentUserAsync(userGuid);

        var contribution = userData
            .Goals.SelectMany(g => g.Contributions)
            .FirstOrDefault(c => c.ID == contributionId);
        if (contribution == null)
        {
            logger.LogError("{LogMessage}", logLocalizer["GoalContributionNotFoundLog"]);
            throw new BudgetBoardServiceException(
                responseLocalizer["GoalContributionNotFoundError"]
            );
        }

        userDataContext.GoalContributions.Remove(contribution);
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
                    .Include(u => u.Goals)
                    .ThenInclude((g) => g.Accounts)
                    .ThenInclude((a) => a.Transactions)
                    .Include(u => u.Goals)
                    .ThenInclude(g => g.Contributions)
                    .Include(u => u.Goals)
                    .ThenInclude(g => g.Transactions)
                    .Include(u => u.Accounts)
                    .ThenInclude(a => a.Balances)
        );
    }

    private Goal GetGoalById(ApplicationUser user, Guid goalId)
    {
        var goal = user.Goals.FirstOrDefault(g => g.ID == goalId);
        if (goal == null)
        {
            logger.LogError("{LogMessage}", logLocalizer["GoalNotFoundLog"]);
            throw new BudgetBoardServiceException(responseLocalizer["GoalNotFoundError"]);
        }

        return goal;
    }

    private DateOnly? EstimateGoalCompleteDate(Goal goal, bool includeInterest = false)
    {
        if (goal.CompleteDate.HasValue)
        {
            return goal.CompleteDate.Value;
        }

        // Open-ended goals have neither a target date nor a monthly contribution,
        // so there is no completion date to project.
        if (goal.MonthlyContribution == null || goal.MonthlyContribution == 0)
        {
            return null;
        }

        decimal totalBalance = GetGoalBalance(goal);
        decimal amountLeft;
        if (goal.InitialAmount < 0)
        {
            // The amount for a debt is just the value of the debt.
            amountLeft = Math.Abs(totalBalance);
        }
        else
        {
            // The initial amount is the account balance at the time the goal was created.
            // If a user wishes to include the starting balance in the goal,
            // the initial amount will be set to zero.
            amountLeft = goal.Amount - goal.InitialAmount - totalBalance;
        }

        var numberOfMonthsLeftWithoutInterest = Math.Ceiling(
            amountLeft / (goal.MonthlyContribution ?? 0)
        );

        if (includeInterest)
        {
            var monthlyInterestRate = CalculateAverageInterestRate(goal) / 12;
            double numberOfMonthsLeftWithInterest = (double)numberOfMonthsLeftWithoutInterest;
            if (monthlyInterestRate > 0)
            {
                if (goal.Amount == 0)
                {
                    numberOfMonthsLeftWithInterest = Math.Ceiling(
                        Math.Log(
                            (double)(
                                (goal.MonthlyContribution ?? 0)
                                / monthlyInterestRate
                                / (
                                    ((goal.MonthlyContribution ?? 0) / monthlyInterestRate)
                                    - amountLeft
                                )
                            )
                        ) / Math.Log(1 + (double)monthlyInterestRate)
                    );
                }
                else
                {
                    numberOfMonthsLeftWithInterest = Math.Ceiling(
                        Math.Log(
                            (double)(
                                (
                                    (goal.MonthlyContribution ?? 0)
                                    + monthlyInterestRate * goal.Amount
                                )
                                / (
                                    (goal.MonthlyContribution ?? 0)
                                    + monthlyInterestRate * totalBalance
                                )
                            )
                        ) / Math.Log(1 + (double)monthlyInterestRate)
                    );
                }
            }

            return new DateOnly(nowProvider.Today.Year, nowProvider.Today.Month, 1).AddMonths(
                (int)numberOfMonthsLeftWithInterest
            );
        }

        return new DateOnly(nowProvider.Today.Year, nowProvider.Today.Month, 1).AddMonths(
            (int)numberOfMonthsLeftWithoutInterest
        );
    }

    private decimal EstimateGoalMonthlyContribution(Goal goal, bool includeInterest = false)
    {
        if (goal.MonthlyContribution.HasValue)
        {
            return goal.MonthlyContribution.Value;
        }

        // Open-ended goals have neither a monthly contribution nor a target date.
        if (!goal.CompleteDate.HasValue)
        {
            return 0;
        }

        decimal totalBalance = GetGoalBalance(goal);
        decimal amountLeft;
        if (goal.Amount == 0)
        {
            // The amount for a debt is just the value of the debt.
            amountLeft = Math.Abs(totalBalance);
        }
        else
        {
            // The initial amount is the account balance at the time the goal was created.
            // If a user wishes to include the starting balance in the goal,
            // the initial amount will be set to zero.
            amountLeft = goal.Amount - (totalBalance - goal.InitialAmount);
        }

        var numberOfMonthsLeft =
            (goal.CompleteDate.Value.Year - nowProvider.Today.Year) * 12
            + (goal.CompleteDate.Value.Month - nowProvider.Today.Month);

        if (numberOfMonthsLeft <= 0)
        {
            // The goal is already past due, so you need to contribute the rest of the goal.
            return amountLeft;
        }

        var monthlyPaymentsWithoutInterest = amountLeft / numberOfMonthsLeft;

        // For now, we will just apply this to loans.
        if (includeInterest)
        {
            var monthlyInterestRate = CalculateAverageInterestRate(goal) / 12;
            decimal monthlyPaymentsWithInterest = monthlyPaymentsWithoutInterest;

            if (monthlyInterestRate > 0)
            {
                if (goal.Amount == 0)
                {
                    monthlyPaymentsWithInterest =
                        amountLeft
                        * (
                            monthlyInterestRate
                            * (decimal)Math.Pow(1 + (double)monthlyInterestRate, numberOfMonthsLeft)
                            / (
                                (
                                    (decimal)
                                        Math.Pow(
                                            1 + (double)monthlyInterestRate,
                                            numberOfMonthsLeft
                                        )
                                ) - 1
                            )
                        );
                }
                else
                {
                    monthlyPaymentsWithInterest =
                        (
                            monthlyInterestRate
                            * (
                                goal.Amount
                                - totalBalance
                                    * (decimal)
                                        Math.Pow(
                                            (double)(1 + monthlyInterestRate),
                                            numberOfMonthsLeft
                                        )
                            )
                        )
                        / (
                            (decimal)Math.Pow((double)(1 + monthlyInterestRate), numberOfMonthsLeft)
                            - 1
                        );
                }
            }

            return monthlyPaymentsWithInterest;
        }

        return monthlyPaymentsWithoutInterest;
    }

    /// <summary>
    /// Returns the goal's current total: the sum of logged contributions for manual goals,
    /// or the sum of the latest balances of the linked accounts otherwise.
    /// </summary>
    private static decimal GetGoalBalance(Goal goal)
    {
        if (goal.IsManual)
        {
            return goal.Contributions.Sum(c => c.Amount)
                + GetCountedTransactions(goal).Sum(GetCountedTransactionAmount);
        }

        return goal.Accounts.Sum(a =>
            a.Balances.OrderByDescending(b => b.Date).FirstOrDefault()?.Amount ?? 0
        );
    }

    /// <summary>
    /// Transactions the user chose to count towards a manual goal, excluding deleted ones.
    /// </summary>
    private static IEnumerable<Transaction> GetCountedTransactions(Goal goal) =>
        goal.Transactions.Where(t => t.Deleted == null);

    /// <summary>
    /// A transaction counts towards a goal by its size, regardless of sign: moving money out of
    /// checking into savings (negative) and receiving money set aside for the goal (positive)
    /// both add to the goal.
    /// </summary>
    private static decimal GetCountedTransactionAmount(Transaction transaction) =>
        Math.Abs(transaction.Amount);

    private decimal GetGoalMonthlyContributionProgress(Goal goal)
    {
        if (goal.IsManual)
        {
            bool IsThisMonth(DateOnly date) =>
                date.Year == nowProvider.Today.Year && date.Month == nowProvider.Today.Month;

            return goal.Contributions.Where(c => IsThisMonth(c.Date)).Sum(c => c.Amount)
                + GetCountedTransactions(goal)
                    .Where(t => IsThisMonth(t.Date))
                    .Sum(GetCountedTransactionAmount);
        }

        return GetTransactionsMonthlyProgress(goal.Accounts.SelectMany(a => a.Transactions));
    }

    private decimal GetTransactionsMonthlyProgress(IEnumerable<Transaction> transactions)
    {
        if (!transactions.Any())
        {
            return 0;
        }

        return transactions
            .Where(t =>
                t.Date.Year == nowProvider.Today.Year && t.Date.Month == nowProvider.Today.Month
            )
            .Sum(t => t.Amount);
    }

    private decimal CalculatePercentComplete(Goal goal)
    {
        decimal effectiveTargetAmount;
        // An initial amount less than zero indicates a debt.
        if (goal.InitialAmount < 0)
        {
            effectiveTargetAmount = Math.Abs(goal.InitialAmount);
        }
        else
        {
            effectiveTargetAmount = goal.Amount;
        }

        // An effective target amount of 0 is invalid, so just return 0 to prevent a divide by zero error.
        if (effectiveTargetAmount == 0)
        {
            logger.LogError("{LogMessage}", logLocalizer["GoalPercentCompleteZeroTargetAmountLog"]);
            return 0.0M;
        }

        var accountsTotalBalance = GetGoalBalance(goal);
        decimal currentProgress = accountsTotalBalance - goal.InitialAmount;
        decimal percentComplete = currentProgress / effectiveTargetAmount * 100.0M;

        return percentComplete > 100.0M ? 100.0M : percentComplete;
    }

    private static decimal CalculateAverageInterestRate(Goal goal)
    {
        var weightedInterestRates = new List<decimal>();
        var totalBalance = 0.0M;

        foreach (var account in goal.Accounts)
        {
            var balance = account.Balances.OrderByDescending(b => b.Date).FirstOrDefault();

            if (balance == null || balance.Amount == 0)
                continue;

            var interestRate = account.InterestRate;
            var weightedInterestRate = interestRate * balance.Amount;

            if (weightedInterestRate == 0)
                continue;

            weightedInterestRates.Add(weightedInterestRate);
            totalBalance += balance.Amount;
        }

        return weightedInterestRates.Count > 0 ? weightedInterestRates.Sum() / totalBalance : 0;
    }
}
