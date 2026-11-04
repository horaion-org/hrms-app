import type { GenerationFindings } from "@/features/scheduling/schedules/api";

/** One entry the engine reported: its day, if it names one, and its own words. */
export type MemberFindingEntry = {
	date: string | null;
	messages: Array<string>;
};

/** What the engine reported about one member, or about the roster as a whole. */
export type MemberFindings = {
	/** The engine's employee id, or null for entries that name no member. */
	memberProfileId: string | null;
	/** The member's name as the findings resolved it; null when it did not resolve. */
	name: string | null;
	entries: Array<MemberFindingEntry>;
};

/**
 * The findings' `errors` grouped by the member they are about, in order of
 * first mention. A member is named through `findings.members`; one that did
 * not resolve keeps a null name, so the caller can show its id instead.
 * Entries that name no member form one group of their own.
 */
export const findingsByMember = ({
	errors,
	members,
}: Pick<GenerationFindings, "errors" | "members">): Array<MemberFindings> => {
	const names = new Map(
		members.map((member) => [member.memberProfileId, member.displayName])
	);
	const groups = new Map<string | null, MemberFindings>();
	for (const { employeeId, date, messages } of errors) {
		const group = groups.get(employeeId) ?? {
			memberProfileId: employeeId,
			name: employeeId === null ? null : (names.get(employeeId) ?? null),
			entries: [],
		};
		group.entries.push({ date, messages });
		groups.set(employeeId, group);
	}
	return [...groups.values()];
};
