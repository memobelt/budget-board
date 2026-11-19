import React from "react";
import { useLocale } from "~/providers/LocaleProvider/LocaleProvider";

/**
 * Whether clicking months in the month cards adds to the selection, with a
 * toggle that, when turning it off, keeps just the most recent selected month
 * (or this month when none is selected).
 */
export const useSelectMultipleMonths = (
  selectedMonths: Date[],
  setSelectedMonths: React.Dispatch<React.SetStateAction<Date[]>>,
  initiallyOn = false,
) => {
  const { dayjs } = useLocale();
  const [isSelectMultiple, setIsSelectMultiple] = React.useState(initiallyOn);

  const toggleSelectMultiple = () => {
    if (isSelectMultiple) {
      setSelectedMonths(
        selectedMonths.length === 0
          ? [dayjs().startOf("month").toDate()]
          : [
              new Date(
                Math.max(...selectedMonths.map((month) => month.getTime())),
              ),
            ],
      );
    }
    setIsSelectMultiple((current) => !current);
  };

  const enableSelectMultiple = () => setIsSelectMultiple(true);

  return { isSelectMultiple, toggleSelectMultiple, enableSelectMultiple };
};
