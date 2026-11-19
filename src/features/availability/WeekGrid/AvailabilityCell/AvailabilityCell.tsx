import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Chip } from "@/components/ui/Chip";
import { MinusIcon } from "@/components/ui/Icon";
import {
	formatWindow,
	type TimeWindow,
} from "@/features/availability/availabilityModel";

export type AvailabilityCellProps = {
	/** One day's windows, earliest first. */
	windows: ReadonlyArray<TimeWindow>;
};

/** One day of a week grid: a chip per window, or a muted minus icon read as "Not available". */
export const AvailabilityCell = ({
	windows,
}: AvailabilityCellProps): FunctionComponent => {
	const { t } = useTranslation();
	if (windows.length === 0)
		return (
			<span className="flex justify-center text-neutral-600">
				<MinusIcon className="size-4" />
				<span className="sr-only">{t("availability.none")}</span>
			</span>
		);
	return (
		<ul className="flex flex-col gap-1">
			{windows.map((window) => (
				<li key={window.startTime}>
					<Chip label={formatWindow(window)} />
				</li>
			))}
		</ul>
	);
};
