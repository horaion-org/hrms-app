import {
	useEffect,
	useImperativeHandle,
	useLayoutEffect,
	useRef,
	useState,
	type KeyboardEvent,
} from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { joinClassNames } from "@/common/joinClassNames";
import type {
	CalendarProps,
	CalendarView,
	DateRange,
	IsoDate,
} from "@/components/forms/Calendar/Calendar.constants";
import {
	dateRange,
	focusInPeriod,
	initialFocusDate,
	isDayDisabled,
	isPeriodAvailable,
	isSamePeriod,
	keyboardDate,
	monthTitle,
	pageMonth,
	pageYear,
	pageYearBlock,
	todayDate,
	yearBlockTitle,
	yearTitle,
} from "@/components/forms/Calendar/Calendar.dates";
import { CalendarHeader } from "@/components/forms/Calendar/CalendarHeader";
import { CalendarDayView } from "@/components/forms/Calendar/CalendarDayView";
import { CalendarMonthView } from "@/components/forms/Calendar/CalendarMonthView";
import { CalendarYearView } from "@/components/forms/Calendar/CalendarYearView";

export const Calendar = ({
	ref,
	...props
}: CalendarProps): FunctionComponent => {
	const { i18n, t } = useTranslation();
	const panelRef = useRef<HTMLDivElement>(null);
	const [today] = useState(() => todayDate(Date.now()));
	// Selection and navigation are independent: paging never changes the value.
	const [uncontrolledDate, setUncontrolledDate] = useState<IsoDate | null>(
		() => (props.mode === "range" ? null : (props.defaultValue ?? null))
	);
	const selectedDate =
		props.mode === "range"
			? null
			: props.value !== undefined
				? props.value
				: uncontrolledDate;
	const [uncontrolledRange, setUncontrolledRange] = useState<DateRange | null>(
		() => (props.mode === "range" ? (props.defaultValue ?? null) : null)
	);
	const selectedRange =
		props.mode !== "range"
			? null
			: props.value !== undefined
				? props.value
				: uncontrolledRange;
	const [draftStart, setDraftStart] = useState<IsoDate | null>(null);
	const [previewDate, setPreviewDate] = useState<IsoDate | null>(null);
	const controlledRange = props.mode === "range" ? props.value : undefined;
	const controlledRangeKey = controlledRange
		? `${controlledRange.start}/${controlledRange.end}`
		: controlledRange;
	const [previousRangeKey, setPreviousRangeKey] = useState(controlledRangeKey);
	// Compare endpoints, not object identity: ordinary parent renders keep drafts.
	// Synchronize before committing so external values also replace form fields.
	if (previousRangeKey !== controlledRangeKey) {
		setPreviousRangeKey(controlledRangeKey);
		setDraftStart(null);
		setPreviewDate(null);
	}
	const displayedRange = draftStart
		? dateRange(draftStart, previewDate ?? draftStart)
		: selectedRange;
	const [visibleMonth, setVisibleMonth] = useState(
		() => selectedDate ?? selectedRange?.start ?? props.defaultMonth ?? today
	);
	const language = i18n.resolvedLanguage ?? i18n.language ?? "en";
	const [focusedDate, setFocusedDate] = useState(() =>
		initialFocusDate(visibleMonth, selectedDate ?? selectedRange?.start, today)
	);
	const [view, setView] = useState<CalendarView>("days");
	const pagePeriod =
		view === "days" ? "month" : view === "months" ? "year" : "year-block";
	const adjacentMonth = (direction: -1 | 1): IsoDate =>
		view === "days"
			? pageMonth(visibleMonth, direction)
			: view === "months"
				? pageYear(visibleMonth, direction)
				: pageYearBlock(visibleMonth, direction);
	const canPage = (direction: -1 | 1): boolean =>
		isPeriodAvailable(adjacentMonth(direction), pagePeriod, props);
	const focusedCellRef = useRef<HTMLButtonElement>(null);
	// Layout-phase publication follows the mounted roving cell on every render.
	useImperativeHandle<HTMLElement | null, HTMLElement | null>(
		ref,
		() => focusedCellRef.current
	);
	const focusRequested = useRef(false);
	useLayoutEffect(() => {
		if (focusRequested.current) {
			focusRequested.current = false;
			focusedCellRef.current?.focus();
		}
	}, [focusedDate, view, visibleMonth]);
	useEffect(() => {
		const form = panelRef.current?.closest("form");
		if (!form) return;
		const reset = (): void => {
			const restoredValue =
				props.value !== undefined ? props.value : props.defaultValue;
			const restoredDate =
				typeof restoredValue === "string"
					? restoredValue
					: restoredValue?.start;
			const month = restoredDate ?? props.defaultMonth ?? today;
			const focus = initialFocusDate(month, restoredDate, today);
			focusRequested.current = Boolean(
				panelRef.current?.contains(document.activeElement) &&
				(view !== "days" || focusedDate !== focus || visibleMonth !== month)
			);
			setUncontrolledDate(
				props.mode === "range" ? null : (props.defaultValue ?? null)
			);
			setUncontrolledRange(
				props.mode === "range" ? (props.defaultValue ?? null) : null
			);
			setDraftStart(null);
			setPreviewDate(null);
			setVisibleMonth(month);
			setFocusedDate(focus);
			setView("days");
		};
		form.addEventListener("reset", reset);
		return (): void => {
			form.removeEventListener("reset", reset);
		};
	}, [
		props.mode,
		props.value,
		props.defaultValue,
		props.defaultMonth,
		today,
		view,
		focusedDate,
		visibleMonth,
	]);
	const onCellKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
		if (event.altKey || event.ctrlKey || event.metaKey) return;
		const target = keyboardDate(focusedDate, view, event.key, event.shiftKey);
		if (target === null) return;
		event.preventDefault();
		if (
			!isSamePeriod(target, visibleMonth, pagePeriod) &&
			!isPeriodAvailable(target, pagePeriod, props)
		)
			return;
		focusRequested.current = true;
		setFocusedDate(target);
		setVisibleMonth(target);
	};
	const navigateTo = (date: IsoDate, nextView: CalendarView): void => {
		focusRequested.current = true;
		setFocusedDate(date);
		setVisibleMonth(date);
		setView(nextView);
	};
	const page = (direction: -1 | 1): void => {
		if (!canPage(direction)) return;
		const month = adjacentMonth(direction);
		focusRequested.current = false;
		setVisibleMonth(month);
		setFocusedDate(
			focusInPeriod(
				focusedDate,
				view === "years" ? pageYearBlock(focusedDate, direction) : month,
				view === "days" ? "months" : "years"
			)
		);
	};
	const pickDay = (date: IsoDate): void => {
		if (isDayDisabled(date, props)) return;
		if (props.mode === "range") {
			setVisibleMonth(date);
			setPreviewDate(null);
			if (draftStart === null || isDayDisabled(draftStart, props)) {
				setDraftStart(date);
			} else {
				const range = dateRange(draftStart, date);
				if (props.value === undefined) setUncontrolledRange(range);
				setDraftStart(null);
				props.onChange?.(range);
			}
			return;
		}
		if (props.value === undefined) setUncontrolledDate(date);
		setVisibleMonth(date);
		props.onChange?.(date);
	};
	return (
		<div
			ref={panelRef}
			className={joinClassNames(
				"w-72 rounded-md border border-neutral-300 bg-white p-4",
				props.className
			)}
		>
			{props.name !== undefined && props.mode === "range" && (
				<>
					<input
						name={`${props.name}[start]`}
						type="hidden"
						value={draftStart === null ? (selectedRange?.start ?? "") : ""}
					/>
					<input
						name={`${props.name}[end]`}
						type="hidden"
						value={draftStart === null ? (selectedRange?.end ?? "") : ""}
					/>
				</>
			)}
			{props.name !== undefined && props.mode !== "range" && (
				<input name={props.name} type="hidden" value={selectedDate ?? ""} />
			)}
			<CalendarHeader
				nextDisabled={!canPage(1)}
				previousDisabled={!canPage(-1)}
				nextLabel={t(
					view === "days"
						? "calendar.nextMonth"
						: view === "months"
							? "calendar.nextYear"
							: "calendar.nextYears"
				)}
				previousLabel={t(
					view === "days"
						? "calendar.previousMonth"
						: view === "months"
							? "calendar.previousYear"
							: "calendar.previousYears"
				)}
				title={
					view === "days"
						? monthTitle(visibleMonth, language)
						: view === "months"
							? yearTitle(visibleMonth, language)
							: yearBlockTitle(visibleMonth, language)
				}
				titleLabel={
					view === "years"
						? undefined
						: t(view === "days" ? "calendar.showMonths" : "calendar.showYears")
				}
				onNext={() => {
					page(1);
				}}
				onPrevious={() => {
					page(-1);
				}}
				onTitleClick={
					view === "years"
						? undefined
						: (): void => {
								navigateTo(focusedDate, view === "days" ? "months" : "years");
							}
				}
			/>
			{view === "days" && (
				<CalendarDayView
					aria-label={props["aria-label"]}
					aria-labelledby={props["aria-labelledby"]}
					draftStart={props.mode === "range" ? draftStart : null}
					focusedCellRef={focusedCellRef}
					focusedDate={focusedDate}
					isDateDisabled={(date) => isDayDisabled(date, props)}
					language={language}
					month={visibleMonth}
					range={props.mode === "range" ? displayedRange : undefined}
					selectedDate={selectedDate}
					today={today}
					onCellFocus={setFocusedDate}
					onCellKeyDown={onCellKeyDown}
					onSelect={pickDay}
					onPreview={(date) => {
						if (props.mode === "range" && draftStart !== null)
							setPreviewDate(date);
					}}
				/>
			)}
			{view === "months" && (
				<CalendarMonthView
					aria-label={props["aria-label"]}
					aria-labelledby={props["aria-labelledby"]}
					focusedCellRef={focusedCellRef}
					focusedDate={focusedDate}
					language={language}
					maxDate={props.maxDate}
					minDate={props.minDate}
					month={visibleMonth}
					selectedDate={selectedDate ?? selectedRange?.start}
					onCellKeyDown={onCellKeyDown}
					onCellFocus={(month) => {
						setFocusedDate(focusInPeriod(focusedDate, month, "months"));
					}}
					onNavigate={(month) => {
						navigateTo(focusInPeriod(focusedDate, month, "months"), "days");
					}}
				/>
			)}
			{view === "years" && (
				<CalendarYearView
					aria-label={props["aria-label"]}
					aria-labelledby={props["aria-labelledby"]}
					focusedCellRef={focusedCellRef}
					focusedDate={focusedDate}
					language={language}
					maxDate={props.maxDate}
					minDate={props.minDate}
					month={visibleMonth}
					selectedDate={selectedDate ?? selectedRange?.start}
					onCellKeyDown={onCellKeyDown}
					onCellFocus={(year) => {
						setFocusedDate(focusInPeriod(focusedDate, year, "years"));
					}}
					onNavigate={(year) => {
						navigateTo(focusInPeriod(focusedDate, year, "years"), "months");
					}}
				/>
			)}
		</div>
	);
};
