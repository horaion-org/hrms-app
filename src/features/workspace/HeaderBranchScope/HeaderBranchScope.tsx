import { useId } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Select } from "@/components/forms/Select";
import {
	ALL_BRANCHES,
	offersAllBranches,
	type ResolvedUnitSelection,
} from "@/features/workspace/unitSelection";

export type HeaderBranchScopeProps = {
	/** The page's Branch, resolved with its rules (see `useHeaderBranchScope`). */
	selection: ResolvedUnitSelection;
	/** Called with a Branch id, or `ALL_BRANCHES` for every Branch. */
	onChange: (branchId: string) => void;
};

const labelClasses = "hidden text-sm text-neutral-800 sm:inline";

/**
 * The Branch the page lists, at the right of the app header, in the same
 * place on every page that lists by Branch: the one Branch control there
 * is. One Branch in reach reads as text. Several are a choice, grouped by
 * country when they span several, with "All branches" last. The label
 * shows from `sm` up; below it, it still names the control for assistive
 * technology.
 */
export const HeaderBranchScope = ({
	selection,
	onChange,
}: HeaderBranchScopeProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const labelId = useId();
	const { branch, branches, branchMode } = selection;
	const label = t("workspace.branchSelector.branch");
	if (branchMode === "static")
		return (
			<p className="flex items-center gap-3">
				<span className={labelClasses}>{label}</span>
				<span className="font-semibold text-ink-blue-900">{branch?.name}</span>
			</p>
		);
	const severalCountries =
		new Set(branches.map((each) => each.country)).size > 1;
	const regionName = new Intl.DisplayNames([i18n.language], {
		type: "region",
	});
	return (
		<div className="flex items-center gap-3">
			<span className={labelClasses} id={labelId}>
				{label}
			</span>
			<Select
				aria-labelledby={labelId}
				className="w-40 font-semibold text-ink-blue-900 sm:w-56"
				value={branch?.branchId ?? ALL_BRANCHES}
				options={[
					...branches.map((choice) => ({
						value: choice.branchId,
						label: choice.name,
						...(severalCountries
							? { group: regionName.of(choice.country) ?? choice.country }
							: {}),
					})),
					...(offersAllBranches(branches)
						? [
								{
									value: ALL_BRANCHES,
									label: t("workspace.branchSelector.allBranches"),
								},
							]
						: []),
				]}
				onChange={onChange}
			/>
		</div>
	);
};
