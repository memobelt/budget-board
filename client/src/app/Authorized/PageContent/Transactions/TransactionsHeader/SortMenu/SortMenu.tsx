import classes from "./SortMenu.module.css";

import { Flex, Group } from "@mantine/core";
import { ActionIcon, BodyText, Select } from "@teelur/budget-board-ui";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";
import useIsMobile from "~/hooks/useIsMobile";
import SortButton, { SortDirection } from "~/components/SortButton";
import React from "react";
import { SortOption, Sorts } from "./SortMenuHelpers";
import { useTranslation } from "react-i18next";

interface SortMenuProps {
  currentSort: Sorts;
  setCurrentSort: (newCurrentSort: Sorts) => void;
  sortDirection: SortDirection;
  setSortDirection: (newSortDirection: SortDirection) => void;
}

const SortMenu = (props: SortMenuProps): React.ReactNode => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  const SortOptions: SortOption[] = [
    {
      value: Sorts.Date,
      label: t("date"),
    },
    {
      value: Sorts.Merchant,
      label: t("merchant_name"),
    },
    {
      value: Sorts.Category,
      label: t("category"),
    },
    {
      value: Sorts.Amount,
      label: t("amount"),
    },
  ];

  const ToggleSortDirection = (sortDirection: SortDirection): SortDirection => {
    switch (sortDirection) {
      case SortDirection.None:
        return SortDirection.Ascending;
      case SortDirection.Ascending:
        return SortDirection.Decending;
      case SortDirection.Decending:
        return SortDirection.Ascending;
    }
  };

  // On small screens the sort buttons don't fit, so pick the field from a
  // dropdown and flip the order with the arrow button.
  if (isMobile) {
    const isAscending = props.sortDirection === SortDirection.Ascending;
    return (
      <Group gap="0.5rem" wrap="nowrap">
        <BodyText tone="secondary" size="sm" fw={500}>
          {t("sort_by")}
        </BodyText>
        <Select
          data={SortOptions.map((sortOption) => ({
            value: sortOption.value.toString(),
            label: sortOption.label,
          }))}
          value={props.currentSort.toString()}
          onChange={(value) => {
            if (value === null) {
              return;
            }
            // A new sort field always starts descending, like the buttons.
            props.setCurrentSort(Number(value) as Sorts);
            props.setSortDirection(SortDirection.Decending);
          }}
          allowDeselect={false}
          aria-label={t("sort_by")}
          size="xs"
          w={150}
        />
        <ActionIcon
          variant="filled"
          color="muted"
          size="compact-sm"
          aria-label={t(isAscending ? "sort_ascending" : "sort_descending")}
          title={t(isAscending ? "sort_ascending" : "sort_descending")}
          onClick={() =>
            props.setSortDirection(
              isAscending ? SortDirection.Decending : SortDirection.Ascending,
            )
          }
        >
          {isAscending ? (
            <ArrowUpIcon size="1rem" />
          ) : (
            <ArrowDownIcon size="1rem" />
          )}
        </ActionIcon>
      </Group>
    );
  }

  return (
    <Flex
      className={classes.container}
      gap="0.5rem"
      direction={{ base: "column", sm: "row" }}
      align={{ base: "start", sm: "center" }}
    >
      <BodyText tone="secondary" size="sm" fw={500}>
        {t("sort_by")}
      </BodyText>
      <Group gap="0.5rem">
        {SortOptions.map((sortOption: SortOption) => (
          <SortButton
            variant="filled"
            color="muted"
            size="compact-sm"
            key={sortOption.value}
            label={sortOption.label}
            sortDirection={
              sortOption.value === props.currentSort
                ? props.sortDirection
                : SortDirection.None
            }
            onClick={() => {
              if (sortOption.value !== props.currentSort) {
                // When selecting a new sort option, should always go to decending.
                props.setSortDirection(SortDirection.Decending);
              } else {
                props.setSortDirection(
                  ToggleSortDirection(props.sortDirection),
                );
              }
              props.setCurrentSort(sortOption.value);
            }}
          />
        ))}
      </Group>
    </Flex>
  );
};

export default SortMenu;
