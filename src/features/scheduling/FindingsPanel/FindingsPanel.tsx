import { useId, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { FindingList } from "@/features/scheduling/FindingList";
import { formatDay } from "@/features/scheduling/periods";
import {
	diagnosticLabel,
	groupDiagnostics,
} from "@/features/scheduling/roster/findings/diagnostics";
import type { FindingNames } from "@/features/scheduling/roster/findings/findingNames";
import { rosterNotes } from "@/features/scheduling/roster/findings/rosterNotes";
import type { GenerationFindings } from "@/features/scheduling/schedules/api";

export type FindingsPanelProps = {
	findings: GenerationFindings;
	names: FindingNames;
	/** The days in view; roster notes on other days are left out. */
	visibleDays: ReadonlyArray<string>;
	className?: string;
};

const key = "scheduling.findings";

/** One part of the panel, titled in plain text as the side panel's sections are: setup issues, or roster notes. */
const FindingPart = ({
	title,
	children,
}: {
	title: string;
	children: ReactNode;
}): FunctionComponent => {
	const titleId = useId();
	return (
		<section aria-labelledby={titleId} className="flex flex-col gap-4">
			<h3 className="font-semibold text-neutral-800" id={titleId}>
				{title}
			</h3>
			{children}
		</section>
	);
};

/** One group within a part: a code, a day or a member. */
const FindingGroup = ({
	title,
	children,
}: {
	title: string;
	children: ReactNode;
}): FunctionComponent => (
	<div>
		<h4 className="mb-2 text-sm font-semibold text-neutral-800">{title}</h4>
		{children}
	</div>
);

/**
 * What the engine found, in full, in two parts: setup issues grouped by
 * code, to be fixed in the setup, then the roster notes on the days in
 * view, by day and then by member. A part with nothing in it is left out.
 * Each finding is led by its tone's outline icon (`FindingList`).
 */
export const FindingsPanel = ({
	findings,
	names,
	visibleDays,
	className,
}: FindingsPanelProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = i18n.resolvedLanguage ?? i18n.language;
	const setupGroups = groupDiagnostics(findings.diagnostics);
	const notes = rosterNotes(findings, visibleDays);
	const rosterCount = [...notes.byDate, ...notes.byMember].reduce(
		(total, group) => total + group.findings.length,
		0
	);
	const memberTitle = (memberProfileId: string | null): string =>
		memberProfileId === null
			? t(`${key}.wholeRoster`)
			: (names.members.get(memberProfileId) ?? t(`${key}.unknownMember`));

	return (
		<div className={joinClassNames("flex flex-col gap-6", className)}>
			{setupGroups.length > 0 && (
				<FindingPart
					title={t(`${key}.setupTitle`, { count: findings.diagnostics.length })}
				>
					<p className="text-sm text-neutral-700">{t(`${key}.setupHint`)}</p>
					{setupGroups.map(({ code, diagnostics }) => (
						<FindingGroup
							key={code}
							title={t(`${key}.groupTitle`, {
								label: diagnosticLabel(code, t),
								count: diagnostics.length,
							})}
						>
							<FindingList
								names={names}
								findings={diagnostics.map((diagnostic) => ({
									kind: "diagnostic",
									diagnostic,
								}))}
							/>
						</FindingGroup>
					))}
				</FindingPart>
			)}
			{rosterCount > 0 && (
				<FindingPart title={t(`${key}.rosterTitle`, { count: rosterCount })}>
					{notes.byDate.map(({ date, findings: dayFindings }) => (
						<FindingGroup key={date} title={formatDay(date, language)}>
							<FindingList findings={dayFindings} names={names} />
						</FindingGroup>
					))}
					{notes.byMember.map(
						({ memberProfileId, findings: memberFindings }) => (
							<FindingGroup
								key={memberProfileId ?? ""}
								title={memberTitle(memberProfileId)}
							>
								<FindingList
									showDates
									findings={memberFindings}
									names={names}
								/>
							</FindingGroup>
						)
					)}
				</FindingPart>
			)}
		</div>
	);
};
