import type { FunctionComponent } from "@/common/types";
import type {
	CalendarGridFocusProps,
	IsoDate,
} from "@/components/forms/Calendar/Calendar.constants";
import {
	isPeriodAvailable,
	monthRows,
} from "@/components/forms/Calendar/Calendar.dates";
import { CalendarCell } from "@/components/forms/Calendar/CalendarCell";

export type CalendarMonthViewProps = CalendarGridFocusProps & {
	month: IsoDate;
	language: string;
	selectedDate?: IsoDate | null;
	minDate?: IsoDate;
	maxDate?: IsoDate;
	onNavigate: (month: IsoDate) => void;
	"aria-label"?: string;
	"aria-labelledby"?: string;
};

export const CalendarMonthView = ({
	month,
	language,
	selectedDate,
	minDate,
	maxDate,
	focusedDate,
	focusedCellRef,
	onCellFocus,
	onCellKeyDown,
	onNavigate,
	...label
}: CalendarMonthViewProps): FunctionComponent => (
	<div {...label} className="grid h-63 content-evenly" role="grid">
		{monthRows(month, language).map((row) => (
			<div key={row[0]?.date} className="grid grid-cols-4 gap-3" role="row">
				{row.map((cell) => (
					<CalendarCell
						key={cell.date}
						ref={
							focusedDate?.slice(0, 7) === cell.date.slice(0, 7)
								? focusedCellRef
								: undefined
						}
						aria-label={cell.label}
						selected={selectedDate?.slice(0, 7) === cell.date.slice(0, 7)}
						disabled={
							!isPeriodAvailable(cell.date, "month", { minDate, maxDate })
						}
						tabIndex={
							focusedDate?.slice(0, 7) === cell.date.slice(0, 7) ? 0 : -1
						}
						onKeyDown={onCellKeyDown}
						onClick={() => {
							onNavigate(cell.date);
						}}
						onFocus={() => {
							onCellFocus?.(cell.date);
						}}
					>
						{cell.shortLabel}
					</CalendarCell>
				))}
			</div>
		))}
	</div>
);
