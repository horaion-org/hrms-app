import { useId } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Select } from "@/components/forms/Select";
import type { FixedBranch } from "@/features/workspace/branchScope";
import {
	ALL_BRANCHES,
	offersAllBranches,
	type ResolvedUnitSelection,
} from "@/features/workspace/unitSelection";

export type HeaderBranchScopeProps =
	| {
			/** The page's Branch, resolved with its rules (see `useHeaderBranchScope`). */
			selection: ResolvedUnitSelection;
			/** Called with a Branch id, or `ALL_BRANCHES` for every Branch. */
			onChange: (branchId: string) => void;
	  }
	| {
			/** The one Branch the page is about, such as a schedule's. */
			fixed: FixedBranch;
	  };

// Named in words from `lg`; below it the header shares the dark navigation bar (`AppShell`) and the field speaks for itself.
const labelClasses = "hidden text-sm text-neutral-800 lg:inline";

/** A Branch that is not chosen here, named as text under the same label. */
const BranchText = ({
	name,
}: {
	name: string | undefined;
}): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<p className="flex min-w-0 items-center gap-3">
			<span className={labelClasses}>
				{t("workspace.branchSelector.branch")}
			</span>
			<span className="truncate font-semibold text-ink-blue-900 max-lg:text-white">
				{name}
			</span>
		</p>
	);
};

/** The Branch the page lists: a choice when several are in reach, else the one as text. */
const BranchChoice = ({
	selection,
	onChange,
}: Extract<
	HeaderBranchScopeProps,
	{ selection: unknown }
>): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const labelId = useId();
	const { branch, branches, branchMode } = selection;
	const label = t("workspace.branchSelector.branch");
	if (branchMode === "static") return <BranchText name={branch?.name} />;
	const severalCountries =
		new Set(branches.map((each) => each.country)).size > 1;
	const regionName = new Intl.DisplayNames([i18n.language], {
		type: "region",
	});
	return (
		<div className="flex min-w-0 items-center gap-3">
			<span className={labelClasses} id={labelId}>
				{label}
			</span>
			<Select
				aria-labelledby={labelId}
				// Fills the room the header's actions leave on a phone, its padding tighter in the navigation bar; a fixed width from `sm`.
				className="w-full min-w-0 font-semibold text-ink-blue-900 max-lg:gap-2 max-lg:px-3 sm:w-56"
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

/**
 * The Branch the page lists, at the right of the app header, in the same
 * place on every page that lists by Branch: the one Branch control there
 * is. A page about one Branch, and one Branch in reach, read as text.
 * Several are a choice, grouped by
 * country when they span several, with "All branches" last. The label
 * shows from `sm` up; below it, it still names the control for assistive
 * technology.
 */
export const HeaderBranchScope = (
	props: HeaderBranchScopeProps
): FunctionComponent => {
	if ("fixed" in props) return <BranchText name={props.fixed.name} />;
	return <BranchChoice {...props} />;
};
