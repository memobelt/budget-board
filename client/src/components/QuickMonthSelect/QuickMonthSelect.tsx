import { Select } from "@teelur/budget-board-ui";
import React from "react";
import { useTranslation } from "react-i18next";
import { useLocale } from "~/providers/LocaleProvider/LocaleProvider";

type QuickMonthOption = "multiple" | "3" | "6" | "12" | "ytd" | "all";

interface QuickMonthSelectProps {
  selectedMonths: Date[];
  setSelectedMonths: React.Dispatch<React.SetStateAction<Date[]>>;
  /** Whether clicking months in the month cards adds to the selection. */
  isSelectMultiple: boolean;
  toggleSelectMultiple: () => void;
  /** Called after a range is picked, e.g. to turn on selecting multiple months. */
  onSelectRange?: () => void;
}

/**
 * One dropdown for quickly choosing months: turn on selecting multiple months, pick a recent
 * range or the year so far, or show all months (an empty selection).
 */
const QuickMonthSelect = (props: QuickMonthSelectProps): React.ReactNode => {
  const { t } = useTranslation();
  const { dayjs } = useLocale();

  const getLastNMonths = React.useCallback(
    (count: number): Date[] =>
      Array.from({ length: count }, (_, index) =>
        dayjs().subtract(index, "month").startOf("month").toDate(),
      ),
    [dayjs],
  );

  const getYearToDate = React.useCallback(
    (): Date[] => getLastNMonths(dayjs().month() + 1),
    [dayjs, getLastNMonths],
  );

  // Shows which option the current selection matches, if any.
  const value = React.useMemo((): QuickMonthOption | null => {
    if (props.selectedMonths.length === 0) {
      return "all";
    }

    const selected = new Set(
      props.selectedMonths.map((month) => dayjs(month).format("YYYY-MM")),
    );
    const matches = (months: Date[]) =>
      months.length === selected.size &&
      months.every((month) => selected.has(dayjs(month).format("YYYY-MM")));

    for (const count of [3, 6, 12]) {
      if (matches(getLastNMonths(count))) {
        return count.toString() as QuickMonthOption;
      }
    }
    if (props.selectedMonths.length > 1 && matches(getYearToDate())) {
      return "ytd";
    }

    return props.isSelectMultiple ? "multiple" : null;
  }, [
    props.selectedMonths,
    props.isSelectMultiple,
    dayjs,
    getLastNMonths,
    getYearToDate,
  ]);

  const handleChange = (option: string | null) => {
    switch (option) {
      case "multiple":
        if (!props.isSelectMultiple) {
          props.toggleSelectMultiple();
        }
        return;
      case "3":
      case "6":
      case "12":
        props.setSelectedMonths(getLastNMonths(Number(option)));
        props.onSelectRange?.();
        return;
      case "ytd":
        props.setSelectedMonths(getYearToDate());
        props.onSelectRange?.();
        return;
      case "all":
        props.setSelectedMonths([]);
        props.onSelectRange?.();
        return;
      default:
        // Choosing the selected option again clears it: for "Select multiple"
        // that turns it off.
        if (props.isSelectMultiple) {
          props.toggleSelectMultiple();
        }
    }
  };

  return (
    <Select
      data={[
        { value: "multiple", label: t("select_multiple") },
        { value: "3", label: t("last_n_months", { count: 3 }) },
        { value: "6", label: t("last_n_months", { count: 6 }) },
        { value: "12", label: t("last_n_months", { count: 12 }) },
        { value: "ytd", label: t("year_to_date") },
        { value: "all", label: t("all") },
      ]}
      value={value}
      onChange={handleChange}
      placeholder={t("quick_select")}
      aria-label={t("quick_select")}
      size="xs"
      w={170}
    />
  );
};

export default QuickMonthSelect;
