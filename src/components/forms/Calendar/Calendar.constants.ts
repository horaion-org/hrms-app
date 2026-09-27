import type { KeyboardEventHandler, Ref } from "react";

/** A calendar date in YYYY-MM-DD format, without time or timezone. */
export type IsoDate = string;
export type DateRange = { start: IsoDate; end: IsoDate };
export type RangePosition = "start" | "middle" | "end" | "start-end";
export type CalendarView = "days" | "months" | "years";

/** Internal routing shared by the views; the parent owns the roving cell. */
export type CalendarGridFocusProps = {
	focusedDate?: IsoDate;
	focusedCellRef?: Ref<HTMLButtonElement>;
	onCellFocus?: (date: IsoDate) => void;
	onCellKeyDown?: KeyboardEventHandler<HTMLButtonElement>;
};

type SharedProps = {
	minDate?: IsoDate;
	maxDate?: IsoDate;
	isDateDisabled?: (date: IsoDate) => boolean;
	defaultMonth?: IsoDate;
	name?: string;
	className?: string;
	ref?: Ref<HTMLElement>;
	"aria-label"?: string;
	"aria-labelledby"?: string;
};

export type CalendarProps = SharedProps &
	(
		| {
				mode?: "single";
				value?: IsoDate | null;
				defaultValue?: IsoDate | null;
				onChange?: (value: IsoDate) => void;
		  }
		| {
				mode: "range";
				value?: DateRange | null;
				defaultValue?: DateRange | null;
				onChange?: (value: DateRange) => void;
		  }
	);

export const calendarWeekLength = 7;
export const calendarWeekCount = 6;
