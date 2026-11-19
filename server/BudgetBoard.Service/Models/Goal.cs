using BudgetBoard.Database.Models;

namespace BudgetBoard.Service.Models;

public interface IGoalCreateRequest
{
    string Name { get; }
    DateOnly? CompleteDate { get; }
    decimal Amount { get; }
    bool ApplyExistingBalanceTowardsGoal { get; }
    decimal? MonthlyContribution { get; }
    IEnumerable<Guid> AccountIds { get; }
    bool IsManual { get; }
    decimal? StartingAmount { get; }
}

public class GoalCreateRequest : IGoalCreateRequest
{
    public required string Name { get; set; }
    public DateOnly? CompleteDate { get; set; } = null;
    public required decimal Amount { get; set; } = 0.0M;
    public bool ApplyExistingBalanceTowardsGoal { get; set; } = false;
    public decimal? MonthlyContribution { get; set; } = null;
    public IEnumerable<Guid> AccountIds { get; set; } = [];

    /// <summary>
    /// When true, the goal is not linked to any accounts and progress is tracked by manual contributions.
    /// </summary>
    public bool IsManual { get; set; } = false;

    /// <summary>
    /// For manual goals, an optional amount already saved, logged as the first contribution.
    /// </summary>
    public decimal? StartingAmount { get; set; } = null;
}

public interface IGoalContributionCreateRequest
{
    Guid GoalID { get; }
    decimal Amount { get; }
    DateOnly? Date { get; }
}

public class GoalContributionCreateRequest : IGoalContributionCreateRequest
{
    public required Guid GoalID { get; set; }
    public required decimal Amount { get; set; }
    public DateOnly? Date { get; set; } = null;
}

public interface IGoalContributionResponse
{
    Guid ID { get; }
    decimal Amount { get; }
    DateOnly Date { get; }
    Guid GoalID { get; }
}

public class GoalContributionResponse : IGoalContributionResponse
{
    public Guid ID { get; set; }
    public decimal Amount { get; set; }
    public DateOnly Date { get; set; }
    public Guid GoalID { get; set; }

    public GoalContributionResponse(GoalContribution contribution)
    {
        ID = contribution.ID;
        Amount = contribution.Amount;
        Date = contribution.Date;
        GoalID = contribution.GoalID;
    }
}

public interface IGoalUpdateRequest
{
    Guid ID { get; }
    string? Name { get; }
    OptionalField<DateOnly?> CompleteDate { get; }
    decimal? Amount { get; }
    OptionalField<decimal?> MonthlyContribution { get; }
}

public class GoalUpdateRequest : IGoalUpdateRequest
{
    public Guid ID { get; set; }
    public string? Name { get; set; } = string.Empty;
    public OptionalField<DateOnly?> CompleteDate { get; set; } = new OptionalField<DateOnly?>();
    public decimal? Amount { get; set; } = null;
    public OptionalField<decimal?> MonthlyContribution { get; set; } =
        new OptionalField<decimal?>();
}

public interface IGoalTransactionResponse
{
    Guid ID { get; }
    DateOnly Date { get; }
    decimal Amount { get; }
    decimal CountedAmount { get; }
    string? MerchantName { get; }
    string AccountName { get; }
}

public class GoalTransactionResponse : IGoalTransactionResponse
{
    public Guid ID { get; set; }
    public DateOnly Date { get; set; }
    public decimal Amount { get; set; }
    public decimal CountedAmount { get; set; }
    public string? MerchantName { get; set; }
    public string AccountName { get; set; } = string.Empty;

    public GoalTransactionResponse(Transaction transaction)
    {
        ID = transaction.ID;
        Date = transaction.Date;
        Amount = transaction.Amount;
        CountedAmount = Math.Abs(transaction.Amount);
        MerchantName = transaction.MerchantName;
        AccountName = transaction.Account?.Name ?? string.Empty;
    }
}

public interface IGoalResponse
{
    Guid ID { get; }
    string Name { get; }
    DateOnly? CompleteDate { get; }
    bool IsCompleteDateEditable { get; }
    decimal Amount { get; }
    decimal InitialAmount { get; }
    decimal MonthlyContribution { get; }
    bool IsMonthlyContributionEditable { get; }
    decimal MonthlyContributionProgress { get; }
    decimal? InterestRate { get; }
    DateOnly? Completed { get; }
    decimal PercentComplete { get; }
    IEnumerable<IAccountResponse> Accounts { get; }
    bool IsManual { get; }
    decimal CurrentAmount { get; }
    IEnumerable<IGoalContributionResponse> Contributions { get; }
    IEnumerable<IGoalTransactionResponse> Transactions { get; }
    Guid UserID { get; }
}

public class GoalResponse : IGoalResponse
{
    public Guid ID { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public DateOnly? CompleteDate { get; set; } = null;
    public bool IsCompleteDateEditable { get; set; } = false;
    public decimal Amount { get; set; } = 0.0M;
    public decimal InitialAmount { get; set; } = 0.0M;
    public decimal MonthlyContribution { get; set; } = 0.0M;
    public bool IsMonthlyContributionEditable { get; set; } = false;
    public decimal MonthlyContributionProgress { get; set; } = 0.0M;
    public decimal? InterestRate { get; set; } = null;
    public DateOnly? Completed { get; set; } = null;
    public decimal PercentComplete { get; set; } = 0.0M;
    public IEnumerable<IAccountResponse> Accounts { get; set; } = [];
    public bool IsManual { get; set; } = false;
    public decimal CurrentAmount { get; set; } = 0.0M;
    public IEnumerable<IGoalContributionResponse> Contributions { get; set; } = [];
    public IEnumerable<IGoalTransactionResponse> Transactions { get; set; } = [];
    public Guid UserID { get; set; } = Guid.NewGuid();

    public GoalResponse(Goal goal)
    {
        ID = goal.ID;
        Name = goal.Name;
        CompleteDate = goal.CompleteDate;
        IsCompleteDateEditable = goal.CompleteDate != null;
        Amount = goal.Amount;
        InitialAmount = goal.InitialAmount;
        MonthlyContribution = goal.MonthlyContribution ?? 0;
        IsMonthlyContributionEditable = goal.MonthlyContribution != null;
        MonthlyContributionProgress = 0;
        InterestRate = null;
        Completed = goal.Completed;
        PercentComplete = 0.0M;
        Accounts = goal.Accounts.Select(a => new AccountResponse(a));
        IsManual = goal.IsManual;
        Contributions = goal
            .Contributions.OrderByDescending(c => c.Date)
            .Select(c => new GoalContributionResponse(c));
        Transactions = goal
            .Transactions.Where(t => t.Deleted == null)
            .OrderByDescending(t => t.Date)
            .Select(t => new GoalTransactionResponse(t));
        UserID = goal.UserID;
    }
}
