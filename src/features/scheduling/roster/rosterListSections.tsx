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
import { FindingList } from "@/features/scheduling/roster/FindingList";
import { formatDay } from "@/common/formatDay";
import { findingFamily } from "@/features/scheduling/roster/findings/finding";
import {
	issuesOfHeader,
	type IssuesAbout,
} from "@/features/scheduling/roster/rosterMarks";
import { ChangeTimeline } from "@/features/scheduling/roster/ChangeTimeline";
import { changeTimeline } from "@/features/scheduling/roster/changeTimeline";
import {
	daysToDecideItems,
	leaveAndCoverItems,
} from "@/features/scheduling/roster/rosterPanels";
import {
	issueTopic,
	type IssueNote,
	type RosterIssue,
} from "@/features/scheduling/roster/rosterIssueGroups";
import type { IssueFixing } from "@/features/scheduling/roster/RosterIssueGroups";
import {
	FixableRosterIssuesList,
	RosterIssuesList,
	type IssueCoverContext,
} from "@/features/scheduling/roster/IssuesPanel";
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
	/** Whether the rules check is offered here; its line then says how the list stands. */
	validating?: boolean;
	/** Every Issues item by what to do (`issuesOfRoster`). */
	issues: ReadonlyArray<RosterIssue>;
	/** Scrolls an item's cell into view and outlines it. */
	onShowIssue?: (issue: RosterIssue) => void;
	/** Shows every issue again, from a header's narrowed Issues list. */
	onShowAllIssues: () => void;
	/** On a roster that may be changed: opens Find cover for a short shift, from its Issues row. */
	onFindCover?: (gap: CoverGapRequest) => void;
	/** On a roster that may be changed: what the fixes Issues makes itself need (`FixableIssueGroups`). */
	issueFixing?: IssueFixing;
	/** On a roster that may be changed: what covering a short shift from its Issues row needs. */
	issueCover?: IssueCoverContext;
	/** The short shift "Find cover" opened Issues on: its row starts open. */
	issueCoverGap?: CoverGapRequest;
};

/**
 * The notes about the whole list, each a row under More information: that
 * the days before this week changed, and that the notes are from
 * generation, said only where Validate schedule is not there to say how
 * the list stands (it would contradict "Validated").
 */
export const issueNoteLines = ({
	roster: { findings, editedDays },
	membersWithChangedStart,
	validating,
	t,
}: Pick<
	RosterListInput,
	"roster" | "membersWithChangedStart" | "validating" | "t"
>): Array<IssueNote> => [
	...(membersWithChangedStart > 0
		? [
				{
					title: t("scheduling.issues.startChanged.title", {
						count: membersWithChangedStart,
					}),
					detail: t("scheduling.issues.startChanged.detail"),
					topic: issueTopic("startChanged", t),
				},
			]
		: []),
	...(findings && editedDays.size > 0 && !validating
		? [
				{
					title: t("scheduling.issues.fromGeneration.title"),
					detail: t("scheduling.issues.fromGeneration.detail"),
					topic: issueTopic("fromGeneration", t),
				},
			]
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

/**
 * The whole Issues list, one row per issue (`RosterIssuesList`), the cover
 * offers out under it; or one header's part of it when it was opened from a
 * header. The rules check's line is the panel's summary, not a section.
 */
export const issuesSections = (
	input: RosterListInput
): Array<RosterSidePanelSection> => {
	const {
		roster: { issuesAbout },
		assignments,
		coverOffers,
		issues,
		onShowIssue,
		issueFixing,
		issueCover,
		issueCoverGap,
	} = input;
	if (issuesAbout) return headerIssueSections(issuesAbout, input);
	/** A shift's name by its id, as the roster's own days name it. */
	const shiftName = (shiftId: string): string =>
		assignments.find((row) => row.shift?.shiftId === shiftId)?.shift?.name ??
		"";
	const list = {
		issues,
		shiftName,
		information: coverOffers &&
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
		cover: issueCover,
		openGap: issueCoverGap,
		onShow: onShowIssue,
	};
	return [
		{
			key: "issues",
			content: issueFixing ? (
				<FixableRosterIssuesList {...list} fixing={issueFixing} />
			) : (
				<RosterIssuesList {...list} />
			),
		},
	];
};

/** Changed: the latest hand change (with its Undo), then the timeline of every changed day. */
export const changesSections = ({
	roster: { changed },
	latestChange,
	t,
	language,
}: RosterListInput): Array<RosterSidePanelSection> => {
	const timeline = changeTimeline(changed, t, language);
	return [
		{ key: "latest", content: latestChange },
		{
			key: "days",
			content: timeline.length > 0 && <ChangeTimeline days={timeline} />,
		},
	];
};

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
