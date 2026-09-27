import type { FunctionComponent } from "@/common/types";
import type {
	CalendarGridFocusProps,
	IsoDate,
} from "@/components/forms/Calendar/Calendar.constants";
import {
	isPeriodAvailable,
	yearRows,
} from "@/components/forms/Calendar/Calendar.dates";
import { CalendarCell } from "@/components/forms/Calendar/CalendarCell";

export type CalendarYearViewProps = CalendarGridFocusProps & {
	month: IsoDate;
	language: string;
	selectedDate?: IsoDate | null;
	minDate?: IsoDate;
	maxDate?: IsoDate;
	onNavigate: (year: IsoDate) => void;
	"aria-label"?: string;
	"aria-labelledby"?: string;
};

export const CalendarYearView = ({
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
}: CalendarYearViewProps): FunctionComponent => (
	<div {...label} className="grid h-63 content-evenly" role="grid">
		{yearRows(month, language).map((row) => (
			<div key={row[0]?.date} className="grid grid-cols-4 gap-3" role="row">
				{row.map((cell) => (
					<CalendarCell
						key={cell.date}
						ref={
							focusedDate?.slice(0, 4) === cell.date.slice(0, 4)
								? focusedCellRef
								: undefined
						}
						aria-label={cell.label}
						selected={selectedDate?.slice(0, 4) === cell.date.slice(0, 4)}
						disabled={
							!isPeriodAvailable(cell.date, "year", { minDate, maxDate })
						}
						tabIndex={
							focusedDate?.slice(0, 4) === cell.date.slice(0, 4) ? 0 : -1
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
