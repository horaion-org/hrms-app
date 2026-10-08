import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent, Heroicon } from "@/common/types";
import { ArrowDownIcon, ArrowUpIcon, MediumIcon } from "@/components/ui/Icon";
import type { Priority } from "@/features/scheduling/scheduleDraft";

export type PriorityIndicatorProps = {
	priority: Priority;
	className?: string;
};

const looks: Record<Priority, { icon: Heroicon; tile: string }> = {
	HIGH: {
		icon: ArrowUpIcon,
		tile: "border-error-200 bg-error-50 text-error-900",
	},
	MEDIUM: {
		icon: MediumIcon,
		tile: "border-warning-200 bg-warning-50 text-warning-900",
	},
	LOW: {
		icon: ArrowDownIcon,
		tile: "border-success-200 bg-success-50 text-success-900",
	},
};

/** A constraint's priority as a coloured mark and its name. */
export const PriorityIndicator = ({
	priority,
	className,
}: PriorityIndicatorProps): FunctionComponent => {
	const { t } = useTranslation();
	const { icon: Icon, tile } = looks[priority];

	return (
		<span
			className={joinClassNames("inline-flex items-center gap-3", className)}
		>
			<span
				aria-hidden="true"
				className={joinClassNames(
					"flex size-8 shrink-0 items-center justify-center rounded border",
					tile
				)}
			>
				<Icon className="size-4" />
			</span>
			{t(`scheduling.constraints.priorities.${priority}`)}
		</span>
	);
};
