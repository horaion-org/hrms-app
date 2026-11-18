import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Input } from "@/components/forms/Input";
import { Select } from "@/components/forms/Select";
import { SearchIcon } from "@/components/ui/Icon";
import {
	ALL_DEPARTMENTS,
	branchFirst,
	labelledDepartmentChoices,
	personDescription,
	sharedDepartmentNames,
	type DepartmentToChoose,
} from "@/features/people/ApplyForSomeoneDialog";

/**
 * The people offered when applying: a search the caller owns, the Department
 * it is narrowed to (`ALL_DEPARTMENTS` for none) among `departments`, and its
 * current answer.
 */
export type ApplyEmployees = {
	search: string;
	onSearch: (text: string) => void;
	department?: string;
	/** The Departments the search may narrow to; the choice is shown only with more than one. */
	departments?: ReadonlyArray<DepartmentToChoose>;
	onDepartment?: (departmentId: string) => void;
	options: Array<{
		membershipId: string;
		displayName: string;
		employeeCode: string;
		departmentName?: string | null;
		branchName?: string | null;
		jobTitleName?: string | null;
	}>;
};

export type ApplyEmployeePickerProps = {
	employees: ApplyEmployees;
	/** The person chosen, by membership; "" for none yet. */
	membershipId: string;
	onChoose: (membershipId: string) => void;
	/** Why the choice was refused, shown under it. */
	error: string | undefined;
	/** The form's id, which the picker's own ids start from. */
	id: string;
};

/**
 * Who leave is applied for: a name search, a Department choice when the
 * search may narrow to more than one, and the people found, each named with
 * their Department, job title and employee code.
 */
export const ApplyEmployeePicker = ({
	employees,
	membershipId,
	onChoose,
	error,
	id,
}: ApplyEmployeePickerProps): FunctionComponent => {
	const { t } = useTranslation();
	const departments = employees.departments ?? [];
	// A Department name two choices share is told apart by its Branch, in the filter and under each person.
	const withBranch = branchFirst(t);
	const sharedNames = sharedDepartmentNames(departments);
	return (
		<div className="space-y-2">
			<p className="text-sm font-medium" id={`${id}-employee`}>
				{t("leave.employee")}
			</p>
			{/* A name lookup: no saved entries over the list, and a Search key on a phone's keyboard. */}
			<Input
				aria-label={t("leave.searchEmployee")}
				autoComplete="off"
				enterKeyHint="search"
				leadingIcon={<SearchIcon />}
				placeholder={t("leave.searchEmployee")}
				type="search"
				value={employees.search}
				onChange={(event) => {
					employees.onSearch(event.target.value);
				}}
			/>
			{departments.length > 1 && (
				<Select
					aria-label={t("people.applyFor.department")}
					value={employees.department ?? ALL_DEPARTMENTS}
					options={[
						{
							value: ALL_DEPARTMENTS,
							label: t("people.applyFor.allDepartments"),
						},
						...labelledDepartmentChoices(departments, withBranch).map(
							(choice) => ({ value: choice.departmentId, label: choice.label })
						),
					]}
					onChange={employees.onDepartment}
				/>
			)}
			<Select
				aria-describedby={error ? `${id}-employee-error` : undefined}
				aria-labelledby={`${id}-employee`}
				className="w-full"
				placeholder={t("leave.chooseEmployee")}
				status={error ? "error" : undefined}
				value={membershipId}
				options={employees.options.map((person) => ({
					value: person.membershipId,
					label: person.displayName,
					description: personDescription(person, sharedNames, withBranch),
				}))}
				onChange={onChoose}
			/>
			{employees.options.length === 0 && employees.search.trim() !== "" && (
				<p className="text-sm text-neutral-700">{t("leave.noEmployees")}</p>
			)}
			{error && (
				<p
					className="text-sm text-error-700"
					id={`${id}-employee-error`}
					role="alert"
				>
					{error}
				</p>
			)}
		</div>
	);
};
