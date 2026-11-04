import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import type { DateRange } from "@/components/forms/Calendar";
import { DatePicker } from "@/components/forms/DatePicker";
import { Button } from "@/components/ui/Button";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/Icon";
import { shiftRange } from "@/features/leave/dates";

export type LeaveRangeNavigatorProps = {
	range: DateRange;
	onRangeChange: (range: DateRange) => void;
};

/**
 * The timeline's window: step it back or on by its own length, or pick
 * dates. Sits in the Leave page's toolbar, beside the units it narrows.
 */
export const LeaveRangeNavigator = ({
	range,
	onRangeChange,
}: LeaveRangeNavigatorProps): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<div className="flex min-w-0 items-center gap-2">
			<Button
				aria-label={t("leave.previousPeriod")}
				variant="icon"
				onClick={() => {
					onRangeChange(shiftRange(range, -1));
				}}
			>
				<ChevronLeftIcon />
			</Button>
			<DatePicker
				label={t("leave.dateRange")}
				value={range}
				onChange={onRangeChange}
			/>
			<Button
				aria-label={t("leave.nextPeriod")}
				variant="icon"
				onClick={() => {
					onRangeChange(shiftRange(range, 1));
				}}
			>
				<ChevronRightIcon />
			</Button>
		</div>
	);
};
