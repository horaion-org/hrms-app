import { useId, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import type { CoverGapRequest } from "@/features/scheduling/cover/api";
import { FindingList } from "@/features/scheduling/FindingList";
import { formatDay } from "@/common/formatDay";
import {
	diagnosticLabel,
	groupDiagnostics,
} from "@/features/scheduling/roster/findings/diagnostics";
import type { FindingNames } from "@/features/scheduling/roster/findings/findingNames";
import {
	findingWeight,
	isInfoDiagnostic,
} from "@/features/scheduling/roster/findings/finding";
import { rosterNotes } from "@/features/scheduling/roster/findings/rosterNotes";
import type { GenerationFindings } from "@/features/scheduling/schedules/api";

export type FindingsPanelProps = {
	findings: GenerationFindings;
	names: FindingNames;
	/** The days in view; roster notes on other days are left out. */
	visibleDays: ReadonlyArray<string>;
	/** Offers Find cover on the shifts the generation left short; none without. */
	onFindCover?: (gap: CoverGapRequest) => void;
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
 * What the engine found, in full: setup issues grouped by code, to be fixed
 * in the setup; the roster notes on the days in view, by day and then by
 * member, opened by how many shifts are short and by how many people; and
 * what is only good to know (the engine's "info" diagnostics, such as rest
 * carried in from before), nothing to fix. A part with nothing in it is
 * left out.
 * Each finding is led by its tone's outline icon (`FindingList`).
 */
export const FindingsPanel = ({
	findings,
	names,
	visibleDays,
	onFindCover,
	className,
}: FindingsPanelProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	// A diagnostic that only explains the roster ("info") is nothing to fix, so it is kept apart.
	const setupGroups = groupDiagnostics(
		findings.diagnostics.filter((diagnostic) => !isInfoDiagnostic(diagnostic))
	);
	const goodToKnow = findings.diagnostics.filter(isInfoDiagnostic);
	const goodToKnowGroups = groupDiagnostics(goodToKnow);
	const notes = rosterNotes(findings, visibleDays);
	// How short the shown days are, in shifts and in people, so filling part of a shift visibly counts.
	const shortShifts = notes.byDate.flatMap((group) =>
		group.findings.filter((finding) => finding.kind === "conflict")
	);
	const peopleShort = shortShifts.reduce(
		(total, finding) => total + findingWeight(finding),
		0
	);
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
					title={t(`${key}.setupTitle`, {
						count: findings.diagnostics.length - goodToKnow.length,
					})}
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
					{shortShifts.length > 0 && (
						<p className="text-sm text-neutral-800">
							{t(`${key}.shortSummary`, {
								count: shortShifts.length,
								people: t(`${key}.people`, { count: peopleShort }),
							})}
						</p>
					)}
					{notes.byDate.map(({ date, findings: dayFindings }) => (
						<FindingGroup key={date} title={formatDay(date, language)}>
							<FindingList
								findings={dayFindings}
								names={names}
								onFindCover={onFindCover}
							/>
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
									onFindCover={onFindCover}
								/>
							</FindingGroup>
						)
					)}
				</FindingPart>
			)}
			{goodToKnowGroups.length > 0 && (
				<FindingPart
					title={t(`${key}.goodToKnowTitle`, { count: goodToKnow.length })}
				>
					<p className="text-sm text-neutral-700">
						{t(`${key}.goodToKnowHint`)}
					</p>
					{goodToKnowGroups.map(({ code, diagnostics }) => (
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
		</div>
	);
};
