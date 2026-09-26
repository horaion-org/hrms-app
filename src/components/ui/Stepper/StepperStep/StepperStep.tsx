import { useContext } from "react";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { TickIcon } from "@/components/ui/Icon";
import { StepContext } from "@/components/ui/Stepper/Stepper.context";

export type StepperStepProps = {
	label: string;
};

export const StepperStep = ({ label }: StepperStepProps): FunctionComponent => {
	const step = useContext(StepContext);
	if (!step) throw new Error("StepperStep must be rendered inside Stepper");
	const isClickable = step.status === "completed" && !!step.onStepClick;
	const isLabelVisibleInNarrow =
		step.status === "current" || (step.status === "completed" && step.isLast);
	const Content = isClickable ? "button" : "span";
	const accessibleName = `Step ${step.index + 1}: ${label}${step.status === "completed" ? ", completed" : ""}`;

	return (
		<li
			aria-current={step.status === "current" ? "step" : undefined}
			aria-label={isClickable ? undefined : accessibleName}
			className={joinClassNames(
				"flex items-center @2xl/stepper:min-w-0",
				isLabelVisibleInNarrow && "min-w-0",
				!step.isLast && "flex-auto"
			)}
		>
			<Content
				aria-label={isClickable ? accessibleName : undefined}
				type={isClickable ? "button" : undefined}
				className={joinClassNames(
					"flex min-w-12 items-center gap-2 @2xl/stepper:gap-5",
					isClickable &&
						"group/step cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-blue-500"
				)}
				onClick={
					isClickable ? (): void => step.onStepClick?.(step.index) : undefined
				}
			>
				<span
					aria-hidden="true"
					className={joinClassNames(
						"flex size-12 shrink-0 items-center justify-center rounded-full border text-xl",
						step.status === "current"
							? "border-ink-blue-900 bg-ink-blue-900 text-white"
							: step.status === "completed"
								? "border-ink-blue-900 text-ink-blue-900"
								: "border-neutral-300 text-neutral-500",
						isClickable &&
							"transition-colors group-hover/step:border-ink-blue-500 group-hover/step:text-ink-blue-500 group-active/step:border-ink-blue-300 group-active/step:text-ink-blue-300"
					)}
				>
					{step.status === "completed" ? (
						<TickIcon aria-hidden="true" className="size-6" />
					) : (
						step.index + 1
					)}
				</span>
				<span
					aria-hidden="true"
					className={joinClassNames(
						"min-w-0 truncate text-base font-semibold",
						!isLabelVisibleInNarrow && "hidden @2xl/stepper:inline",
						step.status === "current"
							? "text-ink-blue-900"
							: step.status === "completed"
								? "text-neutral-900"
								: "text-neutral-500",
						isClickable &&
							"transition-colors group-hover/step:text-ink-blue-500 group-active/step:text-ink-blue-300"
					)}
				>
					{label}
				</span>
			</Content>
			{!step.isLast && (
				<span
					aria-hidden="true"
					className={joinClassNames(
						"mx-1 h-px min-w-px flex-1 @2xl/stepper:mx-3",
						step.status === "completed" ? "bg-ink-blue-900" : "bg-neutral-300"
					)}
				/>
			)}
		</li>
	);
};
