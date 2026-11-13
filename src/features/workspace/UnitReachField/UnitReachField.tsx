import { useTranslation } from "react-i18next";
import { countryName } from "@/common/countries";
import type { FunctionComponent } from "@/common/types";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { RadioCard } from "@/components/forms/RadioCard";
import { Select } from "@/components/forms/Select";
import {
	UNIT_REACHES,
	type UnitReach,
	type UnitReachChoices,
	type UnitReachValue,
} from "@/features/workspace/unitReach";
import { branchGroupLabel } from "@/features/workspace/unitChoices";

const key = "workspace.unitReach";

export type UnitReachFieldProps = {
	choices: UnitReachChoices;
	value: UnitReachValue;
	onChange: (value: UnitReachValue) => void;
	/** Prefixes the ids the radio group and the select label themselves with. */
	idPrefix: string;
	disabled: boolean;
	/** The refusal for the chosen kind's empty list, shown under its select. */
	error?: string;
};

/**
 * Where a company item applies (ADR-0072, ADR-0077): the whole company, chosen
 * Branches (every Department in them, now and later) or chosen Departments,
 * then the Branches or the Departments, grouped by Branch, to choose from.
 */
export const UnitReachField = ({
	choices,
	value,
	onChange,
	idPrefix,
	disabled,
	error,
}: UnitReachFieldProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const groupId = `${idPrefix}-applies-to`;
	const unitsId = `${idPrefix}-units`;
	const { hintId, errorId } = formRowIds(unitsId);
	const byBranch = value.appliesTo === "BRANCHES";
	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-2">
				<p className="text-sm text-neutral-800" id={groupId}>
					{t(`${key}.label`)}
					<span aria-hidden="true" className="ml-1 text-error-700">
						*
					</span>
				</p>
				<div aria-labelledby={groupId} className="grid gap-3" role="radiogroup">
					{UNIT_REACHES.map((reach) => (
						<RadioCard
							key={reach}
							checked={value.appliesTo === reach}
							description={t(`${key}.descriptions.${reach}`)}
							disabled={disabled}
							label={t(`${key}.choices.${reach}`)}
							name={groupId}
							value={reach}
							onChange={(appliesTo) => {
								onChange({ ...value, appliesTo: appliesTo as UnitReach });
							}}
						/>
					))}
				</div>
			</div>
			{value.appliesTo !== "COMPANY" && (
				<FormRow
					required
					error={error}
					hint={t(byBranch ? `${key}.branchesHint` : `${key}.departmentsHint`)}
					htmlFor={unitsId}
					label={t(`${key}.choices.${value.appliesTo}`)}
					layout="stacked"
				>
					<Select
						multiple
						aria-describedby={error ? errorId : hintId}
						aria-labelledby={formRowIds(unitsId).labelId}
						className="w-full"
						disabled={disabled}
						selectAllLabel={t(`${key}.selectAll`)}
						status={error ? "error" : undefined}
						value={byBranch ? value.branchIds : value.departmentIds}
						options={
							byBranch
								? choices.branches.map((branch) => ({
										value: branch.branchId,
										label: branch.name,
									}))
								: choices.departments.map((department) => ({
										value: department.departmentId,
										label: department.name,
										// Names repeat across Branches, so every Branch heads its own.
										group: branchGroupLabel(
											department,
											choices.departments,
											(code) => countryName(code, i18n.language)
										),
									}))
						}
						placeholder={t(
							byBranch
								? `${key}.branchesPlaceholder`
								: `${key}.departmentsPlaceholder`
						)}
						onChange={(ids) => {
							onChange(
								byBranch
									? { ...value, branchIds: ids }
									: { ...value, departmentIds: ids }
							);
						}}
					/>
				</FormRow>
			)}
		</div>
	);
};
