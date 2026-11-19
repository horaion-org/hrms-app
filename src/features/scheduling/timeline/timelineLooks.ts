import type { TFunction } from "i18next";
import type { BadgeTone } from "@/components/ui/Badge";
import {
	dayWithoutShiftTileText,
	type RosterCell,
	type RosterDayWithoutShift,
	type RosterShiftCell,
	shiftTimeText,
} from "@/features/scheduling/roster/roster";
import { weekStateTones } from "@/features/scheduling/months/weekStateLooks";
import type { StripState } from "@/features/scheduling/timeline/rosterStrip";
import { stretchHoursMark } from "@/features/scheduling/roster/stretchWords";
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

/** A band of the status strip, coloured as its state's status badge is. */
export const stripBandLooks: Record<BadgeTone, string> = {
	success: "bg-success-100 text-success-900",
	warning: "bg-warning-100 text-neutral-900",
	error: "bg-error-100 text-error-900",
	neutral: "bg-neutral-200 text-neutral-800",
};

/** The tone of a strip state: its week state's own, and neutral where there is no roster. */
export const stripToneOf = (state: StripState): BadgeTone =>
	state === "NONE" ? "neutral" : weekStateTones[state];

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
	/** Whether a day off or rest day shows its short word ("Off", "Rest"), to fit a narrow column. */
	shortDayWords: boolean;
	emptyDay: EmptyDayMark;
	/** A bar names its schedule from this many days wide. */
	barNameFromDays: number;
	/** A bar wears its status badge from this many days wide; never when null. */
	barBadgeFromDays: number | null;
	/** A band of the status strip shows its state word from this many days wide. */
	stripWordFromDays: number;
	/** Whether the Staff cell shows the avatar and the hours, as the roster grid does. */
	staffDetails: boolean;
	/** Whether a day entered by hand wears the word "Entered"; narrower columns leave it to the dotted border and the label. */
	enteredWord: boolean;
	/** The narrowest a day column gets, in pixels; below it the table scrolls sideways. */
	minDayColumnPixels: number;
};

/** Each zoom level's looks. */
export const ZOOM_LOOKS: Record<TimelineView, ZoomLooks> = {
	week: {
		dayHeader: { weekday: "short", date: { day: "numeric", month: "short" } },
		shiftText: "timeOverName",
		shortDayWords: false,
		emptyDay: "noSchedule",
		barNameFromDays: 1,
		barBadgeFromDays: 3,
		stripWordFromDays: 1,
		staffDetails: true,
		enteredWord: true,
		minDayColumnPixels: 92,
	},
	two: {
		dayHeader: { weekday: "short", date: { day: "numeric" } },
		shiftText: "name",
		shortDayWords: true,
		emptyDay: "dash",
		barNameFromDays: 1,
		barBadgeFromDays: 5,
		stripWordFromDays: 2,
		staffDetails: true,
		enteredWord: false,
		minDayColumnPixels: 44,
	},
	four: {
		dayHeader: { weekday: "narrow", date: { day: "numeric" } },
		shiftText: "initial",
		shortDayWords: false,
		emptyDay: "dot",
		barNameFromDays: 3,
		barBadgeFromDays: null,
		stripWordFromDays: 3,
		staffDetails: false,
		enteredWord: false,
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

/** Whether a band `span` days wide has room for its state word in `view`; its full words stay in its name and `title`. */
export const showsStripWord = (view: TimelineView, span: number): boolean =>
	span >= ZOOM_LOOKS[view].stripWordFromDays;

/** The day types with a short word (`scheduling.timeline.grid.short.*`); a day off the API gives no type is a day off. */
const SHORT_DAY_WORDS: Record<string, "dayOff" | "restDay"> = {
	OFF: "dayOff",
	REST: "restDay",
};
const UNTYPED_DAY_OFF = "OFF";

/** A day without a shift in the roster's own word, or its short word where the zoom wants one and it has one. */
const dayWordOf = (
	cell: Exclude<RosterCell, { kind: "shift" }>,
	view: TimelineView,
	t: TFunction
): string => {
	const short =
		ZOOM_LOOKS[view].shortDayWords && cell.kind === "off"
			? SHORT_DAY_WORDS[cell.dayType ?? UNTYPED_DAY_OFF]
			: undefined;
	return short
		? t(`scheduling.timeline.grid.short.${short}`)
		: dayWithoutShiftTileText(cell, t);
};

/** What a tile shows of a day: a shift's name and times, or a day without a shift. A roster's cell, or a day entered by hand. */
export type TileCell =
	| Pick<
			RosterShiftCell,
			"kind" | "name" | "start" | "end" | "workedTimes" | "stretchMinutes"
	  >
	| RosterDayWithoutShift;

/**
 * One line of a tile. A shift's time may break onto two lines, as the roster
 * page's tile does on a phone, so it is never cut; any other line is cut short.
 */
export type TileLine = { text: string; isTime: boolean };

/**
 * The lines a cell's tile shows in `view`: a shift's time over its name (a
 * day stretched into overtime with "+2 h" after its time), its name, or its
 * initial; any other day in the roster's own word (short in two weeks), or
 * its initial.
 */
export const cellLinesOf = (
	cell: TileCell,
	view: TimelineView,
	t: TFunction
): Array<TileLine> => {
	const word = cell.kind === "shift" ? cell.name : dayWordOf(cell, view, t);
	const shown = ZOOM_LOOKS[view].shiftText;
	if (shown === "initial") return [{ text: word.charAt(0), isTime: false }];
	if (shown === "timeOverName" && cell.kind === "shift")
		return [
			{
				text: [shiftTimeText(cell, t), stretchHoursMark(cell.stretchMinutes, t)]
					.filter(Boolean)
					.join(" "),
				isTime: true,
			},
			{ text: cell.name, isTime: false },
		];
	return [{ text: word, isTime: false }];
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
