using BudgetBoard.Database.Models;
using BudgetBoard.Service.Helpers;
using FluentAssertions;

namespace BudgetBoard.IntegrationTests;

public class ManualTransactionMatcherTests
{
    private static readonly Guid AccountId = Guid.NewGuid();

    private static Transaction Manual(decimal amount, DateOnly date, string? syncId = null) =>
        new()
        {
            Amount = amount,
            Date = date,
            Source = TransactionSource.Manual,
            AccountID = AccountId,
            SyncID = syncId,
        };

    [Fact]
    public void FindMatch_WhenSameAmountWithinWindow_ShouldReturnManualTransaction()
    {
        var manual = Manual(-50m, new DateOnly(2026, 10, 20));

        var match = ManualTransactionMatcher.FindMatch(
            [manual],
            -50m,
            new DateOnly(2026, 10, 22)
        );

        match.Should().BeSameAs(manual);
    }

    [Fact]
    public void FindMatch_WhenSyncIdIsEmptyString_ShouldStillMatch()
    {
        // File imports store an empty SyncID rather than null.
        var imported = Manual(-50m, new DateOnly(2026, 10, 20), string.Empty);

        ManualTransactionMatcher
            .FindMatch([imported], -50m, new DateOnly(2026, 10, 20))
            .Should()
            .BeSameAs(imported);
    }

    [Fact]
    public void FindMatch_WhenAmountDiffers_ShouldReturnNull()
    {
        var manual = Manual(-50m, new DateOnly(2026, 10, 20));

        ManualTransactionMatcher
            .FindMatch([manual], -50.01m, new DateOnly(2026, 10, 20))
            .Should()
            .BeNull();
    }

    [Fact]
    public void FindMatch_WhenOutsideWindow_ShouldReturnNull()
    {
        var manual = Manual(-50m, new DateOnly(2026, 10, 1));

        ManualTransactionMatcher
            .FindMatch([manual], -50m, new DateOnly(2026, 10, 1).AddDays(ManualTransactionMatcher.MatchWindowDays + 1))
            .Should()
            .BeNull();
    }

    [Fact]
    public void FindMatch_WhenAlreadyLinkedDeletedOrSynced_ShouldReturnNull()
    {
        var date = new DateOnly(2026, 10, 20);
        var linked = Manual(-50m, date, "bank-1");
        var deleted = Manual(-50m, date);
        deleted.Deleted = DateTime.UtcNow;
        var synced = Manual(-50m, date);
        synced.Source = TransactionSource.SimpleFIN;

        ManualTransactionMatcher
            .FindMatch([linked, deleted, synced], -50m, date)
            .Should()
            .BeNull();
    }

    [Fact]
    public void FindMatch_WhenSeveralQualify_ShouldPickClosestDate()
    {
        var far = Manual(-50m, new DateOnly(2026, 10, 15));
        var near = Manual(-50m, new DateOnly(2026, 10, 19));

        ManualTransactionMatcher
            .FindMatch([far, near], -50m, new DateOnly(2026, 10, 20))
            .Should()
            .BeSameAs(near);
    }

    [Fact]
    public void Link_ShouldSetSyncIdAndSourceAndKeepUserFields()
    {
        var manual = Manual(-50m, new DateOnly(2026, 10, 20));
        manual.MerchantName = "Corner Cafe";
        manual.Category = "coffee";
        manual.Notes = "with Sam";

        ManualTransactionMatcher.Link(manual, "bank-1", TransactionSource.SimpleFIN, "SQ *CORNER CAFE 1234");

        manual.SyncID.Should().Be("bank-1");
        manual.Source.Should().Be(TransactionSource.SimpleFIN);
        manual.MerchantName.Should().Be("Corner Cafe");
        manual.Category.Should().Be("coffee");
        manual.Notes.Should().Be("with Sam");
        manual.Date.Should().Be(new DateOnly(2026, 10, 20));
    }

    [Fact]
    public void Link_WhenMerchantBlank_ShouldUseBankDescription()
    {
        var manual = Manual(-50m, new DateOnly(2026, 10, 20));

        ManualTransactionMatcher.Link(manual, "bank-1", TransactionSource.SimpleFIN, "Coffee Shop");

        manual.MerchantName.Should().Be("Coffee Shop");
    }
}
