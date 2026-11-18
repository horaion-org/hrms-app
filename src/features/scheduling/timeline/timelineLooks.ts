import type { TFunction } from "i18next";
import type { BadgeTone } from "@/components/ui/Badge";
import {
	dayWithoutShiftTileText,
	type RosterCell,
	shiftTimeText,
} from "@/features/scheduling/roster/roster";
import type { TimelineView } from "@/features/scheduling/timeline/timeline";

/*
 * How the timeline looks at each zoom level, pure: each level shows only what
 * fits its day columns. Every cell and bar keeps its full words in its
 * accessible name and `title`, so nothing is lost when the text is short.
 */

/**
 * The Staff column of the timeline's table, as the roster grid's: the bar
 * lanes' label and each person. It stays in view while the days scroll.
 */
export const staffCellClasses =
	"sticky left-0 z-10 bg-neutral-50 px-3 py-2 text-left";

/** The Staff column's width, as the roster grid's: narrower on a phone. Read by the table's minimum width. */
export const staffColumnClasses =
	"[--staff-column:7rem] sm:[--staff-column:12.5rem]";

/** A schedule's status dot, coloured as its status badge is. */
export const statusDotLooks: Record<BadgeTone, string> = {
	success: "bg-success-700",
	warning: "bg-warning-700",
	error: "bg-error-700",
	neutral: "bg-neutral-500",
};

/** What a day with no schedule shows: words, an en dash or a middle dot (`scheduling.timeline.grid.emptyDay.*`). */
export type EmptyDayMark = "noSchedule" | "dash" | "dot";

/** What one zoom level shows. */
export type ZoomLooks = {
	/** The day header's two lines: the weekday, then the date. */
	dayHeader: {
		weekday: Intl.DateTimeFormatOptions["weekday"];
		date: Intl.DateTimeFormatOptions;
	};
	/** A shift tile: its time over its name, its name, or its initial. */
	shiftText: "timeOverName" | "name" | "initial";
	emptyDay: EmptyDayMark;
	/** A bar names its schedule from this many days wide. */
	barNameFromDays: number;
	/** A bar wears its status badge from this many days wide; never when null. */
	barBadgeFromDays: number | null;
	/** Whether the Staff cell shows the avatar and the hours, as the roster grid does. */
	staffDetails: boolean;
	/** The narrowest a day column gets, in pixels; below it the table scrolls sideways. */
	minDayColumnPixels: number;
};

/** Each zoom level's looks. */
export const ZOOM_LOOKS: Record<TimelineView, ZoomLooks> = {
	week: {
		dayHeader: { weekday: "short", date: { day: "numeric", month: "short" } },
		shiftText: "timeOverName",
		emptyDay: "noSchedule",
		barNameFromDays: 1,
		barBadgeFromDays: 3,
		staffDetails: true,
		minDayColumnPixels: 92,
	},
	two: {
		dayHeader: { weekday: "short", date: { day: "numeric" } },
		shiftText: "name",
		emptyDay: "dash",
		barNameFromDays: 1,
		barBadgeFromDays: 5,
		staffDetails: true,
		minDayColumnPixels: 44,
	},
	four: {
		dayHeader: { weekday: "narrow", date: { day: "numeric" } },
		shiftText: "initial",
		emptyDay: "dot",
		barNameFromDays: 3,
		barBadgeFromDays: null,
		staffDetails: false,
		minDayColumnPixels: 26,
	},
};

/** What a bar `span` days wide shows in `view` besides its dot. */
export const barContentOf = (
	view: TimelineView,
	span: number
): { showsName: boolean; showsBadge: boolean } => {
	const looks = ZOOM_LOOKS[view];
	return {
		showsName: span >= looks.barNameFromDays,
		showsBadge:
			looks.barBadgeFromDays !== null && span >= looks.barBadgeFromDays,
	};
};

/**
 * The lines a cell's tile shows in `view`: a shift's time over its name, its
 * name, or its initial; any other day in the roster's own word, or its initial.
 */
export const cellLinesOf = (
	cell: RosterCell,
	view: TimelineView,
	t: TFunction
): Array<string> => {
	const word =
		cell.kind === "shift" ? cell.name : dayWithoutShiftTileText(cell, t);
	const shown = ZOOM_LOOKS[view].shiftText;
	if (shown === "initial") return [word.charAt(0)];
	if (shown === "timeOverName" && cell.kind === "shift")
		return [shiftTimeText(cell, t), cell.name];
	return [word];
};

/** A day as cell and bar labels name it, e.g. "Mon, Nov 23". */
export const LABEL_DAY_FORMAT: Intl.DateTimeFormatOptions = {
	weekday: "short",
	day: "numeric",
	month: "short",
};

/** The table's minimum width: the Staff column and each day at its narrowest, so narrow screens scroll, not squeeze. */
export const tableMinWidthOf = (view: TimelineView, dayCount: number): string =>
	`calc(var(--staff-column) + ${dayCount * ZOOM_LOOKS[view].minDayColumnPixels}px)`;
