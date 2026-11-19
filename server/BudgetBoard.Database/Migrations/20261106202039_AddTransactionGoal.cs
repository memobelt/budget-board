using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BudgetBoard.Database.Migrations
{
    /// <inheritdoc />
    public partial class AddTransactionGoal : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "GoalID",
                table: "Transaction",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Transaction_GoalID",
                table: "Transaction",
                column: "GoalID");

            migrationBuilder.AddForeignKey(
                name: "FK_Transaction_Goal_GoalID",
                table: "Transaction",
                column: "GoalID",
                principalTable: "Goal",
                principalColumn: "ID",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Transaction_Goal_GoalID",
                table: "Transaction");

            migrationBuilder.DropIndex(
                name: "IX_Transaction_GoalID",
                table: "Transaction");

            migrationBuilder.DropColumn(
                name: "GoalID",
                table: "Transaction");
        }
    }
}
