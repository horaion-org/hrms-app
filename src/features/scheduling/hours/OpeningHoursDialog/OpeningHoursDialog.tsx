import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { Input } from "@/components/forms/Input";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Dialog } from "@/components/ui/Dialog";
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
import {
	lastDayBefore,
	unknownOpeningCount,
} from "@/features/scheduling/hours/openingSummary";
import { formatDayAndMonth } from "@/features/scheduling/months/monthWeeks";

/** One person in the table, named as the roster's members are. */
export type OpeningHoursPerson = {
	memberProfileId: string;
	displayName: string;
	jobTitleName: string | null;
};

export type OpeningHoursDialogProps = {
	open: boolean;
	/** The roster's opening balances; only shown when they apply (the roster starts after the 1st). */
	openings: OpeningBalances;
	/** Who the rows are and in what order; someone without an opening is left out. */
	people: ReadonlyArray<OpeningHoursPerson>;
	/** Whether the week already has a roster, which saved hours don't change until it is generated again. */
	generated: boolean;
	saving: boolean;
	/** Why the last save was refused, shown in the dialog. */
	problem?: string;
	/** The changed people's openings; never called with none. */
	onSave: (openings: Array<OpeningEntry>) => void;
	onClose: () => void;
};

const key = "scheduling.openingHours";

/**
 * The paid hours and overtime each person already worked this month before
 * the roster's first day, one row per person, so monthly overtime limits
 * count from the 1st. Someone the rosters already cover reads "From rosters";
 * someone whose opening can't be set here reads its figures or "None
 * entered". Typed hours are checked as they are typed; saving sends only the
 * people whose cells changed, and with none changed it just closes.
 */
export const OpeningHoursDialog = ({
	open,
	openings,
	people,
	generated,
	saving,
	problem,
	onSave,
	onClose,
}: OpeningHoursDialogProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	// Only what the person typed is state; the API's answer is read on every render.
	const [changes, setChanges] = useState<OpeningValues>({});
	const initial = initialOpeningValues(openings);
	const openingByPerson = new Map(
		openings.members.map((member) => [member.memberProfileId, member])
	);
	const rows = people.filter((person) =>
		openingByPerson.has(person.memberProfileId)
	);
	const trouble = openingProblem(changes, daysBeforeOf(openings));
	const day = formatDayAndMonth(openings.asOf, language);
	const from = formatDayAndMonth(openings.monthStart, language);
	const to = formatDayAndMonth(lastDayBefore(openings.asOf), language);
	const unknownCount = unknownOpeningCount(openings);

	const lockedText = (
		person: OpeningHoursPerson,
		field: keyof OpeningValue
	): string => {
		const opening = openingByPerson.get(person.memberProfileId);
		if (opening === undefined) return "";
		const locked = lockedOpeningOf(opening);
		if (locked.kind === "rostered") return t(`${key}.fromRosters`);
		if (locked.kind === "none") return t(`${key}.none`);
		const minutes =
			field === "worked" ? locked.workedMinutes : locked.overtimeMinutes;
		return t(`${key}.hours`, { hours: hoursText(minutes) });
	};
	const hoursColumn = (
		field: keyof OpeningValue
	): DataTableColumn<OpeningHoursPerson> => ({
		id: field,
		header: t(`${key}.${field}`),
		// Narrower on a phone, so both hours columns show beside the names without scrolling sideways.
		headerClassName: "w-40 max-sm:w-26",
		cell: (person): ReactNode => {
			if (!openingByPerson.get(person.memberProfileId)?.editable)
				return (
					<span
						className="block truncate text-sm text-neutral-600"
						title={lockedText(person, field)}
					>
						{lockedText(person, field)}
					</span>
				);
			return (
				<Input
					// The field takes its width from the cell (`w-0` then grows), so on a phone the columns fit instead of a number field's own width.
					className="w-full [&>input]:w-0"
					inputMode="decimal"
					min={0}
					status={trouble ? "error" : undefined}
					step={0.5}
					type="number"
					aria-label={t(`${key}.${field}Label`, {
						name: person.displayName,
						day,
					})}
					value={
						openingValueOf(changes, initial, person.memberProfileId)[field]
					}
					onChange={(event) => {
						setChanges((current) =>
							withOpeningValue(
								current,
								initial,
								person.memberProfileId,
								field,
								event.target.value
							)
						);
					}}
				/>
			);
		},
	});
	const columns: Array<DataTableColumn<OpeningHoursPerson>> = [
		{
			id: "person",
			header: t("scheduling.detail.staff"),
			headerClassName: "w-48",
			pin: "start",
			cell: (person) => (
				<span className="block min-w-0">
					<span
						className="block truncate text-sm font-semibold"
						title={person.displayName}
					>
						{person.displayName}
					</span>
					{person.jobTitleName && (
						<span
							className="block truncate text-xs text-neutral-600"
							title={person.jobTitleName}
						>
							{person.jobTitleName}
						</span>
					)}
				</span>
			),
		},
		hoursColumn("worked"),
		hoursColumn("overtime"),
	];
	const save = (): void => {
		const changed = changedOpenings(changes, initial);
		if (changed.length === 0) onClose();
		else onSave(changed);
	};

	return (
		<Dialog
			className="md:max-w-180"
			description={t(`${key}.explain`, { from, to })}
			open={open}
			preventClose={saving}
			title={t(`${key}.title`, { from, to })}
			footer={
				<div className="flex flex-wrap justify-end gap-3">
					<Button disabled={saving} variant="cancel" onClick={onClose}>
						{t(`${key}.cancel`)}
					</Button>
					<Button
						disabled={trouble !== undefined}
						loading={saving}
						variant="primary"
						onClick={save}
					>
						{t(`${key}.save`)}
					</Button>
				</div>
			}
			onClose={onClose}
		>
			{unknownCount > 0 && (
				<p className="text-sm text-neutral-700">
					{t(`${key}.unknown`, { count: unknownCount, day })}
				</p>
			)}
			{generated && (
				<p className="mt-2 text-sm text-neutral-700">
					{t(`${key}.regenerateToUse`)}
				</p>
			)}
			{problem && (
				<Callout className="mt-4" tone="warning">
					{problem}
				</Callout>
			)}
			{trouble && (
				<Callout className="mt-4" tone="warning">
					{t(`${key}.${trouble}`, { day })}
				</Callout>
			)}
			<DataTable
				className="mt-4"
				columns={columns}
				data={rows}
				getRowId={(person) => person.memberProfileId}
				label={t(`${key}.tableLabel`, { day })}
			/>
		</Dialog>
	);
};
