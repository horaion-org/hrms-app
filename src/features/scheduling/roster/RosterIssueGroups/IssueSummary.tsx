import type { ParseKeys } from "i18next";
import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import {
	issueSummaryParts,
	type IssueGroup,
} from "@/features/scheduling/roster/rosterIssueGroups";
import type { ValidationLead } from "@/features/scheduling/rulesCheck/issuesFromValidation";
import { GROUP_LOOKS } from "./issueGroupTones";

export type IssueSummaryProps = {
	/** How many items each group holds (`issueCounts`). */
	counts: Record<IssueGroup, number>;
	/** What leads the line while the counts are not the validated truth (`validationLead`). */
	lead?: ValidationLead;
};

/** Each lead's words and tone: a check running in grey, unchecked changes in amber. */
const LEADS: Record<ValidationLead, { textKey: ParseKeys; tone: string }> = {
	validating: {
		textKey: "scheduling.rulesCheck.loading",
		tone: GROUP_LOOKS.forInformation.textTone,
	},
	unchecked: {
		textKey: "scheduling.issues.summary.changesUnchecked",
		tone: GROUP_LOOKS.notMet.textTone,
	},
};

/**
 * The one line under the Issues title: "6 to fix · 1 could not be met · 3 for
 * information" in the groups' tones, led by "Validating the schedule…" while
 * a check runs or "Changes not validated" in the warning tone when the list is
 * only the generation's; "Nothing to fix this week" only with no lead and
 * every group empty.
 */
export const IssueSummary = ({
	counts,
	lead,
}: IssueSummaryProps): FunctionComponent => {
	const { t } = useTranslation();
	const parts = [
		...(lead
			? [{ key: lead, text: t(LEADS[lead].textKey), tone: LEADS[lead].tone }]
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
