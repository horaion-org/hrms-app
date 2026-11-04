import { useId } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Select } from "@/components/forms/Select";
import type { BranchChoice } from "@/features/workspace/unitChoices";
import {
	ALL_BRANCHES,
	type ResolvedUnitSelection,
} from "@/features/workspace/unitSelection";

export type HeaderBranchScopeProps = {
	/** The page's Branch, resolved with its rules (see `useHeaderBranchScope`). */
	selection: ResolvedUnitSelection;
	/** Called with a Branch id, or `ALL_BRANCHES` for every Branch. */
	onChange: (branchId: string) => void;
};

/**
 * The Branch the page lists, in the app header: the one scope shared by
 * every list. "All branches" is offered where the page allows it. When the
 * offered Branches span several countries, each is named with its country
 * ("Singapore › Orchard"), so there is no separate Country control. A
 * single Branch the page must show reads as text.
 */
export const HeaderBranchScope = ({
	selection,
	onChange,
}: HeaderBranchScopeProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const id = useId();
	const { branch, branches, branchMode, rules } = selection;
	const label = t("workspace.branchSelector.branch");
	if (branchMode === "static")
		return (
			<p className="flex items-center gap-6 text-base text-neutral-800">
				{label}
				<span className="font-semibold text-ink-blue-900">{branch?.name}</span>
			</p>
		);
	const severalCountries =
		new Set(branches.map((each) => each.country)).size > 1;
	const regionName = new Intl.DisplayNames([i18n.language], { type: "region" });
	const nameOf = (choice: BranchChoice): string =>
		severalCountries
			? t("workspace.headerScope.branchInCountry", {
					country: regionName.of(choice.country) ?? choice.country,
					branch: choice.name,
				})
			: choice.name;
	return (
		<FormRow
			className="sm:[&>label]:self-center"
			fieldWidth="sm:w-64"
			htmlFor={id}
			label={label}
		>
			<Select
				aria-labelledby={formRowIds(id).labelId}
				className="w-full font-semibold text-ink-blue-900"
				value={branch?.branchId ?? ALL_BRANCHES}
				options={[
					...(rules.allowAllBranches
						? [
								{
									value: ALL_BRANCHES,
									label: t("workspace.branchSelector.allBranches"),
								},
							]
						: []),
					...branches.map((choice) => ({
						value: choice.branchId,
						label: nameOf(choice),
					})),
				]}
				onChange={onChange}
			/>
		</FormRow>
	);
};
