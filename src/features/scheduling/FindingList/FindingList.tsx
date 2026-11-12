import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { formatTimeRange } from "@/features/scheduling/formatShift";
import { formatDay } from "@/features/scheduling/periods";
import { conflictClockTimes } from "@/features/scheduling/roster/findings/conflictTimes";
import { diagnosticSentence } from "@/features/scheduling/roster/findings/diagnostics";
import {
	findingTone,
	type Finding,
} from "@/features/scheduling/roster/findings/finding";
import type { FindingNames } from "@/features/scheduling/roster/findings/findingNames";
import { ruleLabel } from "@/features/scheduling/roster/findings/ruleLabel";
import { FINDING_TONE_ICONS } from "./findingToneIcons";

export type FindingListProps = {
	findings: ReadonlyArray<Finding>;
	names: FindingNames;
	/** Whether each finding says its day; off where a heading already names it. */
	showDates?: boolean;
};

const key = "scheduling.findings";

/**
 * Findings as the Issues panel lists them, each led by its tone's outline
 * icon (`FINDING_TONE_ICONS`). The engine's own words are quoted, never
 * shown as the app's copy (ADR-0003).
 */
export const FindingList = ({
	findings,
	names,
	showDates = false,
}: FindingListProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	const dayOf = (date: string | null): string | null =>
		showDates && date !== null ? formatDay(date, language) : null;

	const item = (finding: Finding): ReactNode => {
		switch (finding.kind) {
			case "conflict": {
				const { conflict } = finding;
				const time = formatTimeRange(conflictClockTimes(conflict), t);
				const day = dayOf(conflict.date);
				return (
					<>
						<p className="font-semibold text-neutral-900">
							{day ? t(`${key}.when`, { day, time }) : time}
							<span aria-hidden="true" className="mx-2">
								•
							</span>
							{t(`${key}.missing`, { count: conflict.missing })}
						</p>
						{conflict.message && (
							<q className="mt-1 block text-neutral-800">{conflict.message}</q>
						)}
						<p className="mt-1 text-neutral-700">
							{t(`${key}.rule`, {
								rule: ruleLabel(
									{
										name: conflict.sourceRule,
										constraintId: conflict.sourceRuleId,
									},
									names.rules,
									t
								),
							})}
						</p>
					</>
				);
			}
			case "message": {
				const day = dayOf(finding.date);
				return (
					<p className="text-neutral-800">
						{day && <span className="mr-2 text-neutral-700">{day}</span>}
						<q>{finding.message}</q>
					</p>
				);
			}
			case "diagnostic": {
				const sentence = diagnosticSentence(
					finding.diagnostic,
					names,
					t,
					(date) => formatDay(date, language)
				);
				if (sentence === null)
					return (
						<q className="text-neutral-800">{finding.diagnostic.message}</q>
					);
				return (
					<>
						<p className="text-neutral-900">{sentence}</p>
						<q className="mt-1 block text-xs text-neutral-700">
							{finding.diagnostic.message}
						</q>
					</>
				);
			}
		}
	};

	return (
		<ul className="flex flex-col gap-3 text-sm">
			{findings.map((finding, index) => {
				const { icon: Icon, colour } = FINDING_TONE_ICONS[findingTone(finding)];
				return (
					// The engine may repeat a finding word for word; the list never reorders.
					<li key={index} className="flex gap-2">
						<Icon
							aria-hidden="true"
							className={joinClassNames("mt-0.5 size-4 shrink-0", colour)}
						/>
						<div className="min-w-0">{item(finding)}</div>
					</li>
				);
			})}
		</ul>
	);
};
