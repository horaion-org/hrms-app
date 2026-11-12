import type { TFunction } from "i18next";
import type { ReactNode } from "react";
import {
	DescriptionList,
	type DescriptionListItem,
} from "@/components/ui/DescriptionList";
import { FilterChips } from "@/components/ui/FilterChips";
import type { CoverGapRequest } from "@/features/scheduling/cover/api";
import type { CoverOffer } from "@/features/scheduling/coverOffers/api";
import { OffersOutSection } from "@/features/scheduling/coverOffers/OffersOutSection";
import { FindingList } from "@/features/scheduling/FindingList";
import { FindingsPanel } from "@/features/scheduling/FindingsPanel";
import { formatDay } from "@/features/scheduling/periods";
import { findingFamily } from "@/features/scheduling/roster/findings/finding";
import {
	issuesOfHeader,
	type IssuesAbout,
} from "@/features/scheduling/roster/rosterMarks";
import {
	changedDayItems,
	daysToDecideItems,
	leaveAndCoverItems,
	startingPointItems,
} from "@/features/scheduling/roster/rosterPanels";
import type { RosterPanel } from "@/features/scheduling/roster/rosterSearch";
import type { RosterView } from "@/features/scheduling/roster/rosterView";
import type { RosterChangeTarget } from "@/features/scheduling/rosterChanges/useRosterChangeActions";
import type { RosterSidePanelSection } from "@/features/scheduling/RosterSidePanel";
import type { ScheduleAssignment } from "@/features/scheduling/schedules/api";

const key = "scheduling.detail";

/** What the side panel's lists are built from. */
export type RosterListInput = {
	roster: Pick<
		RosterView,
		| "rows"
		| "days"
		| "findings"
		| "names"
		| "placed"
		| "changed"
		| "leaveAndCover"
		| "toDecide"
		| "editedDays"
		| "issuesAbout"
	>;
	assignments: ReadonlyArray<ScheduleAssignment>;
	t: TFunction;
	/** The locale dates are written in (`formattingLocale`). */
	language: string;
	/** How many members' week before changed since generation. */
	membersWithChangedStart: number;
	/** The working days in a row each member brought into the period; none when not readable. */
	startingRuns?: ReadonlyMap<string, number>;
	/** On a published roster being changed: its cover offers, listed under Issues. */
	coverOffers?: {
		offers: ReadonlyArray<CoverOffer>;
		failed: boolean;
		retry: () => void;
		target: RosterChangeTarget;
		timeZone: string;
	};
	/** The latest hand change, first in Changed. */
	latestChange?: ReactNode;
	/** The schedule's history for Details. */
	details?: ReadonlyArray<DescriptionListItem>;
	/** The roster's approval trail for Approval. */
	approval?: ReactNode;
	/** Shows every issue again, from a header's narrowed Issues list. */
	onShowAllIssues: () => void;
	/** On a roster that may be changed: opens Find cover for a short shift, from its Issues row. */
	onFindCover?: (gap: CoverGapRequest) => void;
};

/** One line each, said above the findings in the Issues panel. */
export const issueNoteLines = ({
	roster: { findings, editedDays },
	membersWithChangedStart,
	t,
}: Pick<
	RosterListInput,
	"roster" | "membersWithChangedStart" | "t"
>): Array<string> => [
	...(membersWithChangedStart > 0
		? [
				t("scheduling.startingContext.stale", {
					count: membersWithChangedStart,
				}),
			]
		: []),
	...(findings && editedDays.size > 0
		? [t("scheduling.rosterEdit.findingsOutOfDate")]
		: []),
];

/** The Issues list for one header: its filter as a chip, then exactly what that header counted. */
export const headerIssueSections = (
	about: IssuesAbout,
	{
		roster: { rows, days, names, placed, toDecide, leaveAndCover },
		t,
		language,
		onShowAllIssues,
		onFindCover,
	}: RosterListInput
): Array<RosterSidePanelSection> => {
	const listed = issuesOfHeader(about, {
		placed,
		days,
		daysToDecide: toDecide,
		leaveAndCover,
	});
	const chipLabel =
		about.kind === "date"
			? formatDay(about.date, language)
			: (rows.find((row) => row.membershipId === about.membershipId)?.name ??
				t(`${key}.formerMember`));
	const findingPart = (family: "roster" | "setup"): ReactNode => {
		const part = listed.findings.filter(
			(finding) => findingFamily(finding) === family
		);
		return (
			names &&
			part.length > 0 && (
				<FindingList
					findings={part}
					names={names}
					showDates={about.kind === "member"}
					onFindCover={onFindCover}
				/>
			)
		);
	};
	return [
		{
			key: "about",
			content: (
				<FilterChips
					chips={[
						{ key: about.kind, label: chipLabel, onRemove: onShowAllIssues },
					]}
					onClearAll={onShowAllIssues}
				/>
			),
		},
		{
			key: "roster",
			title: t("scheduling.findings.marker.roster"),
			content: findingPart("roster"),
		},
		{
			key: "setup",
			title: t("scheduling.findings.marker.setup"),
			content: findingPart("setup"),
		},
		{
			key: "daysToDecide",
			title: t(`${key}.daysToDecide`),
			items: daysToDecideItems(listed.daysToDecide, t, language),
		},
		{
			key: "leaveAndCover",
			title: t(`${key}.leaveAndCover`),
			items: leaveAndCoverItems(listed.leaveAndCover, t, language, onFindCover),
		},
	];
};

/** The whole Issues list, or one header's part of it when it was opened from a header. */
export const issuesSections = (
	input: RosterListInput
): Array<RosterSidePanelSection> => {
	const {
		roster: {
			rows,
			days,
			findings,
			names,
			toDecide,
			leaveAndCover,
			issuesAbout,
		},
		assignments,
		t,
		language,
		startingRuns,
		coverOffers,
		onFindCover,
	} = input;
	if (issuesAbout) return headerIssueSections(issuesAbout, input);
	return [
		// Each note is a section of its own, spaced like the sections around it.
		...issueNoteLines(input).map((line) => ({
			key: line,
			items: [{ key: line, lines: [line] }],
		})),
		{
			key: "findings",
			content: findings && names && (
				<FindingsPanel
					findings={findings}
					names={names}
					visibleDays={days}
					onFindCover={onFindCover}
				/>
			),
		},
		{
			key: "daysToDecide",
			title: t(`${key}.daysToDecide`),
			items: daysToDecideItems(toDecide, t, language),
		},
		{
			key: "leaveAndCover",
			title: t(`${key}.leaveAndCover`),
			items: leaveAndCoverItems(leaveAndCover, t, language, onFindCover),
		},
		{
			key: "offersOut",
			content: coverOffers &&
				(coverOffers.failed || coverOffers.offers.length > 0) && (
					<OffersOutSection
						assignments={assignments}
						failed={coverOffers.failed}
						offers={coverOffers.offers}
						target={coverOffers.target}
						timeZone={coverOffers.timeZone}
						onRetry={coverOffers.retry}
					/>
				),
		},
		{
			key: "startingPoints",
			title: t(`${key}.startingPoints`),
			items: startingPointItems(rows, startingRuns, t),
		},
	];
};

/** Changed: the latest hand change, then every changed day. */
export const changesSections = ({
	roster: { changed },
	latestChange,
	t,
	language,
}: RosterListInput): Array<RosterSidePanelSection> => [
	{ key: "latest", content: latestChange },
	{ key: "days", items: changedDayItems(changed, t, language) },
];

/** Details: the schedule's history. */
export const detailsSections = ({
	details,
}: RosterListInput): Array<RosterSidePanelSection> => [
	{
		key: "details",
		content: details && (
			<DescriptionList items={details} valueWidth="sm:w-3/5" />
		),
	},
];

/** Approval: the roster's approval trail. */
export const approvalSections = ({
	approval,
}: RosterListInput): Array<RosterSidePanelSection> => [
	{ key: "trail", content: approval },
];

const LIST_SECTIONS: Record<
	RosterPanel,
	(input: RosterListInput) => Array<RosterSidePanelSection>
> = {
	issues: issuesSections,
	changes: changesSections,
	details: detailsSections,
	approval: approvalSections,
};

/**
 * One side panel list's sections, top to bottom. A section with nothing in
 * it is left out by `RosterSidePanel`, heading and all.
 */
export const rosterListSections = (
	list: RosterPanel,
	input: RosterListInput
): Array<RosterSidePanelSection> => LIST_SECTIONS[list](input);
