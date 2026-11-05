import { useId } from "react";
import { useTranslation } from "react-i18next";
import { countryName } from "@/common/countries";
import type { FunctionComponent } from "@/common/types";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Select } from "@/components/forms/Select";
import { branchGroupLabel } from "@/features/workspace/unitChoices";
import {
	offersDepartmentChoice,
	type ResolvedUnitSelection,
} from "@/features/workspace/unitSelection";

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
 * select. With one Branch shown it lists that Branch's Departments; with
 * every Branch shown it lists every Department in reach, grouped under its
 * Branch. With fewer than two to choose from it renders nothing.
 */
export const DepartmentFilter = ({
	selection,
	onChange,
}: DepartmentFilterProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const id = useId();
	if (!offersDepartmentChoice(selection)) return null;
	return (
		<FormRow
			htmlFor={id}
			label={t("workspace.departmentFilter.department")}
			layout="stacked"
		>
			<Select
				aria-labelledby={formRowIds(id).labelId}
				className="w-full font-semibold"
				value={selection.department?.departmentId ?? ALL}
				options={[
					{ value: ALL, label: t("workspace.departmentFilter.allDepartments") },
					...selection.departments.map((choice) => ({
						value: choice.departmentId,
						label: choice.name,
						// Names repeat across Branches, so every Branch heads its own.
						...(selection.branch
							? {}
							: {
									group: branchGroupLabel(
										choice,
										selection.departments,
										(code) => countryName(code, i18n.language)
									),
								}),
					})),
				]}
				onChange={(departmentId) => {
					onChange(departmentId || undefined);
				}}
			/>
		</FormRow>
	);
};
