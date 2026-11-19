import {
  CashFlowValue,
  EVERYTHING_ELSE_CATEGORY,
  IBudget,
} from "~/models/budget";
import {
  CategoryNode,
  ICategory,
  ICategoryNode,
  ITransactionCategory,
} from "~/models/category";
import { areStringsEqual } from "./utils";
import { transferTransactionCategory } from "~/models/transaction";
import {
  getFormattedCategoryValue,
  getIsParentCategory,
  getParentCategory,
  getSubCategories,
} from "./category";

/**
 * Determines the cash flow value for a given date based on a monthly totals map.
 *
 * The function retrieves the monthly total (if any) for the specified date from
 * the provided map, then decides whether the result is positive, negative, or
 * neutral, returning the corresponding CashFlowValue enum.
 *
 * @param {Map<number, number>} timeToMonthlyTotalsMap - Map of timestamp to monthly totals.
 * @param {Date} date - The date used to look up the monthly total.
 * @returns {CashFlowValue} Indicates if the cash flow is Positive, Negative, or Neutral.
 */
export const getCashFlowValue = (
  timeToMonthlyTotalsMap: Map<number, number>,
  date: Date,
): CashFlowValue => {
  const cashFlow = timeToMonthlyTotalsMap.get(date.getTime()) ?? 0;
  if (cashFlow > 0) {
    return CashFlowValue.Positive;
  } else if (cashFlow < 0) {
    return CashFlowValue.Negative;
  }
  return CashFlowValue.Neutral;
};

/**
 * Whether a category is Transfer or one of its subcategories. Transfers only move money between
 * accounts, so the budgets page leaves them out of income, expenses and Everything Else.
 */
export const isTransferCategory = (
  category: string | null | undefined,
  categories: ICategory[],
): boolean =>
  !!category &&
  (areStringsEqual(category, transferTransactionCategory) ||
    areStringsEqual(
      getParentCategory(category, categories),
      transferTransactionCategory,
    ));

/**
 * Whether a transaction or recurring forecast is filed under the Transfer group.
 */
export const isTransfer = (
  item: { category: string | null; subcategory: string | null },
  categories: ICategory[],
): boolean =>
  isTransferCategory(item.category, categories) ||
  isTransferCategory(item.subcategory, categories);

/**
 * Whether the budget is the reserved "Everything Else" budget rather than a category budget.
 */
export const isEverythingElseBudget = (budget: IBudget): boolean =>
  areStringsEqual(budget.category, EVERYTHING_ELSE_CATEGORY);

/**
 * Totals the subcategories of a category that have no budget, when at least one of its
 * subcategories does. Income counts only from budgeted sources, so this is taken off an income
 * category's total: with Paycheck budgeted, Interest Income under the same category isn't counted.
 * Returns 0 when no subcategory is budgeted, since the category's own budget then covers them all.
 *
 * @param categoryNode - The top-level category and its subcategories.
 * @param isBudgeted - Whether a category has a budget.
 * @param totals - Map from lowercase category to a total (transactions or forecast).
 */
export const getUnbudgetedSubcategoriesTotal = (
  categoryNode: ICategoryNode,
  isBudgeted: (category: string) => boolean,
  totals: Map<string, number>,
): number => {
  const subCategories = categoryNode.subCategories;
  if (!subCategories.some((subCategory) => isBudgeted(subCategory.value))) {
    return 0;
  }

  return subCategories
    .filter((subCategory) => !isBudgeted(subCategory.value))
    .reduce(
      (total, subCategory) =>
        total + (totals.get(subCategory.value.toLocaleLowerCase()) ?? 0),
      0,
    );
};

/**
 * A category whose spending falls, in whole or in part, into Everything Else.
 * When `isPartial`, the category has budgeted subcategories, and only its
 * unbudgeted subcategories (listed in `subCategories`) belong to Everything
 * Else; the rest stays with the category's own budget.
 */
export interface IEverythingElseGroup extends ICategoryNode {
  isPartial: boolean;
}

/**
 * Works out what falls into Everything Else among the expense categories: a
 * category with no budget at all goes in whole, and a category with budgeted
 * subcategories contributes only its unbudgeted ones. A category budgeted only
 * at the top level keeps all of its spending.
 */
export const buildEverythingElseGroups = (
  expenseCategories: ICategoryNode[],
  isBudgeted: (category: string) => boolean,
): IEverythingElseGroup[] =>
  expenseCategories.flatMap((category): IEverythingElseGroup[] => {
    const hasBudgetedSubcategory = category.subCategories.some((subCategory) =>
      isBudgeted(subCategory.value),
    );

    if (!isBudgeted(category.value) && !hasBudgetedSubcategory) {
      return [{ ...category, isPartial: false }];
    }

    if (!hasBudgetedSubcategory) {
      return [];
    }

    const unbudgetedSubcategories = category.subCategories.filter(
      (subCategory) => !isBudgeted(subCategory.value),
    );
    return unbudgetedSubcategories.length > 0
      ? [
          {
            ...category,
            subCategories: unbudgetedSubcategories,
            isPartial: true,
          },
        ]
      : [];
  });

/**
 * How much of a group falls into Everything Else, from a map of lowercase
 * category to total (transactions or forecast).
 */
export const getEverythingElseGroupTotal = (
  group: IEverythingElseGroup,
  totals: Map<string, number>,
): number =>
  group.isPartial
    ? group.subCategories.reduce(
        (total, subCategory) =>
          total + (totals.get(subCategory.value.toLocaleLowerCase()) ?? 0),
        0,
      )
    : (totals.get(group.value.toLocaleLowerCase()) ?? 0);

/**
 * Calculates the total limit from the provided budget data.
 *
 * @param {IBudget[]} budgetData - Array of budgets.
 * @returns {number} The sum of all budget limits.
 */
export const sumBudgetAmounts = (budgetData: IBudget[]): number => {
  return budgetData.reduce((n, { limit }) => n + limit, 0);
};

export enum StatusColorType {
  Expense,
  Income,
  Total,
  Target,
}

/**
 * Retrieves the total amount for the specified budget category by summing the category's own total
 * with any child categories' totals (if the category is a parent).
 *
 * @param {string} budgetCategory - The category name to retrieve total for.
 * @param {Map<string, number>} categoryToTransactionsTotalMap - A map from category name to transaction totals.
 * @param {ICategory[]} categories - An array of all categories for lookups.
 * @returns {number} The total amount for the given category (including child categories if applicable).
 */
export const getBudgetAmount = (
  budgetCategory: string,
  categoryToTransactionsTotalMap: Map<string, number>,
  categories: ICategory[],
): number => {
  if (getIsParentCategory(budgetCategory, categories)) {
    const children = getSubCategories(budgetCategory, categories);

    const childrenTotal = children.reduce(
      (acc, category) =>
        acc +
        (categoryToTransactionsTotalMap.get(
          category.value.toLocaleLowerCase(),
        ) ?? 0),
      0,
    );

    return (
      childrenTotal + (categoryToTransactionsTotalMap.get(budgetCategory) ?? 0)
    );
  }

  return categoryToTransactionsTotalMap.get(budgetCategory) ?? 0;
};

/**
 * Groups a list of budgets by their category (case-insensitive).
 *
 * The function first sorts the budgets alphabetically by category,
 * then reduces them into a Map keyed by the lowercase category name,
 * storing an array of budgets for each category.
 *
 * @param {IBudget[]} budgets - An array of budget objects.
 * @returns {Map<string, IBudget[]>} - A map from category to list of budgets.
 */
export const buildCategoryToBudgetsMap = (
  budgets: IBudget[],
): Map<string, IBudget[]> =>
  budgets
    .sort((a: IBudget, b: IBudget) => {
      if (a.category.toUpperCase() < b.category.toUpperCase()) {
        return -1;
      } else if (a.category.toUpperCase() > b.category.toUpperCase()) {
        return 1;
      }
      return 0;
    })
    .reduce(
      (budgetMap: any, item: IBudget) =>
        budgetMap.set(item.category.toLocaleLowerCase(), [
          ...(budgetMap.get(item.category.toLocaleLowerCase()) || []),
          item,
        ]),
      new Map(),
    );

/**
 * Builds a hierarchical tree structure of budget categories from the provided budgets and categories.
 *
 * Parent categories are added as root nodes, and subcategories are added as children under their
 * respective parents. Only categories that are not parent categories themselves are added as subcategories.
 *
 * @param budgets - An array of budget objects to be organized into the category tree.
 * @param categories - An array of all available categories used to determine parent-child relationships.
 * @returns An array of `ICategoryNode` objects representing the root nodes of the category tree, each with their subcategories populated.
 */
export const buildBudgetCategoryTree = (
  budgets: IBudget[],
  categories: ITransactionCategory[],
): ICategoryNode[] => {
  const categoryTree: ICategoryNode[] = [];

  budgets.forEach((budget) => {
    const parentCategory = getParentCategory(budget.category, categories);

    if (
      !categoryTree.some((category) =>
        areStringsEqual(category.value, parentCategory),
      )
    ) {
      categoryTree.push(
        new CategoryNode({
          value: getFormattedCategoryValue(parentCategory, categories),
          parent: "",
          categoryType:
            categories.find((c) => areStringsEqual(c.value, parentCategory))
              ?.categoryType ?? "expense",
        }),
      );
    }

    if (!getIsParentCategory(budget.category, categories)) {
      const parent = categoryTree.find((category) =>
        areStringsEqual(category.value, parentCategory),
      );

      if (parent) {
        parent.subCategories.push(
          new CategoryNode({
            value: getFormattedCategoryValue(budget.category, categories),
            parent: parentCategory,
            categoryType:
              categories.find((c) => areStringsEqual(c.value, budget.category))
                ?.categoryType ?? "expense",
          }),
        );
      }
    }
  });

  return categoryTree;
};

export const getTotalLimitForCategory = (
  budgets: IBudget[],
  category: ICategoryNode,
): number => {
  if (budgets.some((b) => areStringsEqual(b.category, category.value))) {
    return budgets.reduce((total, budget) => {
      if (areStringsEqual(budget.category, category.value)) {
        return total + budget.limit;
      }

      return total;
    }, 0);
  }

  return budgets.reduce((total, budget) => {
    if (
      category.subCategories.some((subCategory) =>
        areStringsEqual(subCategory.value, budget.category),
      )
    ) {
      return total + budget.limit;
    }

    return total;
  }, 0);
};

const buildCategoryToBudgetValueMap = (
  budgets: IBudget[],
  categories: ICategoryNode[],
  getValue: (budget: IBudget) => number,
): Map<string, number> => {
  const categoryToValuesMap = new Map<string, number>();

  budgets.forEach((budget) => {
    const value = getValue(budget);

    if (categoryToValuesMap.has(budget.category.toLocaleLowerCase())) {
      categoryToValuesMap.set(
        budget.category.toLocaleLowerCase(),
        categoryToValuesMap.get(budget.category.toLocaleLowerCase())! + value,
      );
    } else {
      categoryToValuesMap.set(budget.category.toLocaleLowerCase(), value);
    }

    // If the budget is for a subcategory, add the value to the parent category
    if (!categories.some((c) => areStringsEqual(c.value, budget.category))) {
      const parentCategory =
        categories
          .flatMap((c) => c.subCategories)
          .find((c) => areStringsEqual(c.value, budget.category))?.parent ?? "";

      // We only want to add the value to the parent category if it is not already in the budgets
      if (
        !parentCategory ||
        budgets.some((b) => areStringsEqual(b.category, parentCategory))
      ) {
        return;
      }

      if (categoryToValuesMap.has(parentCategory.toLocaleLowerCase())) {
        categoryToValuesMap.set(
          parentCategory.toLocaleLowerCase(),
          categoryToValuesMap.get(parentCategory.toLocaleLowerCase())! + value,
        );
      } else {
        categoryToValuesMap.set(parentCategory.toLocaleLowerCase(), value);
      }
    }
  });

  return categoryToValuesMap;
};

export const buildCategoryToLimitsMap = (
  budgets: IBudget[],
  categories: ICategoryNode[],
): Map<string, number> =>
  buildCategoryToBudgetValueMap(budgets, categories, (budget) => budget.limit);

/**
 * A budget's rollover is a running balance, so a later month's value already includes the
 * unspent amounts of earlier months. Across several selected months, only the balance entering
 * the earliest month counts; summing every month's rollover would count the same money twice.
 * Returns the IDs of the budgets whose rollover counts towards the selected range.
 */
export const getRangeRolloverBudgetIds = (budgets: IBudget[]): Set<string> => {
  const earliestBudgetByCategory = new Map<string, IBudget>();

  budgets.forEach((budget) => {
    const category = budget.category.toLocaleLowerCase();
    const earliest = earliestBudgetByCategory.get(category);
    // Months are ISO dates (YYYY-MM-DD), so they compare correctly as strings.
    if (!earliest || budget.month < earliest.month) {
      earliestBudgetByCategory.set(category, budget);
    }
  });

  return new Set(
    [...earliestBudgetByCategory.values()].map((budget) => budget.id),
  );
};

export const buildCategoryToRolloverMap = (
  budgets: IBudget[],
  categories: ICategoryNode[],
): Map<string, number> => {
  const rangeRolloverBudgetIds = getRangeRolloverBudgetIds(budgets);

  return buildCategoryToBudgetValueMap(budgets, categories, (budget) =>
    rangeRolloverBudgetIds.has(budget.id) ? budget.rollover : 0,
  );
};
