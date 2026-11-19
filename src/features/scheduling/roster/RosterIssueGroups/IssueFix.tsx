import { useTranslation } from "react-i18next";
import { formatDay } from "@/common/formatDay";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { dayTypeInSentence } from "@/features/scheduling/dayTypes";
import type {
	DayTypeRetype,
	IssueFixOutcome,
	IssueFixes,
} from "@/features/scheduling/roster/dayTypeFix";

const key = "scheduling.issues.fix";

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
