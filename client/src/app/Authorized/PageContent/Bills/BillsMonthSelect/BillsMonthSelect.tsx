import { Group } from "@mantine/core";
import {
  ActionIcon,
  Button,
  MonthPickerInput,
  Tooltip,
} from "@teelur/budget-board-ui";
import type { Dayjs } from "dayjs";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import { useLocale } from "~/providers/LocaleProvider/LocaleProvider";

interface BillsMonthSelectProps {
  month: Dayjs;
  setMonth: (month: Dayjs) => void;
}

const BillsMonthSelect = (props: BillsMonthSelectProps): React.ReactNode => {
  const { t } = useTranslation();
  const { dayjs, dayjsLocale } = useLocale();

  const isCurrentMonth = props.month.isSame(dayjs(), "month");

  return (
    <Group gap="0.25rem" wrap="nowrap">
      <Tooltip label={t("previous_month")}>
        <ActionIcon
          variant="ghost"
          color="muted"
          size="compact-md"
          aria-label={t("previous_month")}
          onClick={() => props.setMonth(props.month.subtract(1, "month"))}
        >
          <ChevronLeftIcon size="1rem" />
        </ActionIcon>
      </Tooltip>
      <MonthPickerInput
        size="xs"
        w={130}
        value={props.month.format("YYYY-MM-DD")}
        onChange={(value) => {
          if (value) {
            props.setMonth(dayjs(value).startOf("month"));
          }
        }}
        locale={dayjsLocale}
        valueFormat="MMMM YYYY"
        aria-label={t("month")}
      />
      <Tooltip label={t("next_month")}>
        <ActionIcon
          variant="ghost"
          color="muted"
          size="compact-md"
          aria-label={t("next_month")}
          onClick={() => props.setMonth(props.month.add(1, "month"))}
        >
          <ChevronRightIcon size="1rem" />
        </ActionIcon>
      </Tooltip>
      {!isCurrentMonth && (
        <Button
          variant="ghost"
          color="primary"
          size="compact-sm"
          onClick={() => props.setMonth(dayjs().startOf("month"))}
        >
          {t("this_month")}
        </Button>
      )}
    </Group>
  );
};

export default BillsMonthSelect;
