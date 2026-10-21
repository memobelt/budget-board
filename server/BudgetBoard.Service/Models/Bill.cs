using BudgetBoard.Database.Models;

namespace BudgetBoard.Service.Models;

public interface IBillCreateRequest
{
    string Name { get; }
    decimal Amount { get; }
    int DueDay { get; }
    bool UseAccountBalance { get; }
    Guid? AccountID { get; }
    string? AccountLastFour { get; }
}

public class BillCreateRequest : IBillCreateRequest
{
    public required string Name { get; set; }
    public decimal Amount { get; set; } = 0.0M;
    public required int DueDay { get; set; }
    public bool UseAccountBalance { get; set; } = false;
    public Guid? AccountID { get; set; } = null;
    public string? AccountLastFour { get; set; } = null;
}

public interface IBillUpdateRequest
{
    Guid ID { get; }
    string Name { get; }
    decimal Amount { get; }
    int DueDay { get; }
    bool UseAccountBalance { get; }
    Guid? AccountID { get; }
    string? AccountLastFour { get; }
    DateOnly? LastPaidDueDate { get; }
}

public class BillUpdateRequest : IBillUpdateRequest
{
    public required Guid ID { get; set; }
    public required string Name { get; set; }
    public decimal Amount { get; set; } = 0.0M;
    public required int DueDay { get; set; }
    public bool UseAccountBalance { get; set; } = false;
    public Guid? AccountID { get; set; } = null;
    public string? AccountLastFour { get; set; } = null;
    public DateOnly? LastPaidDueDate { get; set; } = null;
}

public interface IBillResponse
{
    Guid ID { get; }
    string Name { get; }
    decimal Amount { get; }
    int DueDay { get; }
    bool UseAccountBalance { get; }
    Guid? AccountID { get; }
    string? AccountLastFour { get; }
    DateOnly? LastPaidDueDate { get; }
    Guid UserID { get; }
}

public class BillResponse : IBillResponse
{
    public Guid ID { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public int DueDay { get; set; }
    public bool UseAccountBalance { get; set; }
    public Guid? AccountID { get; set; }
    public string? AccountLastFour { get; set; }
    public DateOnly? LastPaidDueDate { get; set; }
    public Guid UserID { get; set; }

    public BillResponse(Bill bill)
    {
        ID = bill.ID;
        Name = bill.Name;
        Amount = bill.Amount;
        DueDay = bill.DueDay;
        UseAccountBalance = bill.UseAccountBalance;
        AccountID = bill.AccountID;
        AccountLastFour = bill.AccountLastFour;
        LastPaidDueDate = bill.LastPaidDueDate;
        UserID = bill.UserID;
    }
}
