import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent, Heroicon } from "@/common/types";
import { AlertIcon, TickFilledIcon, WarningIcon } from "@/components/ui/Icon";
import {
	allocationStatusOf,
	type AllocationStatus as Status,
} from "@/features/scheduling/scheduleDraft";

export type AllocationStatusProps = {
	allocated: number;
	needed: number;
	className?: string;
};

const looks: Record<Status, { icon: Heroicon; classes: string }> = {
	complete: {
		icon: TickFilledIcon,
		classes: "border-success-200 bg-success-50 text-success-900",
	},
	short: {
		icon: AlertIcon,
		classes: "border-warning-200 bg-warning-50 text-warning-900",
	},
	over: {
		icon: WarningIcon,
		classes: "border-error-200 bg-error-50 text-error-900",
	},
};

/** How many of a shift's staff the forecast has allocated, coloured by whether it fits. */
export const AllocationStatus = ({
	allocated,
	needed,
	className,
}: AllocationStatusProps): FunctionComponent => {
	const { t } = useTranslation();
	const status = allocationStatusOf(allocated, needed);
	const { icon: Icon, classes } = looks[status];

	return (
		<span
			aria-live="polite"
			data-status={status}
			className={joinClassNames(
				"inline-flex h-8 items-center gap-2 rounded-lg border px-3 text-xs font-semibold whitespace-nowrap",
				classes,
				className
			)}
		>
			<Icon className="size-4 shrink-0" />
			{t("scheduling.forecast.allocated", { allocated, needed })}
		</span>
	);
};
