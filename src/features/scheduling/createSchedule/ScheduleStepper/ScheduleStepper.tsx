import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Stepper, StepperStep } from "@/components/ui/Stepper";
import { SCHEDULE_STEPS, type ScheduleStep } from "@/features/scheduling/steps";

export type ScheduleStepperProps = {
	/** The step the person is on, as an index of `SCHEDULE_STEPS`. */
	current: number;
	/** Which steps have their work done (`stepCompletion`). */
	completion: Record<ScheduleStep, boolean>;
	/** Opens the step at an index of `SCHEDULE_STEPS`. */
	onStepClick: (index: number) => void;
};

/** The Create Schedule wizard's stepper: one named step per `SCHEDULE_STEPS`, ticked once its work is done. */
export const ScheduleStepper = ({
	current,
	completion,
	onStepClick,
}: ScheduleStepperProps): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<Stepper className="mt-12" currentStep={current} onStepClick={onStepClick}>
			{SCHEDULE_STEPS.map((name) => (
				<StepperStep
					key={name}
					completed={completion[name]}
					label={t(`scheduling.create.steps.${name}`)}
				/>
			))}
		</Stepper>
	);
};
