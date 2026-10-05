import { useId } from "react";
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
	/** The primary action's label, e.g. "Create Branch". */
	createLabel: string;
	onCreate?: () => void;
	/** A second action beside the primary one, e.g. "Assign role"; left out when there is none. */
	secondaryAction?: { label: string; onClick: () => void };
	/** The "Showing:" filter under the toolbar; left out when the list has none. */
	filter?: {
		label: string;
		value: string;
		options: Array<SelectOption>;
		onChange: (value: string) => void;
	};
	className?: string;
};

/** An Organisation list's search, create action, and status filter. */
export const ListToolbar = ({
	searchLabel,
	search,
	onSearchChange,
	createLabel,
	onCreate,
	secondaryAction,
	filter,
	className,
}: ListToolbarProps): FunctionComponent => {
	const filterLabelId = useId();
	return (
		<div className={className}>
			<div className="flex flex-wrap items-center justify-between gap-4">
				<Input
					aria-label={searchLabel}
					className="w-full sm:w-97.5"
					leadingIcon={<SearchIcon />}
					placeholder={searchLabel}
					type="search"
					value={search}
					onChange={(event) => {
						onSearchChange(event.target.value);
					}}
				/>
				<div className="flex flex-wrap items-center gap-3">
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
			{filter && (
				<div className="mt-10 flex items-center gap-3">
					<span
						className="min-w-15.5 text-sm font-medium text-neutral-800"
						id={filterLabelId}
					>
						{filter.label}
					</span>
					<Select
						aria-labelledby={filterLabelId}
						className="w-40 font-semibold"
						options={filter.options}
						value={filter.value}
						onChange={filter.onChange}
					/>
				</div>
			)}
		</div>
	);
};
