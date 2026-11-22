import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { weeksOf } from "@/common/weeks";
import { isoDateIn, type RosterRow } from "@/features/scheduling/roster/roster";
import type { IssuesAbout } from "@/features/scheduling/roster/rosterMarks";
import type { CoverGapRequest } from "@/features/scheduling/cover/api";
import {
	coverParameter,
	type RosterPanel,
	type RosterSearch,
} from "@/features/scheduling/roster/rosterSearch";
import {
	rosterViewOf,
	type RosterView,
	type RosterViewInput,
} from "@/features/scheduling/roster/rosterView";
import type { RosterWeek } from "@/features/scheduling/roster/RosterWeekBar";
import { withWeeksBeforeRun } from "@/features/scheduling/roster/weeksBeforeRun";
import { rosterCellKey } from "@/features/scheduling/rosterChanges/rosterEdit";

const NO_DAYS: ReadonlySet<string> = new Set();

/** What has focus now, to give it back when a panel opened from it closes. */
const focusedElement = (): HTMLElement | null =>
	document.activeElement instanceof HTMLElement ? document.activeElement : null;

/** The `rosterCellKey` of a row's day; none once its member no longer resolves. */
const cellOf = (row: RosterRow, day: string): string | undefined =>
	row.membershipId === null ? undefined : rosterCellKey(row.membershipId, day);

/** The Department's weeks of the schedule's month, for the week bar to step through, and where choosing one goes. */
export type DepartmentWeeks = {
	weeks: Array<RosterWeek>;
	onWeekChange: (week: string) => void;
};

/** What the roster's view is worked out from, and where it writes a new view. */
export type RosterViewOptions = Omit<
	RosterViewInput,
	"today" | "monthWeeks"
> & {
	/** Changes the view; the page writes it back to its URL. */
	onViewChange: (view: RosterSearch) => void;
	/** The month's weeks for the bar; without them it pages the schedule's own weeks. */
	departmentWeeks?: DepartmentWeeks;
};

/** The roster's view, the days a change being previewed touches, and the ways to change what is shown. */
export type RosterViewState = RosterView & {
	/** Today in the schedule's time zone. */
	today: string;
	/** The `rosterCellKey`s of the days the day editor's change would touch. */
	previewDays: ReadonlySet<string>;
	onPreviewDays: (keys: ReadonlyArray<string>) => void;
	/** Opens `next` beside the grid; focus goes back to `from` when it closes. */
	open: (
		next: Omit<RosterSearch, "week" | "day">,
		from?: HTMLElement | null
	) => void;
	/** Closes the panel beside the grid and gives focus back to what opened it. */
	close: () => void;
	/** Closes the open list, or opens `panel`; Issues opened from a header shows all of Issues instead. */
	toggleList: (panel: RosterPanel, from: HTMLElement) => void;
	/** Shows every issue again, keeping where focus goes back to. */
	showAllIssues: () => void;
	/** Opens a member's day: its editor, or its shift when read-only. */
	openDay: (row: RosterRow, day: string) => void;
	/** Opens Issues on a short shift-day's row, its options shown, in place of what the panel shows. */
	openCover: (gap: CoverGapRequest) => void;
	/** Opens Issues for one row or day header. */
	showIssuesOf: (about: IssuesAbout, from: HTMLElement) => void;
	/** Shows another week, or this week when none is given. */
	showWeek: (week: string | undefined) => void;
	/** The weeks the bar steps through: the month's with the weeks shown before the run, else the schedule's own. */
	barWeeks: Array<RosterWeek>;
	/** A week chosen in the bar: shown here when it is the schedule's own or one before the run, else opened as the month's. */
	chooseWeek: (week: string) => void;
	/** Shows another day on a phone. */
	showDay: (day: string) => void;
};

/**
 * The roster's view and how it changes. The view is worked out on every
 * render (`rosterViewOf`) from the rows and the URL's view; this hook adds
 * today's date in the schedule's zone, the days a previewed change
 * touches, what to give focus back to, and the URL writes.
 */
export const useRosterView = ({
	onViewChange,
	departmentWeeks,
	...input
}: RosterViewOptions): RosterViewState => {
	const { t } = useTranslation();
	const { view, schedule } = input;
	const [previewDays, setPreviewDays] = useState<ReadonlySet<string>>(NO_DAYS);
	// Where focus goes back to when the panel closes: what opened it.
	const opener = useRef<HTMLElement | null>(null);
	// Stable, as the day editor pushes its preview's days through it from an effect.
	const onPreviewDays = useCallback(
		(keys: ReadonlyArray<string>) => {
			setPreviewDays(keys.length === 0 ? NO_DAYS : new Set(keys));
		},
		[setPreviewDays]
	);
	// "This week" and "today" follow the branch's time zone, not the browser's.
	const today = isoDateIn(schedule.timeZone, new Date());
	const roster = rosterViewOf({
		...input,
		today,
		monthWeeks: departmentWeeks?.weeks,
	});
	const ownWeeks = weeksOf(roster.period).map((week) => week.start);
	const showWeek = (week: string | undefined): void => {
		onViewChange({ ...view, week, day: undefined });
	};

	/** Shows `next` beside the grid, keeping the week and day shown. */
	const showView = (next: Omit<RosterSearch, "week" | "day">): void => {
		onViewChange({
			...(view.week ? { week: view.week } : {}),
			...(view.day ? { day: view.day } : {}),
			...next,
		});
	};
	const open: RosterViewState["open"] = (next, from = focusedElement()) => {
		opener.current = from;
		setPreviewDays(NO_DAYS);
		showView(next);
	};
	const close = (): void => {
		setPreviewDays(NO_DAYS);
		showView({});
		opener.current?.focus();
	};
	return {
		...roster,
		today,
		previewDays,
		onPreviewDays,
		open,
		close,
		toggleList: (panel, from): void => {
			if (roster.openList === panel && !roster.issuesAbout) close();
			else open({ panel }, from);
		},
		showAllIssues: (): void => {
			showView({ panel: "issues" });
		},
		openDay: (row, day): void => {
			const cell = cellOf(row, day);
			if (cell) open({ cell });
		},
		openCover: (gap): void => {
			open({ panel: "issues", cover: coverParameter(gap) });
		},
		showIssuesOf: (about, from): void => {
			open(
				about.kind === "member"
					? { panel: "issues", member: about.membershipId }
					: { panel: "issues", date: about.date },
				from
			);
		},
		showWeek,
		barWeeks: departmentWeeks
			? withWeeksBeforeRun(
					departmentWeeks.weeks,
					roster.mondaysBeforeRun,
					t("scheduling.detail.beforeRunWeek")
				)
			: weeksOf(roster.period),
		chooseWeek: (week): void => {
			const shownHere =
				ownWeeks.includes(week) || roster.mondaysBeforeRun.includes(week);
			if (departmentWeeks && !shownHere) departmentWeeks.onWeekChange(week);
			else showWeek(week);
		},
		showDay: (day): void => {
			onViewChange({
				...view,
				day: day === roster.defaultDay ? undefined : day,
			});
		},
	};
};
