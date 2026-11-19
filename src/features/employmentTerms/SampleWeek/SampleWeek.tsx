import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { durationShort } from "@/features/employmentTerms/hours";
import type {
	SampleDay,
	SampleDayKind,
	SampleWeek as SampleWeekModel,
} from "@/features/employmentTerms/sampleWeek";

export type SampleWeekProps = {
	/** The week the terms make, Monday first (`sampleWeek`). */
	week: SampleWeekModel;
	className?: string;
};

/** Each kind of day's bar, from the existing tones: normal, half, not working, rest, varies. */
const BAR_CLASSES: Record<SampleDayKind, string> = {
	NORMAL: "bg-ink-blue-700",
	HALF: "bg-ink-blue-100",
	OFF: "bg-neutral-300",
	REST: "bg-success-100",
	VARIES: "bg-ink-blue-100",
};
/** The bar of the longest normal day this draws at full height; shorter days scale to it. */
const FULL_BAR_MINUTES = 720;
/** A day with no hours still shows a sliver, so every day has a bar. */
const MIN_BAR_PERCENT = 8;
const PERCENT = 100;
/** How many letters of a weekday's name the narrow column shows. */
const SHORT_WEEKDAY_LENGTH = 3;
const LEGEND = ["NORMAL", "HALF", "OFF", "REST"] as const;

const barHeight = (minutes: number): string =>
	`${Math.max(MIN_BAR_PERCENT, Math.min(PERCENT, (minutes / FULL_BAR_MINUTES) * PERCENT))}%`;

/**
 * A sample week, the approved design's: seven days, Monday first, each a
 * bar as tall as its hours with what it is under it (its hours, off, rest,
 * or varies), and a key. A rest day the roster picks is marked with an
 * asterisk, as only an example. Drawn from `sampleWeek`, never from figures
 * of its own.
 */
export const SampleWeek = ({
	week,
	className,
}: SampleWeekProps): FunctionComponent => {
	const { t } = useTranslation();
	const key = "employmentTerms.sampleWeek";
	const label = (day: SampleDay): string => {
		if (day.kind === "OFF") return t(`${key}.off`);
		if (day.kind === "VARIES") return t(`${key}.varies`);
		if (day.kind === "REST")
			return week.restIsExample ? t(`${key}.restExample`) : t(`${key}.rest`);
		return durationShort(day.minutes, t);
	};
	return (
		<div className={joinClassNames("flex flex-col gap-3", className)}>
			<ol aria-label={t(`${key}.title`)} className="grid grid-cols-7 gap-1">
				{week.days.map((day) => {
					const weekday = t(`weekdays.${day.weekday}`);
					return (
						<li
							key={day.weekday}
							className="flex flex-col items-center gap-1 text-xs"
						>
							<span className="text-neutral-800">{label(day)}</span>
							<span
								aria-hidden
								className="flex h-18 w-full items-end justify-center"
							>
								<span
									style={{ height: barHeight(day.minutes) }}
									className={joinClassNames(
										"w-full max-w-8 rounded-sm",
										BAR_CLASSES[day.kind]
									)}
								/>
							</span>
							<span className="font-semibold text-neutral-900">
								<span aria-hidden>
									{weekday.slice(0, SHORT_WEEKDAY_LENGTH)}
								</span>
								<span className="sr-only">{weekday}</span>
							</span>
						</li>
					);
				})}
			</ol>
			<ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-800">
				{LEGEND.map((kind) => (
					<li key={kind} className="flex items-center gap-1">
						<span
							aria-hidden
							className={joinClassNames("size-3 rounded-sm", BAR_CLASSES[kind])}
						/>
						{t(`${key}.legend.${kind}`)}
					</li>
				))}
			</ul>
		</div>
	);
};
