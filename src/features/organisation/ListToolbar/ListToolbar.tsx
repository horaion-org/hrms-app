import { useId, type ReactNode } from "react";
import type { FunctionComponent } from "@/common/types";
import { Input } from "@/components/forms/Input";
import { Select, type SelectOption } from "@/components/forms/Select";
import { Button } from "@/components/ui/Button";
import { PlusIcon, SearchIcon } from "@/components/ui/Icon";

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
	/** The "Showing:" filter under the toolbar; left out when the list has none. */
	filter?: {
		label: string;
		value: string;
		options: Array<SelectOption>;
		onChange: (value: string) => void;
	};
	/**
	 * The "Showing:" filter with each option ticked on its own, in place of
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
	className?: string;
};

/** A list's search, create action, and status filter; People uses it too. */
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
	className,
}: ListToolbarProps): FunctionComponent => {
	const filterLabelId = useId();
	const filterLabel = (filter ?? multipleFilter)?.label;
	return (
		<div className={className}>
			<div className="flex flex-wrap items-center justify-between gap-4">
				<Input
					aria-label={searchLabel}
					className="w-full min-w-0 lg:flex-1"
					inputSize="lg"
					leadingIcon={<SearchIcon />}
					placeholder={searchLabel}
					type="search"
					value={search}
					onChange={(event) => {
						onSearchChange(event.target.value);
					}}
				/>
				<div className="ml-auto flex w-full flex-wrap items-center justify-end gap-3 lg:w-auto">
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
				</div>
			</div>
			{filterLabel !== undefined && (
				<div className="mt-10 flex items-center gap-3">
					<span
						className="min-w-15.5 text-sm font-medium text-neutral-800"
						id={filterLabelId}
					>
						{filterLabel}
					</span>
					{filter && (
						<Select
							aria-labelledby={filterLabelId}
							className="w-40 font-semibold"
							options={filter.options}
							value={filter.value}
							onChange={filter.onChange}
						/>
					)}
					{!filter && multipleFilter && (
						<Select
							multiple
							aria-labelledby={filterLabelId}
							className="w-40 font-semibold"
							formatSummary={multipleFilter.formatSummary}
							options={multipleFilter.options}
							placeholder={multipleFilter.placeholder}
							value={multipleFilter.value}
							onChange={multipleFilter.onChange}
						/>
					)}
				</div>
			)}
		</div>
	);
};
