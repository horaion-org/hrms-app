import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Select } from "@/components/forms/Select";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Dialog } from "@/components/ui/Dialog";
import type {
	EnteredDay,
	StartingCell,
	StartingDays,
} from "@/features/scheduling/startingContext/api";
import {
	enteredDays,
	fillEmpty,
	initialEntries,
	shiftCellValue,
	withCell,
	type CellValue,
	type Entries,
} from "@/features/scheduling/startingContext/startingGrid";

export type StartingDaysDialogProps = {
	open: boolean;
	week: StartingDays;
	saving: boolean;
	/** Why the last save was refused, shown in the dialog. */
	problem?: string;
	onSave: (days: Array<EnteredDay>) => void;
	onClose: () => void;
};

type MemberRow = StartingDays["members"][number];

const key = "scheduling.startingContext";

/**
 * The 7 days before the period, laid out like the roster: members down, days
 * across. A day a roster or approved leave covers shows what it was, locked;
 * any other day is a department shift, a day off, or not known (left empty).
 * "Fill empty" sets one day for everyone not entered yet.
 */
export const StartingDaysDialog = ({
	open,
	week,
	saving,
	problem,
	onSave,
	onClose,
}: StartingDaysDialogProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = i18n.resolvedLanguage ?? i18n.language;
	const [entries, setEntries] = useState<Entries>(() => initialEntries(week));
	const lastDay = week.days[week.days.length - 1] ?? "";
	const [fillDay, setFillDay] = useState(lastDay);
	const [fillValue, setFillValue] = useState<CellValue>("OFF");
	const dayLabel = new Intl.DateTimeFormat(language, {
		weekday: "short",
		day: "numeric",
	});
	const labelOf = (date: string): string =>
		dayLabel.format(new Date(`${date}T00:00:00`));
	const valueOptions = [
		{ value: "", label: t(`${key}.notKnown`) },
		{ value: "OFF", label: t("scheduling.detail.kinds.off") },
		...week.shifts.map((shift) => ({
			value: shiftCellValue(shift.shiftId),
			label: `${shift.name} ${shift.startTime}–${shift.endTime}`,
		})),
	];
	const lockedLabel = (cell: StartingCell): string =>
		cell.kind === "LEAVE"
			? t("scheduling.detail.kinds.leave")
			: cell.kind === "OFF"
				? t("scheduling.detail.kinds.off")
				: (cell.shiftName ?? t(`${key}.worked`));
	const dayColumn = (
		date: string,
		index: number
	): DataTableColumn<MemberRow> => ({
		id: date,
		header: labelOf(date),
		headerClassName: "w-40",
		cell: (member): ReactNode => {
			const cell = member.cells[index];
			if (cell === undefined) return null;
			if (cell.locked)
				return (
					<span className="block truncate text-sm text-neutral-600">
						{lockedLabel(cell)}
					</span>
				);
			return (
				<Select
					className="w-full"
					options={valueOptions}
					value={entries[member.memberProfileId]?.[date] ?? ""}
					aria-label={t(`${key}.cellLabel`, {
						name: member.displayName,
						day: labelOf(date),
					})}
					onChange={(value) => {
						setEntries((current) =>
							withCell(
								current,
								member.memberProfileId,
								date,
								value as CellValue
							)
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
			headerClassName: "w-48",
			pin: "start",
			cell: (member) => (
				<span className="block min-w-0">
					<span className="block truncate text-sm font-semibold">
						{member.displayName}
					</span>
					{member.jobTitleName && (
						<span className="block truncate text-xs text-neutral-600">
							{member.jobTitleName}
						</span>
					)}
				</span>
			),
		},
		...week.days.map(dayColumn),
	];

	return (
		<Dialog
			className="md:max-w-288"
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
			<div className="mt-4 flex flex-wrap items-end gap-3">
				<Select
					aria-label={t(`${key}.fillDay`)}
					className="w-40"
					value={fillDay}
					options={week.days.map((date) => ({
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
						setFillValue(value as CellValue);
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
			<DataTable
				className="mt-4"
				columns={columns}
				data={week.members}
				getRowId={(member) => member.memberProfileId}
				label={t(`${key}.tableLabel`)}
			/>
		</Dialog>
	);
};
