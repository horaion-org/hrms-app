import { useQuery } from "@tanstack/react-query";
import { useId } from "react";
import type { FunctionComponent } from "@/common/types";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Select } from "@/components/forms/Select";
import { workspaceQuery } from "@/features/workspace/api";
import { DepartmentSelector } from "@/features/workspace/DepartmentSelector";
import type { PermissionKey } from "@/features/workspace/permissionKeys";
import { retry } from "@/features/workspace/retry";
import { departmentChoices } from "@/features/workspace/unitChoices";

/**
 * The Department a shift or constraint belongs to: chosen when adding one,
 * from the Departments where the person holds `keys` (within `branchId`
 * when given); shown, never changed, when editing one.
 */
export type SetupDepartment =
	| {
			kind: "choose";
			companyId: string;
			branchId?: string;
			keys: ReadonlyArray<PermissionKey>;
			/** The chosen Department's id; empty for none yet. */
			value: string;
			onChange: (departmentId: string) => void;
	  }
	| { kind: "fixed"; departmentId: string; label: string };

/** The field's words, which each dialog gives in its own voice. */
export type SetupDepartmentFieldLabels = {
	label: string;
	placeholder: string;
	/** Under the field while choosing. */
	hint: string;
	/** Under the field when no Department can be chosen. */
	empty: string;
};

export type SetupDepartmentFieldProps = {
	department: SetupDepartment;
	labels: SetupDepartmentFieldLabels;
};

/**
 * The Department field of the shift and constraint dialogs, as the Job
 * title dialog has it: a choice of the active Departments the person may
 * add to, or the item's own Department, shown disabled.
 */
export const SetupDepartmentField = ({
	department,
	labels,
}: SetupDepartmentFieldProps): FunctionComponent => {
	const id = useId();
	const ids = formRowIds(id);
	const { data: workspace } = useQuery({ ...workspaceQuery, retry });
	const nothingToChoose =
		department.kind === "choose" &&
		workspace !== undefined &&
		!departmentChoices(workspace, department.companyId, department.keys, {
			activeOnly: true,
		}).some(
			(choice) =>
				department.branchId === undefined ||
				choice.branchId === department.branchId
		);
	const hint =
		department.kind === "fixed"
			? undefined
			: nothingToChoose
				? labels.empty
				: labels.hint;
	const shared = {
		"aria-labelledby": ids.labelId,
		"aria-describedby": hint ? ids.hintId : undefined,
		className: "w-full",
		placeholder: labels.placeholder,
	};

	return (
		<FormRow
			required
			hint={hint}
			htmlFor={id}
			label={labels.label}
			layout="stacked"
		>
			{department.kind === "fixed" ? (
				<Select
					{...shared}
					disabled
					value={department.departmentId}
					options={[
						{ value: department.departmentId, label: department.label },
					]}
				/>
			) : (
				<DepartmentSelector
					{...shared}
					activeOnly
					branchId={department.branchId}
					companyId={department.companyId}
					keys={department.keys}
					value={department.value}
					onChange={department.onChange}
				/>
			)}
		</FormRow>
	);
};
