using BudgetBoard.Service.Models;

namespace BudgetBoard.Service.Interfaces;

/// <summary>
/// Service for managing manually entered bills.
/// </summary>
public interface IBillService
{
    /// <summary>
    /// Creates a new bill for the specified user.
    /// </summary>
    /// <param name="userGuid">The unique identifier of the user.</param>
    /// <param name="request">The bill creation details.</param>
    Task CreateBillAsync(Guid userGuid, IBillCreateRequest request);

    /// <summary>
    /// Retrieves all bills for the specified user.
    /// </summary>
    /// <param name="userGuid">The unique identifier of the user.</param>
    /// <returns>A collection of bills.</returns>
    Task<IReadOnlyList<IBillResponse>> ReadBillsAsync(Guid userGuid);

    /// <summary>
    /// Updates an existing bill.
    /// </summary>
    /// <param name="userGuid">The unique identifier of the user.</param>
    /// <param name="request">The bill update details.</param>
    Task UpdateBillAsync(Guid userGuid, IBillUpdateRequest request);

    /// <summary>
    /// Deletes a bill.
    /// </summary>
    /// <param name="userGuid">The unique identifier of the user.</param>
    /// <param name="billId">The unique identifier of the bill to delete.</param>
    Task DeleteBillAsync(Guid userGuid, Guid billId);
}
