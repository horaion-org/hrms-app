import {
	messageFindings,
	type Finding,
} from "@/features/scheduling/roster/findings/finding";
import { isOnShownDays } from "@/features/scheduling/roster/findings/rosterNotes";
import type { GenerationFindings } from "@/features/scheduling/schedules/api";

/**
 * The findings the roster grid marks, by where they are shown: a member's
 * day, a member's row, or a day's column header.
 */
export type GridFindings = {
	/** By `cellKey(membershipId, date)`. */
	byCell: ReadonlyMap<string, Array<Finding>>;
	/** By membership. */
	byRow: ReadonlyMap<string, Array<Finding>>;
	/** By ISO date. */
	byDate: ReadonlyMap<string, Array<Finding>>;
};

/** The key of one member's day in `GridFindings.byCell`. */
export const cellKey = (membershipId: string, date: string): string =>
	`${membershipId}|${date}`;

/** The one diagnostic about a member rather than the setup: no shift fits them. */
const MEMBER_DIAGNOSTIC = "UNASSIGNABLE_EMPLOYEE";

const append = (
	map: Map<string, Array<Finding>>,
	key: string,
	findings: ReadonlyArray<Finding>
): void => {
	map.set(key, [...(map.get(key) ?? []), ...findings]);
};

/**
 * Where each finding on the days in view is marked. Members are placed by
 * their membership, so one that no longer resolves is left to the findings
 * panel. Diagnostics about the setup (demand, shifts, rules) are never placed.
 */
export const placeFindings = (
	findings: GenerationFindings,
	visibleDays: ReadonlyArray<string>
): GridFindings => {
	const shownDays = new Set(visibleDays);
	const memberships = new Map(
		findings.members.map((member) => [
			member.memberProfileId,
			member.membershipId,
		])
	);
	const membershipOf = (memberProfileId: string | null): string | null =>
		memberProfileId === null
			? null
			: (memberships.get(memberProfileId) ?? null);
	const byCell = new Map<string, Array<Finding>>();
	const byRow = new Map<string, Array<Finding>>();
	const byDate = new Map<string, Array<Finding>>();

	for (const conflict of findings.conflicts) {
		if (!isOnShownDays(conflict.date, shownDays)) continue;
		const finding: Finding = { kind: "conflict", conflict };
		if (conflict.employeeUuid === null)
			append(byDate, conflict.date, [finding]);
		else {
			const membershipId = membershipOf(conflict.employeeUuid);
			if (membershipId !== null) append(byRow, membershipId, [finding]);
		}
	}
	for (const { employeeId, date, messages } of findings.errors) {
		if (!isOnShownDays(date, shownDays)) continue;
		const membershipId = membershipOf(employeeId);
		if (membershipId !== null)
			append(byRow, membershipId, messageFindings(date, messages));
		else if (employeeId === null && date !== null)
			append(byDate, date, messageFindings(date, messages));
	}
	for (const { employeeId, day, messages } of findings.assignmentMessages) {
		const membershipId = membershipOf(employeeId);
		if (membershipId !== null && shownDays.has(day))
			append(
				byCell,
				cellKey(membershipId, day),
				messageFindings(day, messages)
			);
	}
	for (const diagnostic of findings.diagnostics) {
		const employeeId = diagnostic.entities["employeeId"];
		if (diagnostic.code !== MEMBER_DIAGNOSTIC || typeof employeeId !== "string")
			continue;
		const membershipId = membershipOf(employeeId);
		if (membershipId !== null)
			append(byRow, membershipId, [{ kind: "diagnostic", diagnostic }]);
	}
	return { byCell, byRow, byDate };
};
