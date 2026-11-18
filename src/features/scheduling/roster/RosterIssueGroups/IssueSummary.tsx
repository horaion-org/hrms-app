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
	/** Whether hand changes are not validated, so the counts are only the generation's (`changesUnchecked`). */
	changesUnchecked?: boolean;
};

/**
 * The one line under the Issues title: "6 to fix · 1 could not be met · 3 for
 * information" in the groups' tones, led by "Changes not validated" in the
 * warning tone when the list is only the generation's; "Nothing to fix this
 * week" only when every group is empty and nothing is left unchecked.
 */
export const IssueSummary = ({
	counts,
	changesUnchecked = false,
}: IssueSummaryProps): FunctionComponent => {
	const { t } = useTranslation();
	const parts = [
		...(changesUnchecked
			? [
					{
						key: "changesUnchecked",
						text: t("scheduling.issues.summary.changesUnchecked"),
						tone: GROUP_LOOKS.notMet.textTone,
					},
				]
			: []),
		...issueSummaryParts(counts, t).map(({ group, text }) => ({
			key: group,
			text,
			tone: GROUP_LOOKS[group].textTone,
		})),
	];
	if (parts.length === 0)
		return (
			<p className="text-sm text-neutral-700">
				{t("scheduling.issues.nothingToFix")}
			</p>
		);
	return (
		<p className="text-sm">
			{parts.map(({ key, text, tone }, index) => (
				<Fragment key={key}>
					{index > 0 ? <span className="text-neutral-700"> · </span> : null}
					<span className={tone}>{text}</span>
				</Fragment>
			))}
		</p>
	);
};
