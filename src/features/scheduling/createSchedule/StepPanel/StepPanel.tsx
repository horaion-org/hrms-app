import { useId, type ReactNode } from "react";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";

export type StepPanelProps = {
	title: string;
	description: string;
	/** Placed at the top right, e.g. an Add button. */
	actions?: ReactNode;
	/** Decorative mark before the title, e.g. a ready tick. */
	icon?: ReactNode;
	children?: ReactNode;
	className?: string;
};

/** The card holding one Create Schedule step's heading and content. */
export const StepPanel = ({
	title,
	description,
	actions,
	icon,
	children,
	className,
}: StepPanelProps): FunctionComponent => {
	const titleId = useId();

	return (
		<section
			aria-labelledby={titleId}
			className={joinClassNames(
				"rounded-xl border border-neutral-400 p-6",
				className
			)}
		>
			<div className="flex flex-wrap items-start justify-between gap-6">
				<div className="flex min-w-0 items-center gap-5">
					{icon}
					<div className="min-w-0">
						<h2 className="text-xl font-bold text-ink-blue-900" id={titleId}>
							{title}
						</h2>
						<p className="mt-3 text-sm font-medium text-neutral-800">
							{description}
						</p>
					</div>
				</div>
				{actions != null && (
					<div className="flex flex-wrap gap-4">{actions}</div>
				)}
			</div>
			{children}
		</section>
	);
};
