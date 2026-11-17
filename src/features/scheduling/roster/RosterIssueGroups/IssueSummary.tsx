import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import {
	issueSummaryParts,
	type IssueGroup,
} from "@/features/scheduling/roster/rosterIssueGroups";
import { GROUP_LOOKS } from "./issueGroupTones";

export type IssueSummaryProps = {
	/** How many items each group holds (`issueCounts`). */
	counts: Record<IssueGroup, number>;
};

/** The one line under the Issues title: "6 to fix · 1 could not be met · 3 for information" in the groups' tones, or "Nothing to fix this week". */
export const IssueSummary = ({
	counts,
}: IssueSummaryProps): FunctionComponent => {
	const { t } = useTranslation();
	const parts = issueSummaryParts(counts, t);
	if (parts.length === 0)
		return (
			<p className="text-sm text-neutral-700">
				{t("scheduling.issues.nothingToFix")}
			</p>
		);
	return (
		<p className="text-sm">
			{parts.map(({ group, text }, index) => (
				<Fragment key={group}>
					{index > 0 ? <span className="text-neutral-700"> · </span> : null}
					<span className={GROUP_LOOKS[group].textTone}>{text}</span>
				</Fragment>
			))}
		</p>
	);
};
