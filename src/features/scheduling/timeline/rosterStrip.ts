import dayjs from "dayjs";
import { ISO_DATE_FORMAT } from "@/common/isoDate";
import type { WeekState } from "@/features/scheduling/months/api";
import type {
	DayRun,
	TimelineSchedule,
} from "@/features/scheduling/timeline/timeline";

/*
 * The status strip under the timeline's dates, pure: which days are
 * published, to review, being generated, failed or have no roster, and the
 * pieces (one schedule's days) behind each run of days.
 */

/** What a day of the strip says: its schedule's state, or NONE where no roster covers it. */
export type StripState = Exclude<WeekState, "NOT_GENERATED"> | "NONE";

/** One schedule's days inside a run, clipped to the days shown. */
export type StripPiece = {
	schedule: TimelineSchedule;
	firstDay: string;
	lastDay: string;
	/** How many day columns the piece spans. */
	span: number;
};

/** Consecutive days in one state and the pieces that hold them; a NONE run has no piece. */
export type StripRun = {
	state: StripState;
	firstDay: string;
	lastDay: string;
	/** How many day columns the run spans. */
	span: number;
	pieces: Array<StripPiece>;
};

/** Every ISO date from the run's first day to its last. */
export const daysOfRun = (run: DayRun): Array<string> => {
	const days: Array<string> = [];
	for (
		let day = dayjs(run.firstDay);
		!day.isAfter(run.lastDay, "day");
		day = day.add(1, "day")
	)
		days.push(day.format(ISO_DATE_FORMAT));
	return days;
};

/**
 * The schedule that holds `day`. Where two cover it, days to review are being
 * generated again (API ADR-0129): the one being generated wins, then a failed
 * one, else the first, as the department card's `stateOfDay` reads a redo.
 */
export const pieceOfDay = (
	schedules: ReadonlyArray<TimelineSchedule>,
	day: string
): TimelineSchedule | undefined => {
	const covering = schedules.filter(
		(schedule) => schedule.firstDay <= day && day <= schedule.lastDay
	);
	return (
		covering.find((schedule) => schedule.status === "GENERATING") ??
		covering.find((schedule) => schedule.status === "FAILED") ??
		covering[0]
	);
};

/** A day's state on the strip: no schedule and a schedule never generated both read as NONE. */
const stripStateOf = (schedule: TimelineSchedule | undefined): StripState =>
	schedule === undefined || schedule.status === "NOT_GENERATED"
		? "NONE"
		: schedule.status;

/**
 * The strip across `days` (consecutive ISO dates): consecutive days in one
 * state are one run, and inside a run each schedule is one piece spanning
 * exactly its days shown.
 */
export const stripRunsOf = (
	schedules: ReadonlyArray<TimelineSchedule>,
	days: ReadonlyArray<string>
): Array<StripRun> => {
	const runs: Array<StripRun> = [];
	for (const day of days) {
		const schedule = pieceOfDay(schedules, day);
		const state = stripStateOf(schedule);
		let run = runs[runs.length - 1];
		if (run?.state !== state) {
			run = { state, firstDay: day, lastDay: day, span: 0, pieces: [] };
			runs.push(run);
		}
		run.lastDay = day;
		run.span += 1;
		if (schedule === undefined || state === "NONE") continue;
		const piece = run.pieces[run.pieces.length - 1];
		if (piece?.schedule.id === schedule.id) {
			piece.lastDay = day;
			piece.span += 1;
		} else run.pieces.push({ schedule, firstDay: day, lastDay: day, span: 1 });
	}
	return runs;
};

/** The pieces to review in the window, in day order, as the strip shows them. */
export const toReviewPiecesOf = (
	schedules: ReadonlyArray<TimelineSchedule>,
	window: DayRun
): Array<StripPiece> =>
	stripRunsOf(schedules, daysOfRun(window))
		.filter((run) => run.state === "TO_REVIEW")
		.flatMap((run) => run.pieces);
