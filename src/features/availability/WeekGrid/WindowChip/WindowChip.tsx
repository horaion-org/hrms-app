import type { FunctionComponent } from "@/common/types";
import {
	formatWindow,
	type TimeWindow,
} from "@/features/availability/availabilityModel";

export type WindowChipProps = { window: TimeWindow };

/** One stretch of hours a person can work, e.g. "09:00–13:00"; past midnight it ends earlier than it starts. */
export const WindowChip = ({ window }: WindowChipProps): FunctionComponent => (
	<span className="block truncate rounded border border-ink-blue-200 bg-ink-blue-50 px-1.5 py-1 text-center text-xs font-medium text-ink-blue-900">
		{formatWindow(window)}
	</span>
);
