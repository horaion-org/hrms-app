import { useId, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { Select } from "@/components/forms/Select";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Dialog } from "@/components/ui/Dialog";
import { dayTypeLabel } from "@/features/scheduling/dayTypes";
import { formatTimeRange } from "@/features/scheduling/formatShift";
import { formatDay } from "@/common/formatDay";
import type {
	EnteredDay,
	StartingCell,
	StartingDays,
} from "@/features/scheduling/startingContext/api";
import {
	cellOn,
	enteredDays,
	fillEmpty,
	hasEnteredDayOn,
	initialEntries,
	isCellValue,
	offCellValue,
	offDayTypes,
	shiftCellValue,
	splitDays,
	withCell,
	type CellValue,
	type Entries,
} from "@/features/scheduling/startingContext/startingGrid";

export type StartingDaysDialogProps = {
	open: boolean;
	week: StartingDays;
	/** The schedule's types for a day off; empty from an older API, which takes a day off without one. */
	nonWorkingDayTypes: ReadonlyArray<string>;
	saving: boolean;
	/** Why the last save was refused, shown in the dialog. */
	problem?: string;
	/** The entered days. */
	onSave: (days: Array<EnteredDay>) => void;
	onClose: () => void;
};

type MemberRow = StartingDays["members"][number];

const key = "scheduling.startingContext";

/**
 * The days before the period, laid out like the roster: members down, days
 * across. The 7 nearest the period show first; the earlier ones show on
 * request, and by themselves when one of them already holds a typed day.
 * Hidden days are still saved. A day a roster or approved leave covers shows
 * what it was, locked; any other day is a department shift, a day off of one
 * of the schedule's types, or not known (left empty). "Fill empty" sets one shown day for everyone not
 * entered yet. The 7 nearer days fit the dialog's width; the hours already
 * worked this month have their own section (OpeningHoursSection).
 */
export const StartingDaysDialog = ({
	open,
	week,
	nonWorkingDayTypes,
	saving,
	problem,
	onSave,
	onClose,
}: StartingDaysDialogProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	const [entries, setEntries] = useState<Entries>(() => initialEntries(week));
	const { earlier, nearer } = splitDays(week.days);
	const [showEarlier, setShowEarlier] = useState(() =>
		hasEnteredDayOn(initialEntries(week), earlier)
	);
	const shownDays = showEarlier ? week.days : nearer;
	const tableId = useId();
	const lastDay = week.days[week.days.length - 1] ?? "";
	const [fillDay, setFillDay] = useState(lastDay);
	const dayOffTypes = offDayTypes(week, nonWorkingDayTypes);
	const [fillValue, setFillValue] = useState<CellValue>(() =>
		offCellValue(dayOffTypes[0] ?? null)
	);
	const labelOf = (date: string): string => formatDay(date, language);
	const dayOffLabel = (dayType: string | null): string =>
		dayType === null
			? t("scheduling.detail.kinds.off")
			: dayTypeLabel(dayType, t);
	const valueOptions = [
		{ value: "", label: t(`${key}.notKnown`) },
		...dayOffTypes.map((dayType) => ({
			value: offCellValue(dayType),
			label: dayOffLabel(dayType),
		})),
		...week.shifts.map((shift) => ({
			value: shiftCellValue(shift.shiftId),
			label: `${shift.name} ${formatTimeRange(shift, t)}`,
		})),
	];
	const lockedLabel = (cell: StartingCell): string => {
		if (cell.kind === "LEAVE") return t("scheduling.detail.kinds.leave");
		if (cell.kind === "OFF") return dayOffLabel(cell.dayType);
		if (cell.kind === "UNKNOWN") return t("scheduling.detail.kinds.unknown");
		return cell.shiftName ?? t(`${key}.worked`);
	};
	const dayColumn = (date: string): DataTableColumn<MemberRow> => ({
		id: date,
		header: labelOf(date),
		// Seven of these (152 px, room for "Not known") beside the staff column fit the dialog's 1200 px of content.
		headerClassName: "w-38",
		wrapHeader: true,
		cell: (member): ReactNode => {
			const cell = cellOn(member, date);
			if (cell === undefined) return null;
			if (cell.locked)
				return (
					<span
						className="block truncate text-sm text-neutral-600"
						title={lockedLabel(cell)}
					>
						{lockedLabel(cell)}
					</span>
				);
			return (
				<Select
					// Tighter than a form's select, so "Not known" reads in full in a 152 px day.
					className="w-full gap-1! px-3!"
					options={valueOptions}
					value={entries[member.memberProfileId]?.[date] ?? ""}
					aria-label={t(`${key}.cellLabel`, {
						name: member.displayName,
						day: labelOf(date),
					})}
					onChange={(value) => {
						if (!isCellValue(value)) return;
						setEntries((current) =>
							withCell(current, member.memberProfileId, date, value)
						);
					}}
				/>
			);
		},
	});
	const columns: Array<DataTableColumn<MemberRow>> = [
		{
			id: "member",
			header: t("scheduling.detail.staff"),
			headerClassName: "w-32",
			pin: "start",
			cell: (member) => (
				<span className="block min-w-0">
					<span
						className="block truncate text-sm font-semibold"
						title={member.displayName}
					>
						{member.displayName}
					</span>
					{member.jobTitleName && (
						<span
							className="block truncate text-xs text-neutral-600"
							title={member.jobTitleName}
						>
							{member.jobTitleName}
						</span>
					)}
				</span>
			),
		},
		...shownDays.map(dayColumn),
	];

	return (
		<Dialog
			// 1248 px: as wide as a 1280 px window leaves beside the dialog's margins.
			className="md:max-w-312"
			description={t(`${key}.explain`)}
			open={open}
			preventClose={saving}
			title={t(`${key}.title`)}
			footer={
				<div className="flex flex-wrap justify-end gap-3">
					<Button disabled={saving} variant="cancel" onClick={onClose}>
						{t(`${key}.cancel`)}
					</Button>
					<Button
						loading={saving}
						variant="primary"
						onClick={() => {
							onSave(enteredDays(entries));
						}}
					>
						{t(`${key}.save`)}
					</Button>
				</div>
			}
			onClose={onClose}
		>
			<p className="text-sm text-neutral-700">{t(`${key}.hint`)}</p>
			{earlier.length > 0 && (
				<Button
					aria-controls={tableId}
					aria-expanded={showEarlier}
					className="mt-2"
					variant="textlink"
					onClick={() => {
						if (showEarlier && earlier.includes(fillDay)) setFillDay(lastDay);
						setShowEarlier(!showEarlier);
					}}
				>
					{t(`${key}.${showEarlier ? "hideEarlier" : "showEarlier"}`)}
				</Button>
			)}
			<div className="mt-4 flex flex-wrap items-end gap-3">
				<Select
					aria-label={t(`${key}.fillDay`)}
					className="w-40"
					value={fillDay}
					options={shownDays.map((date) => ({
						value: date,
						label: labelOf(date),
					}))}
					onChange={setFillDay}
				/>
				<Select
					aria-label={t(`${key}.fillValue`)}
					className="w-56"
					options={valueOptions.filter((option) => option.value !== "")}
					value={fillValue}
					onChange={(value) => {
						if (isCellValue(value)) setFillValue(value);
					}}
				/>
				<Button
					variant="secondary"
					onClick={() => {
						setEntries((current) => fillEmpty(current, fillDay, fillValue));
					}}
				>
					{t(`${key}.fillEmpty`)}
				</Button>
			</div>
			{problem && (
				<Callout className="mt-4" tone="warning">
					{problem}
				</Callout>
			)}
			<div id={tableId}>
				<DataTable
					className="mt-4"
					columns={columns}
					data={week.members}
					getRowId={(member) => member.memberProfileId}
					label={t(`${key}.tableLabel`)}
				/>
			</div>
		</Dialog>
	);
};
