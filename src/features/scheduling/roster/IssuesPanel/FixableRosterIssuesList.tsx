import type { FunctionComponent } from "@/common/types";
import {
	useDayTypeFixes,
	type DayTypeFixesInput,
} from "@/features/scheduling/roster/RosterIssueGroups/useDayTypeFixes";
import {
	RosterIssuesList,
	type RosterIssuesListProps,
} from "./RosterIssuesList";

export type FixableRosterIssuesListProps = Omit<RosterIssuesListProps, "fixes"> & {
	fixing: Omit<DayTypeFixesInput, "issues">;
};

/**
 * The Issues list for someone who may change the roster: `RosterIssuesList`
 * with the fixes it can make itself (`useDayTypeFixes`). Apart from the plain
 * list, so a read-only roster needs no query client.
 */
export const FixableRosterIssuesList = ({
	fixing,
	...list
}: FixableRosterIssuesListProps): FunctionComponent => {
	const fixes = useDayTypeFixes({ ...fixing, issues: list.issues });
	return <RosterIssuesList {...list} fixes={fixes} />;
};
