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
	/** The units the list is narrowed to, e.g. a `UnitSelector`; left out when the list has none. */
	scope?: ReactNode;
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
	/**
	 * The filters that are set. Given, the toolbar keeps its filters behind a
	 * "Filters" button (with `filterFields` and the "Showing" filter inside)
	 * and lists these as chips beneath; left out, "Showing" sits inline.
	 */
	chips?: ReadonlyArray<FilterChip>;
	/** Further fields of the Filters panel, before "Showing", e.g. a `DepartmentFilter`. */
	filterFields?: ReactNode;
	/** Sets every filter back to its default ("Clear filters"). */
	onClearFilters?: () => void;
	className?: string;
};

/**
 * A list's `PageToolbar`: search, its filters, then its actions with the
 * primary one last. With `chips`, the filters wait behind a "Filters"
 * button and the ones set are listed beneath; without, the "Showing"
 * filter sits inline. Every Organisation list and People use it.
 */
export const ListToolbar = ({
	searchLabel,
	search,
	onSearchChange,
	createLabel,
	onCreate,
	actions,
	secondaryAction,
	scope,
	filter,
	multipleFilter,
	chips,
	filterFields,
	onClearFilters,
	className,
}: ListToolbarProps): FunctionComponent => {
	const { t } = useTranslation();
	const filterId = useId();
	const filterLabel = (filter ?? multipleFilter)?.label;
	const labelledBy = formRowIds(filterId).labelId;
	const hasActions = Boolean(actions || secondaryAction || onCreate);
	const behindButton = chips !== undefined;
	const statusField = filterLabel !== undefined && (
		<FormRow
			className={behindButton ? undefined : "w-full sm:w-40"}
			htmlFor={filterId}
			label={filterLabel}
			layout="stacked"
		>
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
			inputSize={behindButton ? "lg" : undefined}
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
			scope={behindButton ? undefined : scope}
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
				behindButton && (
					<FilterChips
						chips={chips}
						onClearAll={() => {
							onClearFilters?.();
						}}
					/>
				)
			}
			filters={
				behindButton ? (
					<>
						{searchBox}
						{hasFilterFields && (
							<FiltersPopover count={chips.length}>
								{filterFields}
								{statusField}
							</FiltersPopover>
						)}
					</>
				) : (
					<>
						{statusField}
						{searchBox}
					</>
				)
			}
			onClearFilters={behindButton ? undefined : onClearFilters}
		/>
	);
};
