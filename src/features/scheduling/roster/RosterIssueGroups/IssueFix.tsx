import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import {
	dayTypeInSentence,
	dayTypeLabel,
} from "@/features/scheduling/dayTypes";
import type {
	DayTypeRetypeGroup,
	IssueFixOutcome,
	IssueFixes,
} from "@/features/scheduling/roster/dayTypeFix";

const key = "scheduling.issues.fix";

/** How many days a plural day type names in "one of their days off". */
const SEVERAL = 2;

/** How a fix ended when it did not simply go through: the refusal as the day editor words it, or how many days of a group were changed. */
export const IssueFixOutcomeLine = ({
	outcome,
}: {
	outcome: IssueFixOutcome;
}): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<span className="text-sm text-error-700" role="alert">
			{outcome.refusal
				? t(`scheduling.rosterEdit.error.${outcome.refusal}`)
				: t(`${key}.someDone`, { done: outcome.done, total: outcome.total })}
		</span>
	);
};

export type IssueFixAllProps = {
	group: DayTypeRetypeGroup;
	fixes: Pick<IssueFixes, "busy" | "outcome"> & {
		onFixAll: NonNullable<IssueFixes["onFixAll"]>;
	};
};

/**
 * A group's one action for every row of a rule with a retype: "Give each of
 * these 20 people a rest day on one of their days off", and why it was
 * refused. A change made in part is said by the list, as its rows then go.
 */
export const IssueFixAll = ({
	group,
	fixes,
}: IssueFixAllProps): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<div className="flex flex-col items-start gap-1 py-2">
			<Button
				disabled={fixes.busy}
				variant="textlink"
				onClick={(): void => {
					fixes.onFixAll(group);
				}}
			>
				{t(`${key}.makeAll`, {
					count: group.people,
					to: dayTypeInSentence(group.to, t),
					from: dayTypeLabel(group.from, t, SEVERAL).toLocaleLowerCase(),
				})}
			</Button>
			{fixes.outcome?.key === group.key && fixes.outcome.refusal ? (
				<IssueFixOutcomeLine outcome={fixes.outcome} />
			) : null}
		</div>
	);
};
