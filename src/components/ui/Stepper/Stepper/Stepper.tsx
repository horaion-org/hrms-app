import { Children, type ReactElement } from "react";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { StepContext } from "@/components/ui/Stepper/Stepper.context";
import type { StepperStepProps } from "@/components/ui/Stepper/StepperStep";

export type StepperProps = {
	/**
	 * Zero-based current index; the step count marks the whole sequence
	 * passed. Steps before it are ticked unless they say otherwise.
	 */
	currentStep: number;
	/** Allows a person to return to a step before the current one. */
	onStepClick?: (index: number) => void;
	className?: string;
	children:
		ReactElement<StepperStepProps> | Array<ReactElement<StepperStepProps>>;
};

export const Stepper = ({
	children,
	className,
	currentStep,
	onStepClick,
}: StepperProps): FunctionComponent => {
	const count = Children.count(children);

	return (
		<nav
			aria-label="Steps"
			className={joinClassNames("@container/stepper w-full min-w-0", className)}
		>
			<ol className="flex w-full items-center" role="list">
				{Children.map(children, (step, index) => (
					<StepContext.Provider
						value={{
							index,
							onStepClick,
							isLast: index === count - 1,
							position:
								index < currentStep
									? "before"
									: index === currentStep
										? "current"
										: "after",
						}}
					>
						{step}
					</StepContext.Provider>
				))}
			</ol>
		</nav>
	);
};
