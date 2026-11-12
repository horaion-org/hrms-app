import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { daysOf } from "@/common/weeks";
import type { MonthWeek } from "@/features/scheduling/months/api";
import { dayMarkLooks } from "@/features/scheduling/months/weekStateLooks";

export type DayCoverMarksProps = {
	/** Seven days, Monday first; empty when the week has no roster. */
	days: MonthWeek["days"];
	className?: string;
};

/** A Monday to name the weekdays by when the week has no roster to give dates. */
const ANY_MONDAY = "2024-01-01";

type MarkLook = keyof typeof dayMarkLooks;

/** What each mark reads aloud. */
const labelKeys = {
	covered: "scheduling.months.cover.dayCovered",
	short: "scheduling.months.cover.dayShort",
	noRoster: "scheduling.months.cover.dayNoRoster",
} as const satisfies Record<MarkLook, string>;

/** A day without a roster entry has no roster; otherwise it is short or covered. */
const lookOf = (day: MonthWeek["days"][number] | undefined): MarkLook => {
	if (day === undefined) return "noRoster";
	return day.shortShifts > 0 ? "short" : "covered";
};

/** One small mark per day of a week, each under its weekday's letter, read aloud as one sentence. */
export const DayCoverMarks = ({
	days,
	className,
}: DayCoverMarksProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	const letter = new Intl.DateTimeFormat(language, { weekday: "narrow" });
	const name = new Intl.DateTimeFormat(language, { weekday: "long" });
	const dates = daysOf(ANY_MONDAY);

	const marks = dates.map((anyDate, index) => {
		const day = days[index];
		const weekday = new Date(`${day?.date ?? anyDate}T00:00:00`);
		const look = lookOf(day);
		const label = t(labelKeys[look], {
			day: name.format(weekday),
			count: day?.shortShifts,
		});
		return { key: anyDate, letter: letter.format(weekday), look, label };
	});

	return (
		<div
			aria-label={marks.map((mark) => mark.label).join(", ")}
			className={joinClassNames("grid grid-cols-7 gap-1", className)}
			role="img"
		>
			{marks.map((mark) => (
				<span
					key={mark.key}
					aria-hidden="true"
					className="flex flex-col items-center gap-1 text-xs text-neutral-700"
				>
					{mark.letter}
					<span className={dayMarkLooks[mark.look]} />
				</span>
			))}
		</div>
	);
};
