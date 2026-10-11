import { useQuery } from "@tanstack/react-query";
import { useEffect, useId } from "react";
import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Select } from "@/components/forms/Select";
import { workspaceQuery } from "@/features/workspace/api";
import { branchChoices, chosenBranch } from "@/features/workspace/unitChoices";
import type { PermissionKey } from "@/features/workspace/permissionKeys";
import { retry } from "@/features/workspace/retry";

/** The option value standing for every Branch, or every country; never a real id or code. */
const ALL = "";

export type BranchSelectorProps = {
	companyId: string;
	/** A Branch is offered when any of these is effective at it or at a Department beneath it (navigation only, not Branch authority). */
	keys: ReadonlyArray<PermissionKey>;
	/** The chosen Branch's id; undefined, or one no longer offered, means the default. */
	value?: string;
	/** Undefined only with `allowAll`, for every Branch. */
	onChange: (branchId: string | undefined) => void;
	/** Offers "All branches" and "All countries", and makes "all" the default. */
	allowAll?: boolean;
	/** Offers only ACTIVE Branches. */
	activeOnly?: boolean;
	className?: string;
};

/**
 * The Country and Branch a page is narrowed to, offered from the caller's
 * workspace rather than the Branch list, so a page never depends on
 * `branch:read`. Branches are sorted by country, then name; the Country
 * select is left out when every offered Branch shares one country, and
 * choosing a country chooses its first Branch.
 *
 * Without `allowAll`, when `value` is undefined or not offered, the first
 * offered Branch is announced through `onChange` once, so the page's state
 * names the Branch it shows. With `allowAll`, "all" is the default and is
 * announced (as undefined) only to clear a `value` no longer offered.
 * Nothing is rendered until the workspace has loaded or when no Branch is
 * offered: the page decides what to say then.
 *
 * Pages that create or assign pass `activeOnly`; pages that read do not,
 * since an inactive Branch may still hold history.
 */
export const BranchSelector = ({
	companyId,
	keys,
	value,
	onChange,
	allowAll = false,
	activeOnly = false,
	className,
}: BranchSelectorProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const id = useId();
	const { data } = useQuery({ ...workspaceQuery, retry });
	const choices = data
		? branchChoices(data, companyId, keys, { activeOnly })
		: [];
	const selected = chosenBranch(choices, value, allowAll);
	const selectedId = selected?.branchId;
	const loaded = choices.length > 0;
	useEffect(() => {
		if (loaded && selectedId !== value) onChange(selectedId);
	}, [loaded, selectedId, value, onChange]);
	if (!loaded) return null;

	const countries = [...new Set(choices.map((choice) => choice.country))];
	const regionName = new Intl.DisplayNames([i18n.language], {
		type: "region",
	});
	const countryOptions = [
		...(allowAll
			? [{ value: ALL, label: t("workspace.branchSelector.allCountries") }]
			: []),
		...countries.map((country) => ({
			value: country,
			label: regionName.of(country) ?? country,
		})),
	];
	const branchOptions = [
		...(allowAll
			? [{ value: ALL, label: t("workspace.branchSelector.allBranches") }]
			: []),
		...choices
			.filter((choice) => !selected || choice.country === selected.country)
			.map((choice) => ({ value: choice.branchId, label: choice.name })),
	];
	const chooseCountry = (country: string): void => {
		if (country === ALL) {
			onChange(undefined);
			return;
		}
		const first = choices.find((choice) => choice.country === country);
		if (first) onChange(first.branchId);
	};
	const chooseBranch = (branch: string): void => {
		onChange(branch === ALL ? undefined : branch);
	};
	const countryId = `${id}-country`;
	const branchId = `${id}-branch`;
	return (
		<div
			className={joinClassNames("flex flex-wrap items-center gap-5", className)}
		>
			{countries.length > 1 && (
				<FormRow
					fieldWidth="sm:w-44"
					htmlFor={countryId}
					label={t("workspace.branchSelector.country")}
				>
					<Select
						aria-labelledby={formRowIds(countryId).labelId}
						className="w-full font-semibold text-ink-blue-900"
						options={countryOptions}
						value={selected?.country ?? ALL}
						onChange={chooseCountry}
					/>
				</FormRow>
			)}
			<FormRow
				fieldWidth="sm:w-44"
				htmlFor={branchId}
				label={t("workspace.branchSelector.branch")}
			>
				<Select
					aria-labelledby={formRowIds(branchId).labelId}
					className="w-full font-semibold text-ink-blue-900"
					options={branchOptions}
					value={selectedId ?? ALL}
					onChange={chooseBranch}
				/>
			</FormRow>
		</div>
	);
};
