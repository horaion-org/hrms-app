import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/Icon";

export type WeekNavigatorProps = {
	/** The shown week's Monday, "YYYY-MM-DD". */
	week: string;
	/** The Monday of the week today is in, where "This week" goes. */
	currentWeek: string;
	onWeekChange: (week: string) => void;
	/** The earliest Monday that may be shown; "Previous week" stops there. Any week when left out. */
	earliestWeek?: string;
	className?: string;
};

/** `formatRange` is ES2021, past the ES2020 lib this project compiles against. */
type RangeFormat = Intl.DateTimeFormat & {
	formatRange: (start: Date, end: Date) => string;
};

const isoFormat = "YYYY-MM-DD";

/** The Monday `by` weeks from `week`. */
const weekFrom = (week: string, by: number): string =>
	dayjs(week).add(by, "week").format(isoFormat);

/** Monday to Sunday in the person's language, e.g. "Mon, 9 Nov – Sun, 15 Nov 2026". */
const formatWeek = (week: string, language: string): string =>
	(
		new Intl.DateTimeFormat(language, {
			weekday: "short",
			day: "numeric",
			month: "short",
			year: "numeric",
		}) as RangeFormat
	).formatRange(dayjs(week).toDate(), dayjs(week).add(6, "day").toDate());

/**
 * Moves between calendar weeks one at a time, back to this week, and says
 * which week is shown; styled as the roster's week bar. The caller owns the
 * week, e.g. in the URL.
 */
export const WeekNavigator = ({
	week,
	currentWeek,
	onWeekChange,
	earliestWeek,
	className,
}: WeekNavigatorProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	const atEarliest = earliestWeek !== undefined && week <= earliestWeek;
	return (
		<div
			aria-label={t("weekNavigator.label")}
			className={joinClassNames("flex flex-wrap items-center gap-3", className)}
			role="group"
		>
			<Button
				size="sm"
				variant="secondary"
				onClick={() => {
					onWeekChange(currentWeek);
				}}
			>
				{t("weekNavigator.thisWeek")}
			</Button>
			<Button
				aria-label={t("weekNavigator.previous")}
				className="size-12! rounded-full! border border-neutral-500"
				disabled={atEarliest}
				variant="icon"
				onClick={() => {
					onWeekChange(weekFrom(week, -1));
				}}
			>
				<ChevronLeftIcon />
			</Button>
			<Button
				aria-label={t("weekNavigator.next")}
				className="size-12! rounded-full! border border-neutral-500"
				variant="icon"
				onClick={() => {
					onWeekChange(weekFrom(week, 1));
				}}
			>
				<ChevronRightIcon />
			</Button>
			<p
				aria-live="polite"
				className="min-w-0 text-sm font-semibold text-neutral-900"
			>
				{formatWeek(week, language)}
			</p>
		</div>
	);
};
