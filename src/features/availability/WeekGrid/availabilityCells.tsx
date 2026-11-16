import type { WeekGridDay } from "@/components/ui/WeekGrid";
import type { AvailabilityDay } from "@/features/availability/availabilityModel";
import { AvailabilityCell } from "@/features/availability/WeekGrid/AvailabilityCell";

/** A week of availability as the week grid's cells: each day's windows as chips. */
export const availabilityCells = (
	days: ReadonlyArray<AvailabilityDay>
): Array<WeekGridDay> =>
	days.map(({ day, windows }) => ({
		day,
		cell: <AvailabilityCell windows={windows} />,
	}));
