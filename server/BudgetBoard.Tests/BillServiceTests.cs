using BudgetBoard.Database.Models;
using BudgetBoard.IntegrationTests.Fakers;
using BudgetBoard.Service;
using BudgetBoard.Service.Interfaces;
using BudgetBoard.Service.Models;
using BudgetBoard.Service.Resources;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;

namespace BudgetBoard.IntegrationTests;

[Collection("IntegrationTests")]
public class BillServiceTests
{
    private static BillService CreateService(TestHelper helper) =>
        new(
            Mock.Of<ILogger<IBillService>>(),
            helper.UserDataContext,
            TestHelper.CreateMockLocalizer<ResponseStrings>(),
            TestHelper.CreateMockLocalizer<LogStrings>()
        );

    private static Account AddAccount(TestHelper helper)
    {
        var account = new AccountFaker(helper.demoUser.Id).Generate();
        helper.UserDataContext.Accounts.Add(account);
        helper.UserDataContext.SaveChanges();
        return account;
    }

    private static Bill AddBill(TestHelper helper, string name = "Card", int dueDay = 15)
    {
        var bill = new Bill
        {
            Name = name,
            Amount = 100,
            DueDay = dueDay,
            UserID = helper.demoUser.Id,
        };
        helper.UserDataContext.Bills.Add(bill);
        helper.UserDataContext.SaveChanges();
        return bill;
    }

    [Fact]
    public async Task CreateBillAsync_WithValidRequest_ShouldCreateBill()
    {
        var helper = new TestHelper();
        var service = CreateService(helper);
        var account = AddAccount(helper);

        await service.CreateBillAsync(
            helper.demoUser.Id,
            new BillCreateRequest
            {
                Name = "  Visa  ",
                Amount = 0,
                DueDay = 25,
                UseAccountBalance = true,
                AccountID = account.ID,
            }
        );

        var bill = helper.UserDataContext.Bills.Single();
        bill.Name.Should().Be("Visa");
        bill.DueDay.Should().Be(25);
        bill.UseAccountBalance.Should().BeTrue();
        bill.AccountID.Should().Be(account.ID);
        bill.UserID.Should().Be(helper.demoUser.Id);
        bill.LastPaidDueDate.Should().BeNull();
    }

    [Theory]
    [InlineData(0)]
    [InlineData(32)]
    public async Task CreateBillAsync_WithInvalidDueDay_ShouldThrow(int dueDay)
    {
        var helper = new TestHelper();
        var service = CreateService(helper);

        var act = async () =>
            await service.CreateBillAsync(
                helper.demoUser.Id,
                new BillCreateRequest { Name = "Rent", DueDay = dueDay }
            );

        await act.Should()
            .ThrowAsync<BudgetBoardServiceException>()
            .WithMessage("BillInvalidDueDayError");
    }

    [Fact]
    public async Task CreateBillAsync_WithEmptyName_ShouldThrow()
    {
        var helper = new TestHelper();
        var service = CreateService(helper);

        var act = async () =>
            await service.CreateBillAsync(
                helper.demoUser.Id,
                new BillCreateRequest { Name = "   ", DueDay = 1 }
            );

        await act.Should()
            .ThrowAsync<BudgetBoardServiceException>()
            .WithMessage("BillInvalidNameError");
    }

    [Fact]
    public async Task CreateBillAsync_WithNegativeAmount_ShouldThrow()
    {
        var helper = new TestHelper();
        var service = CreateService(helper);

        var act = async () =>
            await service.CreateBillAsync(
                helper.demoUser.Id,
                new BillCreateRequest
                {
                    Name = "Rent",
                    DueDay = 1,
                    Amount = -5,
                }
            );

        await act.Should()
            .ThrowAsync<BudgetBoardServiceException>()
            .WithMessage("BillNegativeAmountError");
    }

    [Fact]
    public async Task CreateBillAsync_UseAccountBalanceWithoutAccount_ShouldThrow()
    {
        var helper = new TestHelper();
        var service = CreateService(helper);

        var act = async () =>
            await service.CreateBillAsync(
                helper.demoUser.Id,
                new BillCreateRequest
                {
                    Name = "Visa",
                    DueDay = 1,
                    UseAccountBalance = true,
                }
            );

        await act.Should()
            .ThrowAsync<BudgetBoardServiceException>()
            .WithMessage("BillUseBalanceWithoutAccountError");
    }

    [Fact]
    public async Task CreateBillAsync_WithUnknownAccount_ShouldThrow()
    {
        var helper = new TestHelper();
        var service = CreateService(helper);

        var act = async () =>
            await service.CreateBillAsync(
                helper.demoUser.Id,
                new BillCreateRequest
                {
                    Name = "Visa",
                    DueDay = 1,
                    AccountID = Guid.NewGuid(),
                }
            );

        await act.Should()
            .ThrowAsync<BudgetBoardServiceException>()
            .WithMessage("BillInvalidAccountError");
    }

    [Fact]
    public async Task ReadBillsAsync_ShouldReturnBillsOrderedByDueDay()
    {
        var helper = new TestHelper();
        var service = CreateService(helper);
        AddBill(helper, "Late", 28);
        AddBill(helper, "Early", 3);

        var bills = await service.ReadBillsAsync(helper.demoUser.Id);

        bills.Select(b => b.Name).Should().Equal("Early", "Late");
    }

    [Fact]
    public async Task UpdateBillAsync_ShouldUpdateAllFields()
    {
        var helper = new TestHelper();
        var service = CreateService(helper);
        var account = AddAccount(helper);
        var bill = AddBill(helper);
        var paidDate = new DateOnly(2026, 10, 15);

        await service.UpdateBillAsync(
            helper.demoUser.Id,
            new BillUpdateRequest
            {
                ID = bill.ID,
                Name = "Amex",
                Amount = 250,
                DueDay = 31,
                UseAccountBalance = false,
                AccountID = account.ID,
                LastPaidDueDate = paidDate,
            }
        );

        var updated = helper.UserDataContext.Bills.Single();
        updated.Name.Should().Be("Amex");
        updated.Amount.Should().Be(250);
        updated.DueDay.Should().Be(31);
        updated.AccountID.Should().Be(account.ID);
        updated.LastPaidDueDate.Should().Be(paidDate);
    }

    [Fact]
    public async Task UpdateBillAsync_WhenBillDoesNotExist_ShouldThrow()
    {
        var helper = new TestHelper();
        var service = CreateService(helper);

        var act = async () =>
            await service.UpdateBillAsync(
                helper.demoUser.Id,
                new BillUpdateRequest
                {
                    ID = Guid.NewGuid(),
                    Name = "Amex",
                    DueDay = 1,
                }
            );

        await act.Should().ThrowAsync<BudgetBoardServiceException>().WithMessage("BillNotFoundError");
    }

    [Fact]
    public async Task DeleteBillAsync_ShouldRemoveBill()
    {
        var helper = new TestHelper();
        var service = CreateService(helper);
        var bill = AddBill(helper);

        await service.DeleteBillAsync(helper.demoUser.Id, bill.ID);

        helper.UserDataContext.Bills.Should().BeEmpty();
    }

    [Fact]
    public async Task CreateBillAsync_WithAccountLastFour_ShouldStoreDigits()
    {
        var helper = new TestHelper();
        var service = CreateService(helper);

        await service.CreateBillAsync(
            helper.demoUser.Id,
            new BillCreateRequest
            {
                Name = "Visa",
                DueDay = 1,
                AccountLastFour = " 1234 ",
            }
        );

        helper.UserDataContext.Bills.Single().AccountLastFour.Should().Be("1234");
    }

    [Fact]
    public async Task CreateBillAsync_WithBlankAccountLastFour_ShouldStoreNull()
    {
        var helper = new TestHelper();
        var service = CreateService(helper);

        await service.CreateBillAsync(
            helper.demoUser.Id,
            new BillCreateRequest
            {
                Name = "Visa",
                DueDay = 1,
                AccountLastFour = "  ",
            }
        );

        helper.UserDataContext.Bills.Single().AccountLastFour.Should().BeNull();
    }

    [Theory]
    [InlineData("123")]
    [InlineData("12345")]
    [InlineData("12a4")]
    public async Task CreateBillAsync_WithInvalidAccountLastFour_ShouldThrow(string lastFour)
    {
        var helper = new TestHelper();
        var service = CreateService(helper);

        var act = async () =>
            await service.CreateBillAsync(
                helper.demoUser.Id,
                new BillCreateRequest
                {
                    Name = "Visa",
                    DueDay = 1,
                    AccountLastFour = lastFour,
                }
            );

        await act.Should()
            .ThrowAsync<BudgetBoardServiceException>()
            .WithMessage("BillInvalidAccountLastFourError");
    }

    [Fact]
    public async Task UpdateBillAsync_WithNullAmount_ShouldClearAmountAndKeepBill()
    {
        var helper = new TestHelper();
        var service = CreateService(helper);
        var bill = AddBill(helper);

        await service.UpdateBillAsync(
            helper.demoUser.Id,
            new BillUpdateRequest
            {
                ID = bill.ID,
                Name = bill.Name,
                Amount = null,
                DueDay = bill.DueDay,
            }
        );

        var updated = helper.UserDataContext.Bills.Single();
        updated.Amount.Should().BeNull();
        updated.Name.Should().Be(bill.Name);
    }
}
