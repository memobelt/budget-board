using Bogus;
using BudgetBoard.Database.Models;
using BudgetBoard.Service;
using BudgetBoard.Service.Helpers;
using BudgetBoard.Service.Interfaces;
using BudgetBoard.Service.Models;
using BudgetBoard.Service.Resources;
using FluentAssertions;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
using Moq;

namespace BudgetBoard.IntegrationTests;

[Collection("IntegrationTests")]
public class ApplicationUserServiceTests
{
    #region ReadApplicationUserAsync
    [Fact]
    public async Task ReadApplicationUserAsync_WhenUserExists_ReturnsUser()
    {
        // Arrange
        var helper = new TestHelper();
        var applicationUserService = new ApplicationUserService(
            Mock.Of<ILogger<IApplicationUserService>>(),
            helper.UserDataContext,
            TestHelper.CreateMockLocalizer<ResponseStrings>(),
            TestHelper.CreateMockLocalizer<LogStrings>()
        );

        var mockUserManager = MockUserManager(helper.demoUser);

        // Act
        var result = await applicationUserService.ReadApplicationUserAsync(
            helper.demoUser.Id,
            mockUserManager.Object
        );

        // Assert
        result.Should().BeEquivalentTo(new ApplicationUserResponse(helper.demoUser, false, false));
    }

    [Fact]
    public async Task ReadApplicationUserAsync_WhenUserHasOidcLogin_ReturnsUserWithOidcLogin()
    {
        // Arrange
        var helper = new TestHelper();
        var applicationUserService = new ApplicationUserService(
            Mock.Of<ILogger<IApplicationUserService>>(),
            helper.UserDataContext,
            TestHelper.CreateMockLocalizer<ResponseStrings>(),
            TestHelper.CreateMockLocalizer<LogStrings>()
        );

        var mockUserManager = MockUserManager(helper.demoUser);
        mockUserManager
            .Setup(um => um.GetLoginsAsync(helper.demoUser))
            .ReturnsAsync(
                new List<UserLoginInfo> { new UserLoginInfo("oidc", "oidcUserId", "oidc") }
            );

        // Act
        var result = await applicationUserService.ReadApplicationUserAsync(
            helper.demoUser.Id,
            mockUserManager.Object
        );

        // Assert
        result.HasOidcLogin.Should().BeTrue();
        result.HasLocalLogin.Should().BeFalse();
    }

    [Fact]
    public async Task ReadApplicationUserAsync_WhenUserHasLocalLogin_ReturnsUserWithLocalLogin()
    {
        // Arrange
        var helper = new TestHelper();
        var applicationUserService = new ApplicationUserService(
            Mock.Of<ILogger<IApplicationUserService>>(),
            helper.UserDataContext,
            TestHelper.CreateMockLocalizer<ResponseStrings>(),
            TestHelper.CreateMockLocalizer<LogStrings>()
        );

        var mockUserManager = MockUserManager(helper.demoUser);
        mockUserManager
            .Setup(um => um.GetLoginsAsync(helper.demoUser))
            .ReturnsAsync([new("local", "localUserId", "local")]);

        // Act
        var result = await applicationUserService.ReadApplicationUserAsync(
            helper.demoUser.Id,
            mockUserManager.Object
        );

        // Assert
        result.HasOidcLogin.Should().BeFalse();
        result.HasLocalLogin.Should().BeTrue();
    }

    [Fact]
    public async Task ReadApplicationUserAsync_WhenUserDoesNotExist_ThrowsInvalidUserError()
    {
        // Arrange
        var helper = new TestHelper();
        var applicationUserService = new ApplicationUserService(
            Mock.Of<ILogger<IApplicationUserService>>(),
            helper.UserDataContext,
            TestHelper.CreateMockLocalizer<ResponseStrings>(),
            TestHelper.CreateMockLocalizer<LogStrings>()
        );

        var mockUserManager = MockUserManager(helper.demoUser);

        // Act
        Func<Task> act = async () =>
            await applicationUserService.ReadApplicationUserAsync(
                Guid.NewGuid(),
                mockUserManager.Object
            );

        // Assert
        await act.Should()
            .ThrowAsync<BudgetBoardServiceException>()
            .WithMessage("InvalidUserError");
    }
    #endregion

    #region UpdateApplicationUserAsync
    [Fact]
    public async Task UpdateApplicationUserAsync_WhenUserExists_UpdatesUser()
    {
        // Arrange
        var helper = new TestHelper();
        var applicationUserService = new ApplicationUserService(
            Mock.Of<ILogger<IApplicationUserService>>(),
            helper.UserDataContext,
            TestHelper.CreateMockLocalizer<ResponseStrings>(),
            TestHelper.CreateMockLocalizer<LogStrings>()
        );

        var userUpdateRequest = new ApplicationUserUpdateRequest
        {
            LastSync = new Faker().Date.Past().ToUniversalTime(),
        };

        // Act
        await applicationUserService.UpdateApplicationUserAsync(
            helper.demoUser.Id,
            userUpdateRequest
        );

        // Assert
        helper.UserDataContext.Users.Single().Should().BeEquivalentTo(userUpdateRequest);
    }
    #endregion

    #region ConnectOidcLoginAsync
    [Fact]
    public async Task ConnectOidcLoginAsync_WhenNoOidcLoginExists_AddsOidcLogin()
    {
        // Arrange
        var helper = new TestHelper();
        var applicationUserService = new ApplicationUserService(
            Mock.Of<ILogger<IApplicationUserService>>(),
            helper.UserDataContext,
            TestHelper.CreateMockLocalizer<ResponseStrings>(),
            TestHelper.CreateMockLocalizer<LogStrings>()
        );

        var mockUserManager = MockUserManager(
            helper.demoUser,
            [new("local", "localUserId", "local")]
        );

        var providerKey = "oidc-provider-user-123";

        // Act
        await applicationUserService.ConnectOidcLoginAsync(
            helper.demoUser.Id,
            providerKey,
            mockUserManager.Object
        );

        // Assert
        mockUserManager.Verify(
            um =>
                um.AddLoginAsync(
                    helper.demoUser,
                    It.Is<UserLoginInfo>(l =>
                        l.LoginProvider == ApplicationUserService.OidcLoginProvider
                        && l.ProviderKey == providerKey
                        && l.ProviderDisplayName == ApplicationUserService.OidcLoginProvider
                    )
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task ConnectOidcLoginAsync_WhenOidcLoginExists_ThrowsOidcLoginAlreadyExistsError()
    {
        // Arrange
        var helper = new TestHelper();
        var applicationUserService = new ApplicationUserService(
            Mock.Of<ILogger<IApplicationUserService>>(),
            helper.UserDataContext,
            TestHelper.CreateMockLocalizer<ResponseStrings>(),
            TestHelper.CreateMockLocalizer<LogStrings>()
        );

        var mockUserManager = MockUserManager(
            helper.demoUser,
            [new("oidc", helper.demoUser.Id.ToString(), "oidc")]
        );

        // Act
        Func<Task> act = async () =>
            await applicationUserService.ConnectOidcLoginAsync(
                helper.demoUser.Id,
                "oidc-provider-user-123",
                mockUserManager.Object
            );

        // Assert
        await act.Should()
            .ThrowAsync<BudgetBoardServiceException>()
            .WithMessage("OidcLoginAlreadyExistsError");
    }

    [Fact]
    public async Task ConnectOidcLoginAsync_WhenAddLoginFails_ThrowsAddOidcFailedError()
    {
        // Arrange
        var helper = new TestHelper();
        var applicationUserService = new ApplicationUserService(
            Mock.Of<ILogger<IApplicationUserService>>(),
            helper.UserDataContext,
            TestHelper.CreateMockLocalizer<ResponseStrings>(),
            TestHelper.CreateMockLocalizer<LogStrings>()
        );

        var mockUserManager = MockUserManager(
            helper.demoUser,
            [new("local", "localUserId", "local")],
            addLoginResult: IdentityResult.Failed(
                new IdentityError { Description = "Add login failed" }
            )
        );

        // Act
        Func<Task> act = async () =>
            await applicationUserService.ConnectOidcLoginAsync(
                helper.demoUser.Id,
                "oidc-provider-user-123",
                mockUserManager.Object
            );

        // Assert
        await act.Should()
            .ThrowAsync<BudgetBoardServiceException>()
            .WithMessage("AddOidcFailedError");
    }

    [Fact]
    public async Task ConnectOidcLoginAsync_WhenProviderKeyIsMissing_ThrowsAddOidcFailedError()
    {
        // Arrange
        var helper = new TestHelper();
        var applicationUserService = new ApplicationUserService(
            Mock.Of<ILogger<IApplicationUserService>>(),
            helper.UserDataContext,
            TestHelper.CreateMockLocalizer<ResponseStrings>(),
            TestHelper.CreateMockLocalizer<LogStrings>()
        );

        var mockUserManager = MockUserManager(
            helper.demoUser,
            [new("local", "localUserId", "local")]
        );

        // Act
        Func<Task> act = async () =>
            await applicationUserService.ConnectOidcLoginAsync(
                helper.demoUser.Id,
                null!,
                mockUserManager.Object
            );

        // Assert
        await act.Should()
            .ThrowAsync<BudgetBoardServiceException>()
            .WithMessage("AddOidcFailedError");
    }
    #endregion

    #region DisconnectOidcLoginAsync
    [Fact]
    public async Task DisconnectOidcLoginAsync_WhenOidcLoginExists_RemovesOidcLogin()
    {
        // Arrange
        var helper = new TestHelper();
        var applicationUserService = new ApplicationUserService(
            Mock.Of<ILogger<IApplicationUserService>>(),
            helper.UserDataContext,
            TestHelper.CreateMockLocalizer<ResponseStrings>(),
            TestHelper.CreateMockLocalizer<LogStrings>()
        );

        var mockUserManager = MockUserManager(
            helper.demoUser,
            [
                new UserLoginInfo("oidc", "oidcUserId", "oidc"),
                new UserLoginInfo("local", "localUserId", "local"),
            ],
            hasPassword: true
        );

        // Act
        await applicationUserService.DisconnectOidcLoginAsync(
            helper.demoUser.Id,
            mockUserManager.Object
        );

        // Assert
        mockUserManager.Verify(
            um => um.RemoveLoginAsync(helper.demoUser, "oidc", "oidcUserId"),
            Times.Once
        );
    }

    [Fact]
    public async Task DisconnectOidcLoginAsync_WhenNoOidcLogin_ThrowsNoOidcLoginFoundError()
    {
        // Arrange
        var helper = new TestHelper();
        var applicationUserService = new ApplicationUserService(
            Mock.Of<ILogger<IApplicationUserService>>(),
            helper.UserDataContext,
            TestHelper.CreateMockLocalizer<ResponseStrings>(),
            TestHelper.CreateMockLocalizer<LogStrings>()
        );

        var mockUserManager = MockUserManager(helper.demoUser);

        // Act
        Func<Task> act = async () =>
            await applicationUserService.DisconnectOidcLoginAsync(
                helper.demoUser.Id,
                mockUserManager.Object
            );

        // Assert
        await act.Should()
            .ThrowAsync<BudgetBoardServiceException>()
            .WithMessage("NoOidcLoginFoundError");
    }

    [Fact]
    public async Task DisconnectOidcLoginAsync_WhenOnlyOidcLoginAndNoPassword_ThrowsRemoveOidcNoPasswordError()
    {
        // Arrange
        var helper = new TestHelper();
        var applicationUserService = new ApplicationUserService(
            Mock.Of<ILogger<IApplicationUserService>>(),
            helper.UserDataContext,
            TestHelper.CreateMockLocalizer<ResponseStrings>(),
            TestHelper.CreateMockLocalizer<LogStrings>()
        );

        var mockUserManager = MockUserManager(
            helper.demoUser,
            [new UserLoginInfo("oidc", "oidcUserId", "oidc")],
            hasPassword: false
        );

        // Act
        Func<Task> act = async () =>
            await applicationUserService.DisconnectOidcLoginAsync(
                helper.demoUser.Id,
                mockUserManager.Object
            );

        // Assert
        await act.Should()
            .ThrowAsync<BudgetBoardServiceException>()
            .WithMessage("RemoveOidcNoPasswordError");
    }

    [Fact]
    public async Task DisconnectOidcLoginAsync_WhenRemoveLoginFails_ThrowsRemoveOidcFailedError()
    {
        // Arrange
        var helper = new TestHelper();
        var applicationUserService = new ApplicationUserService(
            Mock.Of<ILogger<IApplicationUserService>>(),
            helper.UserDataContext,
            TestHelper.CreateMockLocalizer<ResponseStrings>(),
            TestHelper.CreateMockLocalizer<LogStrings>()
        );

        var mockUserManager = MockUserManager(
            helper.demoUser,
            [
                new UserLoginInfo("oidc", "oidcUserId", "oidc"),
                new UserLoginInfo("local", "localUserId", "local"),
            ],
            hasPassword: true,
            removeLoginResult: IdentityResult.Failed(
                new IdentityError { Description = "Remove login failed" }
            )
        );

        // Act
        Func<Task> act = async () =>
            await applicationUserService.DisconnectOidcLoginAsync(
                helper.demoUser.Id,
                mockUserManager.Object
            );

        // Assert
        await act.Should()
            .ThrowAsync<BudgetBoardServiceException>()
            .WithMessage("RemoveOidcFailedError");
    }
    #endregion

    #region RecordVisitAsync
    private static ApplicationUserService CreateServiceWithNow(TestHelper helper, DateTime now)
    {
        var nowProviderMock = new Mock<INowProvider>();
        nowProviderMock.Setup(n => n.UtcNow).Returns(now);

        return new ApplicationUserService(
            Mock.Of<ILogger<IApplicationUserService>>(),
            helper.UserDataContext,
            TestHelper.CreateMockLocalizer<ResponseStrings>(),
            TestHelper.CreateMockLocalizer<LogStrings>(),
            nowProviderMock.Object
        );
    }

    [Fact]
    public async Task RecordVisitAsync_WhenFirstVisit_NothingIsNew()
    {
        // Arrange
        var helper = new TestHelper();
        var now = new DateTime(2026, 10, 23, 15, 0, 0, DateTimeKind.Utc);
        var service = CreateServiceWithNow(helper, now);

        // Act
        var result = await service.RecordVisitAsync(helper.demoUser.Id);

        // Assert
        result.NewTransactionsSince.Should().Be(now);
        helper.demoUser.LastActive.Should().Be(now);
    }

    [Fact]
    public async Task RecordVisitAsync_WhenReturningAfterIdleTimeout_StartsNewVisit()
    {
        // Arrange
        var helper = new TestHelper();
        var lastActive = new DateTime(2026, 10, 22, 21, 0, 0, DateTimeKind.Utc);
        var now = lastActive.AddHours(10);
        helper.demoUser.LastActive = lastActive;
        helper.demoUser.NewTransactionsSince = lastActive.AddDays(-3);
        helper.UserDataContext.SaveChanges();
        var service = CreateServiceWithNow(helper, now);

        // Act
        var result = await service.RecordVisitAsync(helper.demoUser.Id);

        // Assert
        result.NewTransactionsSince.Should().Be(lastActive);
        helper.demoUser.LastActive.Should().Be(now);
    }

    [Fact]
    public async Task RecordVisitAsync_WhenStillActive_KeepsCurrentVisit()
    {
        // Arrange
        var helper = new TestHelper();
        var newSince = new DateTime(2026, 10, 20, 9, 0, 0, DateTimeKind.Utc);
        var lastActive = new DateTime(2026, 10, 23, 15, 0, 0, DateTimeKind.Utc);
        var now = lastActive.AddMinutes(10);
        helper.demoUser.LastActive = lastActive;
        helper.demoUser.NewTransactionsSince = newSince;
        helper.UserDataContext.SaveChanges();
        var service = CreateServiceWithNow(helper, now);

        // Act
        var result = await service.RecordVisitAsync(helper.demoUser.Id);

        // Assert
        result.NewTransactionsSince.Should().Be(newSince);
        helper.demoUser.LastActive.Should().Be(now);
    }

    [Fact]
    public async Task MarkTransactionsSeenAsync_ClearsNewTransactions()
    {
        // Arrange
        var helper = new TestHelper();
        var now = new DateTime(2026, 10, 23, 15, 0, 0, DateTimeKind.Utc);
        helper.demoUser.LastActive = now.AddMinutes(-5);
        helper.demoUser.NewTransactionsSince = now.AddDays(-2);
        helper.UserDataContext.SaveChanges();
        var service = CreateServiceWithNow(helper, now);

        // Act
        var result = await service.MarkTransactionsSeenAsync(helper.demoUser.Id);

        // Assert
        result.NewTransactionsSince.Should().Be(now);
        helper.demoUser.NewTransactionsSince.Should().Be(now);
    }
    #endregion

    private static Mock<UserManager<ApplicationUser>> MockUserManager(
        ApplicationUser user,
        IList<UserLoginInfo>? logins = null,
        bool hasPassword = true,
        IdentityResult? addLoginResult = null,
        IdentityResult? removeLoginResult = null
    )
    {
        var store = new Mock<IUserStore<ApplicationUser>>();
        var mockUserManager = new Mock<UserManager<ApplicationUser>>(
            store.Object,
            null!,
            null!,
            null!,
            null!,
            null!,
            null!,
            null!,
            null!
        );

        mockUserManager.Setup(um => um.GetLoginsAsync(user)).ReturnsAsync(logins ?? []);
        mockUserManager.Setup(um => um.HasPasswordAsync(user)).ReturnsAsync(hasPassword);
        mockUserManager
            .Setup(um => um.AddLoginAsync(user, It.IsAny<UserLoginInfo>()))
            .ReturnsAsync(addLoginResult ?? IdentityResult.Success);
        mockUserManager
            .Setup(um => um.RemoveLoginAsync(user, It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(removeLoginResult ?? IdentityResult.Success);

        return mockUserManager;
    }
}
