import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import {
	dayWithoutShiftPlainText,
	dayWithoutShiftTileText,
	shiftTimeText,
} from "@/features/scheduling/roster/roster";
import { dayBeforeLooks } from "@/features/scheduling/roster/rosterLooks";
import type {
	DayBeforeRun,
	DayBeforeWhat,
} from "@/features/scheduling/startingContext/daysBeforeRun";

export type RosterDayBeforeProps = {
	/** The person's known day before the run; none when it is not known. */
	day?: DayBeforeRun;
	/** Whose day, as the row names them. */
	name: string;
	/** Which day, in full, e.g. "Tuesday, 13 October". */
	dayName: string;
	/** Beside an open panel: as tall as a compact tile. */
	compact?: boolean;
};

const key = "scheduling.startingContext.shown";

/** The day as its label says it: a shift by name and time, a day off in plain words. */
const dayWords = (what: DayBeforeWhat, t: TFunction): string =>
	what.kind === "shift"
		? `${what.name} ${shiftTimeText(what, t)}`
		: dayWithoutShiftPlainText(what, t);

/** The tile's label: whose day, which day, what, and where it came from. */
const labelOf = (
	{ day, name, dayName }: RosterDayBeforeProps,
	t: TFunction
): string => {
	if (!day) return t(`${key}.notKnownLabel`, { name, day: dayName });
	if (day.enteredByHand)
		return t(`${key}.cellLabel`, {
			name,
			day: dayName,
			shift: dayWords(day.what, t),
		});
	if (day.what.kind === "leave")
		return t(`${key}.leaveLabel`, { name, day: dayName });
	return t(`${key}.rosteredLabel`, {
		name,
		day: dayName,
		what: dayWords(day.what, t),
	});
};

/**
 * A person's day before the run, in a roster's column before its first
 * day: read-only, never a button. A shift by its time over its name, the
 * time never cut, a day off or leave in the roster's own words; a day
 * entered by hand in the dotted entered look with the word "Entered"; a day
 * not known blank. Beside an open panel a shift shows its time alone. Its
 * full words are its `title` and hidden label.
 */
export const RosterDayBefore = (
	props: RosterDayBeforeProps
): FunctionComponent => {
	const { day, compact = false } = props;
	const { t } = useTranslation();
	const label = labelOf(props, t);
	return (
		<span
			title={label}
			className={joinClassNames(
				"relative flex w-full min-w-0 flex-col items-center justify-center overflow-hidden rounded text-center text-xs font-medium",
				// Grows to fit a time on two lines; beside an open panel, as tall as a compact shift tile.
				compact ? "h-10 px-1.5" : "min-h-14 px-1 py-1",
				day &&
					joinClassNames(
						"border",
						dayBeforeLooks[day.enteredByHand ? "enteredByHand" : "known"]
					)
			)}
		>
			{day && (
				<span aria-hidden="true" className="flex max-w-full flex-col">
					{day.what.kind === "shift" ? (
						<>
							{/* Never cut: it breaks onto two lines in a narrow column, as a shift tile's time does. */}
							<span className="block text-balance tabular-nums">
								{shiftTimeText(day.what, t)}
							</span>
							{!compact && <span className="truncate">{day.what.name}</span>}
						</>
					) : (
						<span className="truncate">
							{dayWithoutShiftTileText(day.what, t)}
						</span>
					)}
					{/* Beside an open panel the dotted border and the label say it, as the timeline's narrow zooms do. */}
					{day.enteredByHand && !compact && (
						<span className="truncate text-[0.625rem] leading-3 font-normal">
							{t(`${key}.mark`)}
						</span>
					)}
				</span>
			)}
			<span className="sr-only">{label}</span>
		</span>
	);
};
