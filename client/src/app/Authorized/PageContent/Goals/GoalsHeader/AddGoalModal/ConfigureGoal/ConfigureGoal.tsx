import React from "react";
import { GoalType } from "~/models/goal";
import { Group, Stack } from "@mantine/core";
import { Button, TextInput } from "@teelur/budget-board-ui";
import { MoveLeftIcon, MoveRightIcon } from "lucide-react";
import AccountMultiSelect from "~/components/AccountMultiSelect/AccountMultiSelect";
import { useTranslation } from "react-i18next";
import { useField } from "@mantine/form";
import SaveGoalOptions from "./SaveGoalOptions/SaveGoalOptions";
import ManualGoalOptions from "./ManualGoalOptions/ManualGoalOptions";
import { useDidUpdate } from "@mantine/hooks";

export interface IGoalConfiguration {
  name: string;
  accounts: string[];
  targetAmount: number;
  applyAccountAmount: boolean;
  startingAmount: number;
}

interface ConfigureGoalProps {
  selectedGoalType: string | null;
  goalConfiguration: IGoalConfiguration;
  setGoalConfiguration: React.Dispatch<
    React.SetStateAction<IGoalConfiguration>
  >;
  goBackToPreviousDialog: () => void;
  launchNextDialog: () => void;
}

const ConfigureGoal = (props: ConfigureGoalProps): React.ReactNode => {
  const { t } = useTranslation();

  const goalNameField = useField<string>({
    initialValue: props.goalConfiguration.name,
  });
  const goalAccountsField = useField<string[]>({
    initialValue: props.goalConfiguration.accounts,
  });
  const goalTargetAmountField = useField<number>({
    initialValue: props.goalConfiguration.targetAmount,
  });
  const goalApplyAccountAmountField = useField<boolean>({
    initialValue: props.goalConfiguration.applyAccountAmount,
  });
  const goalStartingAmountField = useField<number>({
    initialValue: props.goalConfiguration.startingAmount,
  });

  const isManualGoal = props.selectedGoalType === GoalType.ManualGoal;

  useDidUpdate(() => {
    goalNameField.reset();
    goalAccountsField.reset();
    goalTargetAmountField.reset();
    goalApplyAccountAmountField.reset();
    goalStartingAmountField.reset();
    props.setGoalConfiguration({
      name: "",
      accounts: [],
      targetAmount: 0,
      applyAccountAmount: false,
      startingAmount: 0,
    });
  }, [props.selectedGoalType]);

  useDidUpdate(() => {
    props.setGoalConfiguration({
      name: goalNameField.getValue(),
      accounts: goalAccountsField.getValue(),
      targetAmount: goalTargetAmountField.getValue(),
      applyAccountAmount: goalApplyAccountAmountField.getValue(),
      startingAmount: goalStartingAmountField.getValue(),
    });
  }, [
    goalNameField.getValue(),
    goalAccountsField.getValue(),
    goalTargetAmountField.getValue(),
    goalApplyAccountAmountField.getValue(),
    goalStartingAmountField.getValue(),
  ]);

  const isNextButtonDisabled = () => {
    let disabled =
      goalNameField.getValue().trim() === "" ||
      (!isManualGoal && goalAccountsField.getValue().length === 0);

    if (props.selectedGoalType === GoalType.SaveGoal || isManualGoal) {
      disabled = disabled || goalTargetAmountField.getValue() <= 0;
    }

    return disabled;
  };

  return (
    <Stack gap="2rem" justify="space-between">
      <Stack gap={"0.5rem"}>
        <TextInput
          label={t("goal_name")}
          placeholder={t("enter_goal_name")}
          {...goalNameField.getInputProps()}
        />
        {!isManualGoal && (
          <AccountMultiSelect
            label={t("accounts")}
            {...goalAccountsField.getInputProps()}
          />
        )}
        {props.selectedGoalType === GoalType.SaveGoal && (
          <SaveGoalOptions
            targetAmountField={goalTargetAmountField}
            applyAccountAmountField={goalApplyAccountAmountField}
          />
        )}
        {isManualGoal && (
          <ManualGoalOptions
            targetAmountField={goalTargetAmountField}
            startingAmountField={goalStartingAmountField}
          />
        )}
      </Stack>
      <Group w="100%">
        <Button
          variant="filled"
          color="primary"
          size="sm"
          flex="1 1 auto"
          onClick={() => props.goBackToPreviousDialog()}
        >
          {<MoveLeftIcon size={16} />}
        </Button>
        <Button
          variant="filled"
          color="primary"
          size="sm"
          flex="1 1 auto"
          disabled={isNextButtonDisabled()}
          onClick={() => {
            props.setGoalConfiguration({
              name: goalNameField.getValue(),
              accounts: isManualGoal ? [] : goalAccountsField.getValue(),
              targetAmount: goalTargetAmountField.getValue(),
              applyAccountAmount: goalApplyAccountAmountField.getValue(),
              startingAmount: goalStartingAmountField.getValue(),
            });
            props.launchNextDialog();
          }}
        >
          {<MoveRightIcon size={16} />}
        </Button>
      </Group>
    </Stack>
  );
};

export default ConfigureGoal;
