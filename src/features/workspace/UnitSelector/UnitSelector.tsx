import { useEffect, useId } from "react";
import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Select } from "@/components/forms/Select";
import type { BranchChoice } from "@/features/workspace/unitChoices";
import {
	ALL_BRANCHES,
	sameUnits,
	urlUnitsOf,
	type ResolvedUnitSelection,
	type UnitSelection,
} from "@/features/workspace/unitSelection";

/** The option value standing for every country, Branch or Department; never a real id or code. */
const ALL = "";

export type UnitSelectorProps = {
	/** What to show, from `useUnitSelection` with the page's rules. */
	selection: ResolvedUnitSelection;
	/** The units the URL names, so a resolved choice that differs is announced once. */
	requested: UnitSelection;
	/** Called with the next units; changing the Branch always clears the Department. */
	onChange: (next: UnitSelection) => void;
};

const fieldClasses = "w-full sm:w-44";
const selectClasses = "w-full font-semibold text-ink-blue-900";

/** A level with one unit in reach: its label above the unit's name, where a select would be. */
const UnitText = ({
	label,
	value,
}: {
	label: string;
	value: string;
}): FunctionComponent => (
	<div className={joinClassNames("flex flex-col gap-2", fieldClasses)}>
		<span className="text-sm text-neutral-800">{label}</span>
		<span className="flex h-11 items-center truncate font-semibold text-ink-blue-900">
			{value}
		</span>
	</div>
);

/**
 * The Country, Branch and Department a list is narrowed to, each labelled
 * above its control, for a `PageToolbar`'s scope zone. Country shows only
 * when the offered Branches span several; choosing one shows its first
 * Branch. A level with one unit in reach is shown as text, and Department
 * waits for one Branch. When what is shown differs from `requested` (a
 * default, or a unit no longer offered), it is announced through
 * `onChange` once, so the page's URL names what it shows. Nothing renders
 * while no Branch is offered: the page says why.
 */
export const UnitSelector = ({
	selection,
	requested,
	onChange,
}: UnitSelectorProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const id = useId();
	const shown = urlUnitsOf(selection);
	const loaded = selection.branches.length > 0;
	const announce = loaded && !sameUnits(shown, requested);
	const { branchId: shownBranchId, departmentId: shownDepartmentId } = shown;
	useEffect(() => {
		if (announce)
			onChange({ branchId: shownBranchId, departmentId: shownDepartmentId });
	}, [announce, shownBranchId, shownDepartmentId, onChange]);
	if (!loaded) return null;

	const { rules, branch, department, branches, departments } = selection;
	const countries = [...new Set(branches.map((choice) => choice.country))];
	const regionName = new Intl.DisplayNames([i18n.language], {
		type: "region",
	});
	const allOption = (label: string): Array<{ value: string; label: string }> =>
		rules.allowAllBranches ? [{ value: ALL, label }] : [];
	const branchesShown = branches.filter(
		(choice) => !branch || choice.country === branch.country
	);
	const chooseBranch = (next: BranchChoice | undefined): void => {
		const everyBranch = rules.startOnFirstBranch ? ALL_BRANCHES : undefined;
		onChange({ branchId: next?.branchId ?? everyBranch });
	};
	const ids = {
		country: `${id}-country`,
		branch: `${id}-branch`,
		department: `${id}-department`,
		waiting: `${id}-waiting`,
	};
	return (
		<>
			{selection.branchMode === "select" && countries.length > 1 && (
				<FormRow
					className={fieldClasses}
					htmlFor={ids.country}
					label={t("workspace.branchSelector.country")}
					layout="stacked"
				>
					<Select
						aria-labelledby={formRowIds(ids.country).labelId}
						className={selectClasses}
						value={branch?.country ?? ALL}
						options={[
							...allOption(t("workspace.branchSelector.allCountries")),
							...countries.map((country) => ({
								value: country,
								label: regionName.of(country) ?? country,
							})),
						]}
						onChange={(country) => {
							chooseBranch(
								branches.find((choice) => choice.country === country)
							);
						}}
					/>
				</FormRow>
			)}
			{selection.branchMode === "select" && (
				<FormRow
					className={fieldClasses}
					htmlFor={ids.branch}
					label={t("workspace.branchSelector.branch")}
					layout="stacked"
				>
					<Select
						aria-labelledby={formRowIds(ids.branch).labelId}
						className={selectClasses}
						value={branch?.branchId ?? ALL}
						options={[
							...allOption(t("workspace.branchSelector.allBranches")),
							...branchesShown.map((choice) => ({
								value: choice.branchId,
								label: choice.name,
							})),
						]}
						onChange={(branchId) => {
							chooseBranch(
								branches.find((choice) => choice.branchId === branchId)
							);
						}}
					/>
				</FormRow>
			)}
			{selection.branchMode === "static" && (
				<UnitText
					label={t("workspace.branchSelector.branch")}
					value={branch?.name ?? ""}
				/>
			)}
			{selection.departmentMode === "select" && (
				<FormRow
					className={fieldClasses}
					htmlFor={ids.department}
					label={t("workspace.unitSelector.department")}
					layout="stacked"
				>
					<Select
						aria-labelledby={formRowIds(ids.department).labelId}
						className={selectClasses}
						value={department?.departmentId ?? ALL}
						options={[
							{ value: ALL, label: t("workspace.unitSelector.allDepartments") },
							...departments.map((choice) => ({
								value: choice.departmentId,
								label: choice.name,
							})),
						]}
						onChange={(departmentId) => {
							onChange({
								branchId: branch?.branchId,
								departmentId: departmentId || undefined,
							});
						}}
					/>
				</FormRow>
			)}
			{selection.departmentMode === "disabled" && (
				<FormRow
					className={fieldClasses}
					htmlFor={ids.department}
					label={t("workspace.unitSelector.department")}
					layout="stacked"
				>
					<Select
						disabled
						aria-describedby={ids.waiting}
						aria-labelledby={formRowIds(ids.department).labelId}
						className={selectClasses}
						value={ALL}
						options={[
							{ value: ALL, label: t("workspace.unitSelector.allDepartments") },
						]}
					/>
					<span className="sr-only" id={ids.waiting}>
						{t("workspace.unitSelector.chooseBranchFirst")}
					</span>
				</FormRow>
			)}
			{selection.departmentMode === "static" && (
				<UnitText
					label={t("workspace.unitSelector.department")}
					value={departments[0]?.name ?? ""}
				/>
			)}
		</>
	);
};
