import type { FunctionComponent } from "@/common/types";
import {
	RosterIssueGroups,
	type RosterIssueGroupsProps,
} from "./RosterIssueGroups";
import { useDayTypeFixes, type DayTypeFixesInput } from "./useDayTypeFixes";

/** What making a fix from Issues needs, besides the items listed: the roster, its frozen rules and how to change it. */
export type IssueFixing = Omit<DayTypeFixesInput, "issues">;

export type FixableIssueGroupsProps = Omit<RosterIssueGroupsProps, "fixes"> & {
	fixing: IssueFixing;
};

/**
 * The Issues tab for someone who may change the roster: `RosterIssueGroups`
 * with the fixes it can make itself (`useDayTypeFixes`). Apart from the
 * plain list, so a read-only roster needs no query client.
 */
export const FixableIssueGroups = ({
	fixing,
	...list
}: FixableIssueGroupsProps): FunctionComponent => {
	const fixes = useDayTypeFixes({ ...fixing, issues: list.issues });
	return <RosterIssueGroups {...list} fixes={fixes} />;
};
