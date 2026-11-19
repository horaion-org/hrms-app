import { useTranslation } from "react-i18next";
import { formatDay } from "@/common/formatDay";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import {
	dayTypeInSentence,
	dayTypeLabel,
} from "@/features/scheduling/dayTypes";
import type {
	DayTypeRetype,
	DayTypeRetypeGroup,
	IssueFixOutcome,
	IssueFixes,
} from "@/features/scheduling/roster/dayTypeFix";

const key = "scheduling.issues.fix";

/** How many days a plural day type names in "one of their days off". */
const SEVERAL = 2;

export type IssueFixAdviceProps = {
	retype: DayTypeRetype;
	/** Whose day it is, as the row names them. */
	name: string;
	/** The locale dates are written in (`formattingLocale`). */
	language: string;
};

/** A row's advice once a retype is known: "What to do: Fri, 20 Nov is a day off for Ben Tan. Make it the rest day." */
export const IssueFixAdvice = ({
	retype,
	name,
	language,
}: IssueFixAdviceProps): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<span className="text-sm text-neutral-700">
			{t("scheduling.issues.advice.lead", {
				advice: t(`${key}.advice`, {
					day: formatDay(retype.day, language),
					from: dayTypeInSentence(retype.from, t),
					to: dayTypeInSentence(retype.to, t),
					name,
				}),
			})}
		</span>
	);
};

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

export type IssueFixButtonProps = {
	retype: DayTypeRetype;
	fixes: Pick<IssueFixes, "onFix" | "busy">;
};

/** A row's second action: "Make it a rest day", worded from the day type the rule needs. */
export const IssueFixButton = ({
	retype,
	fixes,
}: IssueFixButtonProps): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<Button
			className="shrink-0"
			disabled={fixes.busy}
			variant="textlink"
			onClick={(): void => {
				fixes.onFix(retype);
			}}
		>
			{t(`${key}.make`, { dayType: dayTypeInSentence(retype.to, t) })}
		</Button>
	);
};

export type IssueFixAllProps = {
	group: DayTypeRetypeGroup;
	fixes: Pick<IssueFixes, "busy" | "outcome"> & {
		onFixAll: NonNullable<IssueFixes["onFixAll"]>;
	};
};

/** A group's one action for every row of a rule with a retype: "Give each of these 20 people a rest day on one of their days off". */
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
			{fixes.outcome?.key === group.key ? (
				<IssueFixOutcomeLine outcome={fixes.outcome} />
			) : null}
		</div>
	);
};
