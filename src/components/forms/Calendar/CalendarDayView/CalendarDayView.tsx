import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { joinClassNames } from "@/common/joinClassNames";
import type {
	CalendarGridFocusProps,
	DateRange,
	IsoDate,
} from "@/components/forms/Calendar/Calendar.constants";
import {
	dayWeeks,
	rangePosition,
	weekdayLabels,
} from "@/components/forms/Calendar/Calendar.dates";
import { CalendarCell } from "@/components/forms/Calendar/CalendarCell";

export type CalendarDayViewProps = CalendarGridFocusProps & {
	month: IsoDate;
	today: IsoDate;
	language: string;
	selectedDate?: IsoDate | null;
	range?: DateRange | null;
	draftStart?: IsoDate | null;
	isDateDisabled?: (date: IsoDate) => boolean;
	onPreview?: (date: IsoDate | null) => void;
	onSelect?: (date: IsoDate) => void;
	"aria-label"?: string;
	"aria-labelledby"?: string;
};

export const CalendarDayView = ({
	month,
	today,
	language,
	selectedDate,
	range,
	draftStart,
	isDateDisabled,
	focusedDate,
	focusedCellRef,
	onCellFocus,
	onCellKeyDown,
	onPreview,
	onSelect,
	...label
}: CalendarDayViewProps): FunctionComponent => {
	const { t } = useTranslation();
	const draftOnly = Boolean(draftStart && range?.start === range?.end);
	return (
		<div
			{...label}
			aria-multiselectable={range !== undefined || undefined}
			role="grid"
			onMouseLeave={(event) => {
				onPreview?.(
					event.currentTarget.contains(
						event.currentTarget.ownerDocument.activeElement
					)
						? (focusedDate ?? null)
						: null
				);
			}}
		>
			<div className="grid grid-cols-7" role="row">
				{weekdayLabels(language).map((weekday) => (
					<div
						key={weekday.label}
						aria-label={weekday.label}
						role="columnheader"
						className={joinClassNames(
							"flex h-9 items-center justify-center text-xs",
							weekday.weekend ? "text-ink-blue-500" : "text-neutral-900"
						)}
					>
						{weekday.shortLabel}
					</div>
				))}
			</div>
			{dayWeeks(month, language).map((week) => (
				<div key={week[0]?.date} className="grid grid-cols-7" role="row">
					{week.map((day) => {
						const position = rangePosition(day.date, range);
						const description = position
							? draftStart
								? position === "start-end"
									? "calendar.range.draftStart"
									: (`calendar.range.preview.${position}` as const)
								: (`calendar.range.${position}` as const)
							: undefined;
						return (
							<CalendarCell
								key={day.date}
								ref={day.date === focusedDate ? focusedCellRef : undefined}
								aria-label={day.label}
								disabled={isDateDisabled?.(day.date)}
								outsideMonth={day.outsideMonth}
								rangePosition={draftOnly && position ? "start" : position}
								rangePreview={Boolean(draftStart && position)}
								tabIndex={day.date === focusedDate ? 0 : -1}
								today={day.date === today}
								weekend={day.weekend}
								aria-description={
									description ? t(description, { lng: language }) : undefined
								}
								selected={
									draftStart
										? day.date === draftStart
										: Boolean(position) || day.date === selectedDate
								}
								onKeyDown={onCellKeyDown}
								onClick={() => {
									onSelect?.(day.date);
								}}
								onFocus={() => {
									onCellFocus?.(day.date);
									onPreview?.(day.date);
								}}
								onMouseEnter={() => {
									onPreview?.(day.date);
								}}
							>
								{day.day}
							</CalendarCell>
						);
					})}
				</div>
			))}
		</div>
	);
};
