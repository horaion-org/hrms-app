import { useId, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Input } from "@/components/forms/Input";
import { Select, type SelectOption } from "@/components/forms/Select";
import { Button } from "@/components/ui/Button";
import { FilterChips, type FilterChip } from "@/components/ui/FilterChips";
import { FiltersPopover } from "@/components/ui/FiltersPopover";
import { PlusIcon, SearchIcon } from "@/components/ui/Icon";
import { PageToolbar } from "@/components/ui/PageToolbar";

export type ListToolbarProps = {
	/** Names the search box and shows as its placeholder, e.g. "Search Branch". */
	searchLabel: string;
	search: string;
	onSearchChange: (search: string) => void;
	/** The primary action's label, e.g. "Create Branch"; needed only with `onCreate`. */
	createLabel?: string;
	onCreate?: () => void;
	/** Further controls before the others, e.g. Import and Export buttons or a link. */
	actions?: ReactNode;
	/** A second action beside the primary one, e.g. "Assign role"; left out when there is none. */
	secondaryAction?: { label: string; onClick: () => void };
	/** The "Showing" filter, labelled above its select; left out when the list has none. */
	filter?: {
		label: string;
		value: string;
		options: Array<SelectOption>;
		onChange: (value: string) => void;
	};
	/**
	 * The "Showing" filter with each option ticked on its own, in place of
	 * `filter`. `placeholder` and `formatSummary` name the choice when none or
	 * several are ticked.
	 */
	multipleFilter?: {
		label: string;
		value: Array<string>;
		options: Array<SelectOption>;
		onChange: (value: Array<string>) => void;
		placeholder?: string;
		formatSummary?: (selected: Array<SelectOption>) => string;
	};
	/** The filters that are set, listed as chips beneath; none by default. */
	chips?: ReadonlyArray<FilterChip>;
	/** Further fields of the Filters panel, before "Showing", e.g. a `DepartmentFilter`. */
	filterFields?: ReactNode;
	/** Sets every filter back to its default ("Clear filters"). */
	onClearFilters?: () => void;
	className?: string;
};

/**
 * A list's `PageToolbar`: search, then a "Filters" button holding
 * `filterFields` and the "Showing" filter (left out when the list has no
 * filter), then its actions with the primary one last. The filters that
 * are set are listed as chips beneath, with "Clear filters". Every
 * Organisation list, People and Scheduling use it.
 */
export const ListToolbar = ({
	searchLabel,
	search,
	onSearchChange,
	createLabel,
	onCreate,
	actions,
	secondaryAction,
	filter,
	multipleFilter,
	chips = [],
	filterFields,
	onClearFilters,
	className,
}: ListToolbarProps): FunctionComponent => {
	const { t } = useTranslation();
	const filterId = useId();
	const filterLabel = (filter ?? multipleFilter)?.label;
	const labelledBy = formRowIds(filterId).labelId;
	const hasActions = Boolean(actions || secondaryAction || onCreate);
	const statusField = filterLabel !== undefined && (
		<FormRow htmlFor={filterId} label={filterLabel} layout="stacked">
			{filter && (
				<Select
					aria-labelledby={labelledBy}
					className="w-full font-semibold"
					options={filter.options}
					value={filter.value}
					onChange={filter.onChange}
				/>
			)}
			{!filter && multipleFilter && (
				<Select
					multiple
					aria-labelledby={labelledBy}
					className="w-full font-semibold"
					formatSummary={multipleFilter.formatSummary}
					options={multipleFilter.options}
					placeholder={multipleFilter.placeholder}
					value={multipleFilter.value}
					onChange={multipleFilter.onChange}
				/>
			)}
		</FormRow>
	);
	const searchBox = (
		<Input
			aria-label={searchLabel}
			className="w-full min-w-0 sm:w-72 lg:w-auto lg:min-w-60 lg:flex-1"
			inputSize="lg"
			leadingIcon={<SearchIcon />}
			placeholder={searchLabel}
			type="search"
			value={search}
			onChange={(event) => {
				onSearchChange(event.target.value);
			}}
		/>
	);
	const hasFilterFields = Boolean(filterFields) || Boolean(statusField);
	return (
		<PageToolbar
			className={className}
			label={t("pageToolbar.listControls")}
			actions={
				hasActions && (
					<>
						{actions}
						{secondaryAction && (
							<Button variant="secondary" onClick={secondaryAction.onClick}>
								{secondaryAction.label}
							</Button>
						)}
						{onCreate && (
							<Button leadingIcon={<PlusIcon />} onClick={onCreate}>
								{createLabel}
							</Button>
						)}
					</>
				)
			}
			chips={
				chips.length > 0 && (
					<FilterChips
						chips={chips}
						onClearAll={() => {
							onClearFilters?.();
						}}
					/>
				)
			}
			filters={
				// On a phone the search and the Filters button share one row; from `sm` the wrapper steps aside.
				<div className="flex w-full min-w-0 items-center gap-4 sm:contents">
					{searchBox}
					{hasFilterFields && (
						<FiltersPopover count={chips.length}>
							{filterFields}
							{statusField}
						</FiltersPopover>
					)}
				</div>
			}
		/>
	);
};
