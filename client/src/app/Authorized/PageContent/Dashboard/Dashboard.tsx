import { Stack } from "@mantine/core";
import React from "react";
import DashboardHeader from "./DashboardHeader/DashboardHeader";
import DashboardMobileHeader from "./DashboardMobileHeader/DashboardMobileHeader";
import DashboardContent from "./DashboardContent/DashboardContent";
import useIsMobile from "~/hooks/useIsMobile";
import NewTransactionsNotice from "./NewTransactionsNotice/NewTransactionsNotice";
import { useWidgetSettingsQuery } from "~/hooks/queries/useWidgetSettingsQuery";

const Dashboard = (): React.ReactNode => {
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<"lg" | "sm">("lg");
  const isMobile = useIsMobile();
  const widgetSettingsQuery = useWidgetSettingsQuery();

  // The New Transactions widget shows the same list, so the notice is only
  // needed when that widget isn't on the dashboard.
  const hasNewTransactionsWidget = (widgetSettingsQuery.data ?? []).some(
    (widget) => widget.widgetType === "NewTransactions",
  );

  const effectiveEditTarget: "lg" | "sm" = isMobile ? "sm" : editTarget;

  return (
    <Stack w="100%" maw={1400} flex="1" align="center" justify="space-between">
      <Stack w="100%" gap="0.25rem" justify="center">
        {isMobile ? (
          <DashboardMobileHeader
            isEditMode={isEditMode}
            setIsEditMode={setIsEditMode}
          />
        ) : (
          <DashboardHeader
            isEditMode={isEditMode}
            setIsEditMode={setIsEditMode}
            editTarget={editTarget}
            setEditTarget={setEditTarget}
          />
        )}
        {!isEditMode &&
          !widgetSettingsQuery.isPending &&
          !hasNewTransactionsWidget && <NewTransactionsNotice />}
        <DashboardContent
          isEditMode={isEditMode}
          editTarget={effectiveEditTarget}
        />
      </Stack>
    </Stack>
  );
};

export default Dashboard;
