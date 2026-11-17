import type { TFunction } from "i18next";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Input } from "@/components/forms/Input";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Dialog } from "@/components/ui/Dialog";
import { SearchIcon } from "@/components/ui/Icon";
import {
	GIVE_DEFAULT_ACCESS_MAX_PEOPLE,
	type GiveDefaultAccessResult,
} from "@/features/organisation/api";
import { defaultAccessRefusal } from "@/features/organisation/defaultAccessRefusal";
import { useGiveDefaultAccess } from "@/features/organisation/useDefaultAccess";
import type { AssignablePerson } from "@/features/skills/api";
import { useAssignablePeople } from "@/features/skills/useBulkAssign";
import { DepartmentSelector } from "@/features/workspace/DepartmentSelector";

export type GiveDefaultAccessDialogProps = {
	companyId: string;
	/** Called with what giving did, once it is saved; the caller confirms it. */
	onGiven: (result: GiveDefaultAccessResult) => void;
	onClose: () => void;
};

const key = "organisation.accessRoles.defaults.giveDialog";
/** Departments are offered where the reader may read people, as the list is. */
const READ_KEYS = ["member_profile:read"] as const;

/** The people list's columns: the person and the Department they work in. */
const peopleColumns = (
	t: TFunction
): Array<DataTableColumn<AssignablePerson>> => [
	{
		id: "name",
		header: t(`${key}.person`),
		cell: (person) => person.displayName,
		sortValue: (person) => person.displayName,
		cellClassName: "font-semibold",
	},
	{
		id: "department",
		header: t(`${key}.department`),
		cell: (person) => person.departmentName ?? t(`${key}.noDepartment`),
	},
];

/**
 * Gives default access (API ADR-0118) to people already in the company:
 * search them by name, narrow them to a Department, tick them (up to 500,
 * everyone listed with the header box) and give it to all at once. People
 * added from now on receive it without this. Mount when opened and unmount
 * when closed so every attempt starts fresh.
 */
export const GiveDefaultAccessDialog = ({
	companyId,
	onGiven,
	onClose,
}: GiveDefaultAccessDialogProps): FunctionComponent => {
	const { t } = useTranslation();
	const searchId = useId();
	const departmentId = useId();
	const [search, setSearch] = useState("");
	const [department, setDepartment] = useState("");
	const [selectedIds, setSelectedIds] = useState<Array<string>>([]);
	const people = useAssignablePeople(
		companyId,
		search,
		department || undefined
	);
	const give = useGiveDefaultAccess(companyId, { confirmed: true });
	const listed = people.data?.items ?? [];
	const total = people.data?.total ?? 0;

	return (
		<Dialog
			open
			className="max-w-200"
			description={t(`${key}.description`)}
			preventClose={give.isPending}
			title={t(`${key}.title`)}
			footer={
				<div className="flex justify-end gap-3">
					<Button disabled={give.isPending} variant="cancel" onClick={onClose}>
						{t("organisation.list.cancel")}
					</Button>
					<Button
						disabled={selectedIds.length === 0}
						loading={give.isPending}
						onClick={() => {
							give.mutate(selectedIds, {
								onSuccess: (result) => {
									onGiven(result);
									onClose();
								},
							});
						}}
					>
						{t(`${key}.submit`, { count: selectedIds.length })}
					</Button>
				</div>
			}
			onClose={onClose}
		>
			<div className="space-y-6">
				{give.error && (
					<p className="text-sm text-error-700" role="alert">
						{defaultAccessRefusal(give.error, t)}
					</p>
				)}
				<div className="grid gap-4 sm:grid-cols-2">
					<FormRow
						htmlFor={searchId}
						label={t(`${key}.search`)}
						layout="stacked"
					>
						<Input
							className="w-full"
							id={searchId}
							leadingIcon={<SearchIcon />}
							placeholder={t(`${key}.searchPlaceholder`)}
							type="search"
							value={search}
							onChange={(event) => {
								setSearch(event.target.value);
							}}
						/>
					</FormRow>
					<FormRow
						htmlFor={departmentId}
						label={t(`${key}.department`)}
						layout="stacked"
					>
						<DepartmentSelector
							aria-labelledby={formRowIds(departmentId).labelId}
							className="w-full"
							companyId={companyId}
							emptyLabel={t(`${key}.allDepartments`)}
							keys={READ_KEYS}
							placeholder={t(`${key}.allDepartments`)}
							value={department}
							onChange={setDepartment}
						/>
					</FormRow>
				</div>
				{people.isError ? (
					<p className="text-sm text-error-700" role="alert">
						{t(`${key}.peopleFailed`)}
					</p>
				) : (
					<div className="space-y-2">
						<DataTable
							className="max-h-80 overflow-y-auto"
							columns={peopleColumns(t)}
							data={listed}
							getRowId={(person) => person.membershipId}
							label={t(`${key}.people`)}
							emptyState={
								people.isPending ? t(`${key}.loading`) : t(`${key}.noPeople`)
							}
							selection={{
								rowLabel: (person) => person.displayName,
								selectedIds,
								onChange: setSelectedIds,
							}}
						/>
						<p className="text-sm text-neutral-700" role="status">
							{total > GIVE_DEFAULT_ACCESS_MAX_PEOPLE
								? t(`${key}.capped`, {
										count: GIVE_DEFAULT_ACCESS_MAX_PEOPLE,
										total,
									})
								: t(`${key}.selected`, { count: selectedIds.length })}
						</p>
					</div>
				)}
			</div>
		</Dialog>
	);
};
