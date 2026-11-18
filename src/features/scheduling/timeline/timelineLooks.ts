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

/** The Staff column of the timeline's table, as the roster grid's: the bar lanes' label and each person. */
export const staffCellClasses = "bg-neutral-50 px-3 py-2 text-left";

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
	},
	two: {
		dayHeader: { weekday: "short", date: { day: "numeric" } },
		shiftText: "name",
		emptyDay: "dash",
		barNameFromDays: 1,
		barBadgeFromDays: 5,
		staffDetails: true,
	},
	four: {
		dayHeader: { weekday: "narrow", date: { day: "numeric" } },
		shiftText: "initial",
		emptyDay: "dot",
		barNameFromDays: 3,
		barBadgeFromDays: null,
		staffDetails: false,
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
