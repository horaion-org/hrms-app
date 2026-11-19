import type { SelectOption } from "@/components/forms/Select";
import type { ConstraintOptions } from "@/features/scheduling/constraints/api";

/** The shifts a shift field offers, each with its group, so the picker shows the group's chip and names the group on its row. */
export const shiftOptionsOf = (
	shifts: ConstraintOptions["shifts"]
): Array<SelectOption> =>
	shifts.map((shift) => ({
		value: shift.shiftId,
		label: shift.name,
		group: shift.group ?? undefined,
	}));
