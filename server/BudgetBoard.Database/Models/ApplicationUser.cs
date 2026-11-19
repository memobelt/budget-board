using Microsoft.AspNetCore.Identity;

namespace BudgetBoard.Database.Models;

/// <summary>
/// Represents an application user within the budgeting application.
/// </summary>
/// <remarks>
/// Inherits from IdentityUser to integrate with ASP.NET Core Identity for authentication and authorization.
/// </remarks>
public class ApplicationUser : IdentityUser<Guid>
{
    /// <summary>
    /// Access token for SimpleFIN service integration.
    /// </summary>
    public string SimpleFinAccessToken { get; set; } = string.Empty;

    /// <summary>
    /// API key for LunchFlow service integration.
    /// </summary>
    public string LunchFlowApiKey { get; set; } = string.Empty;

    /// <summary>
    /// The last date and time the user's data was synchronized.
    /// </summary>
    public DateTime LastSync { get; set; } = DateTime.MinValue;

    /// <summary>
    /// The last date and time (UTC) the user was active in the app.
    /// </summary>
    public DateTime LastActive { get; set; } = DateTime.MinValue;

    /// <summary>
    /// Transactions synced after this date and time (UTC) are shown as new.
    /// Set to the end of the user's previous visit when a new visit starts.
    /// </summary>
    public DateTime NewTransactionsSince { get; set; } = DateTime.MinValue;

    /// <summary>
    /// Collection of financial accounts owned by the user.
    /// </summary>
    public ICollection<Account> Accounts { get; set; } = [];

    /// <summary>
    /// Collection of budgets created by the user.
    /// </summary>
    public ICollection<Budget> Budgets { get; set; } = [];

    /// <summary>
    /// Collection of financial goals set by the user.
    /// </summary>
    public ICollection<Goal> Goals { get; set; } = [];

    /// <summary>
    /// Collection of bills entered by the user.
    /// </summary>
    public ICollection<Bill> Bills { get; set; } = [];

    /// <summary>
    /// Collection of transaction categories defined by the user.
    /// </summary>
    public ICollection<Category> TransactionCategories { get; set; } = [];

    /// <summary>
    /// Collection of emojis the user has assigned to transaction categories.
    /// </summary>
    public ICollection<CategoryIcon> TransactionCategoryIcons { get; set; } = [];

    public ICollection<Tag> Tags { get; set; } = [];

    /// <summary>
    /// Collection of account types defined by the user.
    /// </summary>
    public ICollection<AccountType> AccountTypes { get; set; } = [];

    /// <summary>
    /// Collection of asset types defined by the user.
    /// </summary>
    public ICollection<AssetType> AssetTypes { get; set; } = [];

    /// <summary>
    /// Collection of financial institutions associated with the user.
    /// </summary>
    public ICollection<Institution> Institutions { get; set; } = [];

    /// <summary>
    /// User-specific settings and preferences.
    /// </summary>
    public UserSettings? UserSettings { get; set; } = null;

    /// <summary>
    /// Collection of automatic rules for transaction processing.
    /// </summary>
    public ICollection<AutomaticRule> AutomaticRules { get; set; } = [];

    /// <summary>
    /// Collection of recurring rules for transaction processing.
    /// </summary>
    public ICollection<RecurringRule> RecurringRules { get; set; } = [];

    /// <summary>
    /// Collection of financial assets owned by the user.
    /// </summary>
    public ICollection<Asset> Assets { get; set; } = [];

    /// <summary>
    /// Collection of widget settings for the user's dashboard.
    /// </summary>
    public ICollection<WidgetSettings> WidgetSettings { get; set; } = [];

    /// <summary>
    /// Collection of SimpleFin organizations associated with the user.
    /// </summary>
    public ICollection<SimpleFinOrganization> SimpleFinOrganizations { get; set; } = [];

    /// <summary>
    /// Collection of SimpleFin accounts linked to the user.
    /// </summary>
    public ICollection<SimpleFinAccount> SimpleFinAccounts { get; set; } = [];

    /// <summary>
    /// Collection of LunchFlow accounts linked to the user.
    /// </summary>
    public ICollection<LunchFlowAccount> LunchFlowAccounts { get; set; } = [];
}
