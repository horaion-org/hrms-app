import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Input } from "@/components/forms/Input";
import { Select } from "@/components/forms/Select";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Dialog } from "@/components/ui/Dialog";
import { formatTimeRange } from "@/features/scheduling/formatShift";
import type {
	OpeningBalances,
	OpeningEntry,
} from "@/features/scheduling/hours/api";
import {
	changedOpenings,
	daysBeforeOf,
	hoursText,
	initialOpeningValues,
	lockedOpeningOf,
	openingProblem,
	openingValueOf,
	withOpeningValue,
	type OpeningValue,
	type OpeningValues,
} from "@/features/scheduling/hours/openingGrid";
import { formatDay } from "@/features/scheduling/periods";
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
	/**
	 * The month's opening balances, once loaded; their cells show only when
	 * days of the month come before the roster.
	 */
	openings?: OpeningBalances;
	/** The entered days, and the openings changed here, or undefined when none were (nothing to send). */
	onSave: (
		days: Array<EnteredDay>,
		openings: Array<OpeningEntry> | undefined
	) => void;
	onClose: () => void;
};

type MemberRow = StartingDays["members"][number];

const key = "scheduling.startingContext";

/**
 * The 7 days before the period, laid out like the roster: members down, days
 * across. A day a roster or approved leave covers shows what it was, locked;
 * any other day is a department shift, a day off, or not known (left empty).
 * "Fill empty" sets one day for everyone not entered yet. When the roster
 * starts mid-month, two more cells take the hours and overtime each member
 * already worked this month, so monthly overtime limits count from the 1st.
 */
export const StartingDaysDialog = ({
	open,
	week,
	saving,
	problem,
	openings,
	onSave,
	onClose,
}: StartingDaysDialogProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = i18n.resolvedLanguage ?? i18n.language;
	const [entries, setEntries] = useState<Entries>(() => initialEntries(week));
	const lastDay = week.days[week.days.length - 1] ?? "";
	const [fillDay, setFillDay] = useState(lastDay);
	const [fillValue, setFillValue] = useState<CellValue>("OFF");
	const askedOpenings = openings?.applies === true ? openings : undefined;
	const asksOpenings = askedOpenings !== undefined;
	// Only what the person typed is state; the API's answer is read on every
	// render, so openings that arrive after the dialog opened still show.
	const [openingChanges, setOpeningChanges] = useState<OpeningValues>({});
	const initialOpenings =
		openings === undefined ? {} : initialOpeningValues(openings);
	const openingByMember = new Map(
		(openings?.members ?? []).map((member) => [member.memberProfileId, member])
	);
	const openingTrouble =
		askedOpenings === undefined
			? undefined
			: openingProblem(openingChanges, daysBeforeOf(askedOpenings));
	const openingsToSave = (): Array<OpeningEntry> | undefined => {
		if (!asksOpenings) return undefined;
		const changed = changedOpenings(openingChanges, initialOpenings);
		return changed.length === 0 ? undefined : changed;
	};
	const labelOf = (date: string): string => formatDay(date, language);
	const valueOptions = [
		{ value: "", label: t(`${key}.notKnown`) },
		{ value: "OFF", label: t("scheduling.detail.kinds.off") },
		...week.shifts.map((shift) => ({
			value: shiftCellValue(shift.shiftId),
			label: `${shift.name} ${formatTimeRange(shift, t)}`,
		})),
	];
	const lockedLabel = (cell: StartingCell): string => {
		if (cell.kind === "LEAVE") return t("scheduling.detail.kinds.leave");
		if (cell.kind === "OFF") return t("scheduling.detail.kinds.off");
		if (cell.kind === "UNKNOWN") return t("scheduling.detail.kinds.unknown");
		return cell.shiftName ?? t(`${key}.worked`);
	};
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
	const asOfLabel = openings ? labelOf(openings.asOf) : "";
	const lockedOpeningText = (
		member: MemberRow,
		field: keyof OpeningValue
	): string => {
		const opening = openingByMember.get(member.memberProfileId);
		if (opening === undefined) return "";
		const locked = lockedOpeningOf(opening);
		if (locked.kind === "rostered") return t(`${key}.opening.fromRosters`);
		if (locked.kind === "none") return t(`${key}.opening.none`);
		const minutes =
			field === "worked" ? locked.workedMinutes : locked.overtimeMinutes;
		return t(`${key}.opening.hours`, { hours: hoursText(minutes) });
	};
	const openingColumn = (
		field: keyof OpeningValue
	): DataTableColumn<MemberRow> => ({
		id: `opening-${field}`,
		header: t(`${key}.opening.${field}`, { day: asOfLabel }),
		headerClassName: "w-36",
		cell: (member): ReactNode => {
			if (!openingByMember.get(member.memberProfileId)?.editable)
				return (
					<span className="block truncate text-sm text-neutral-600">
						{lockedOpeningText(member, field)}
					</span>
				);
			return (
				<Input
					className="w-full"
					inputMode="decimal"
					min={0}
					status={openingTrouble ? "error" : undefined}
					step={0.5}
					type="number"
					aria-label={t(`${key}.opening.${field}Label`, {
						name: member.displayName,
						day: asOfLabel,
					})}
					value={
						openingValueOf(
							openingChanges,
							initialOpenings,
							member.memberProfileId
						)[field]
					}
					onChange={(event) => {
						setOpeningChanges((current) =>
							withOpeningValue(
								current,
								initialOpenings,
								member.memberProfileId,
								field,
								event.target.value
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
		...(asksOpenings
			? [openingColumn("worked"), openingColumn("overtime")]
			: []),
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
						disabled={openingTrouble !== undefined}
						loading={saving}
						variant="primary"
						onClick={() => {
							onSave(enteredDays(entries), openingsToSave());
						}}
					>
						{t(`${key}.save`)}
					</Button>
				</div>
			}
			onClose={onClose}
		>
			<p className="text-sm text-neutral-700">{t(`${key}.hint`)}</p>
			{asksOpenings && (
				<p className="mt-2 text-sm text-neutral-700">
					{t(`${key}.opening.hint`, { day: asOfLabel })}
				</p>
			)}
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
			{openingTrouble && (
				<Callout className="mt-4" tone="warning">
					{t(`${key}.opening.${openingTrouble}`)}
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
