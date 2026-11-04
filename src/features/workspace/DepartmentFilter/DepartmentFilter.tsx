import { useId } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Select } from "@/components/forms/Select";
import type { ResolvedUnitSelection } from "@/features/workspace/unitSelection";

/** The option value standing for every Department; never a real id. */
const ALL = "";

export type DepartmentFilterProps = {
	/** The page's units, resolved with its rules. */
	selection: ResolvedUnitSelection;
	/** Called with a Department id, or undefined for every Department. */
	onChange: (departmentId: string | undefined) => void;
};

/**
 * The Department field of a list's Filters panel, labelled above its
 * select. It is offered only while one Branch is shown and that Branch has
 * several Departments in reach; otherwise there is nothing to choose and
 * it renders nothing.
 */
export const DepartmentFilter = ({
	selection,
	onChange,
}: DepartmentFilterProps): FunctionComponent => {
	const { t } = useTranslation();
	const id = useId();
	if (selection.departmentMode !== "select") return null;
	return (
		<FormRow
			htmlFor={id}
			label={t("workspace.unitSelector.department")}
			layout="stacked"
		>
			<Select
				aria-labelledby={formRowIds(id).labelId}
				className="w-full font-semibold"
				value={selection.department?.departmentId ?? ALL}
				options={[
					{ value: ALL, label: t("workspace.unitSelector.allDepartments") },
					...selection.departments.map((choice) => ({
						value: choice.departmentId,
						label: choice.name,
					})),
				]}
				onChange={(departmentId) => {
					onChange(departmentId || undefined);
				}}
			/>
		</FormRow>
	);
};
