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

/// <inheritdoc />
public class BillService(
    ILogger<IBillService> logger,
    UserDataContext userDataContext,
    IStringLocalizer<ResponseStrings> responseLocalizer,
    IStringLocalizer<LogStrings> logLocalizer
) : IBillService
{
    /// <inheritdoc />
    public async Task CreateBillAsync(Guid userGuid, IBillCreateRequest request)
    {
        var userData = await GetCurrentUserAsync(userGuid);

        var name = ValidateFields(
            userData,
            request.Name,
            request.Amount,
            request.DueDay,
            request.UseAccountBalance,
            request.AccountID
        );

        var bill = new Bill
        {
            Name = name,
            Amount = request.Amount,
            DueDay = request.DueDay,
            UseAccountBalance = request.UseAccountBalance,
            AccountID = request.AccountID,
            UserID = userData.Id,
        };

        userDataContext.Bills.Add(bill);
        await userDataContext.SaveChangesAsync();
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<IBillResponse>> ReadBillsAsync(Guid userGuid)
    {
        var userData = await GetCurrentUserAsync(userGuid);

        return userData
            .Bills.OrderBy(b => b.DueDay)
            .ThenBy(b => b.Name)
            .Select(b => (IBillResponse)new BillResponse(b))
            .ToList();
    }

    /// <inheritdoc />
    public async Task UpdateBillAsync(Guid userGuid, IBillUpdateRequest request)
    {
        var userData = await GetCurrentUserAsync(userGuid);
        var bill = GetBillById(userData, request.ID);

        var name = ValidateFields(
            userData,
            request.Name,
            request.Amount,
            request.DueDay,
            request.UseAccountBalance,
            request.AccountID
        );

        bill.Name = name;
        bill.Amount = request.Amount;
        bill.DueDay = request.DueDay;
        bill.UseAccountBalance = request.UseAccountBalance;
        bill.AccountID = request.AccountID;
        bill.LastPaidDueDate = request.LastPaidDueDate;

        await userDataContext.SaveChangesAsync();
    }

    /// <inheritdoc />
    public async Task DeleteBillAsync(Guid userGuid, Guid billId)
    {
        var userData = await GetCurrentUserAsync(userGuid);
        var bill = GetBillById(userData, billId);

        userDataContext.Bills.Remove(bill);
        await userDataContext.SaveChangesAsync();
    }

    private string ValidateFields(
        ApplicationUser userData,
        string? name,
        decimal amount,
        int dueDay,
        bool useAccountBalance,
        Guid? accountId
    )
    {
        var trimmedName = name?.Trim() ?? string.Empty;
        if (trimmedName.Length == 0 || trimmedName.Length > Bill.MaxNameLength)
        {
            logger.LogError("{LogMessage}", logLocalizer["BillInvalidNameLog"]);
            throw new BudgetBoardServiceException(responseLocalizer["BillInvalidNameError"]);
        }

        if (dueDay < 1 || dueDay > 31)
        {
            logger.LogError("{LogMessage}", logLocalizer["BillInvalidDueDayLog"]);
            throw new BudgetBoardServiceException(responseLocalizer["BillInvalidDueDayError"]);
        }

        if (amount < 0)
        {
            logger.LogError("{LogMessage}", logLocalizer["BillNegativeAmountLog"]);
            throw new BudgetBoardServiceException(responseLocalizer["BillNegativeAmountError"]);
        }

        if (useAccountBalance && !accountId.HasValue)
        {
            logger.LogError("{LogMessage}", logLocalizer["BillUseBalanceWithoutAccountLog"]);
            throw new BudgetBoardServiceException(
                responseLocalizer["BillUseBalanceWithoutAccountError"]
            );
        }

        if (accountId.HasValue && !userData.Accounts.Any(a => a.ID == accountId.Value))
        {
            logger.LogError("{LogMessage}", logLocalizer["BillInvalidAccountLog"]);
            throw new BudgetBoardServiceException(responseLocalizer["BillInvalidAccountError"]);
        }

        return trimmedName;
    }

    private async Task<ApplicationUser> GetCurrentUserAsync(Guid id)
    {
        return await UserDataServiceHelper.GetCurrentUserAsync(
            userDataContext,
            logger,
            logLocalizer,
            responseLocalizer,
            id,
            users => users.Include(u => u.Bills).Include(u => u.Accounts)
        );
    }

    private Bill GetBillById(ApplicationUser user, Guid billId)
    {
        var bill = user.Bills.FirstOrDefault(b => b.ID == billId);
        if (bill == null)
        {
            logger.LogError("{LogMessage}", logLocalizer["BillNotFoundLog"]);
            throw new BudgetBoardServiceException(responseLocalizer["BillNotFoundError"]);
        }

        return bill;
    }
}
