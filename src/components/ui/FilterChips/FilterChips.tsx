import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CrossIcon } from "@/components/ui/Icon";

/** One filter that is set, named as it reads, e.g. "Department: Kitchen". */
export type FilterChip = {
	key: string;
	label: string;
	onRemove: () => void;
};

export type FilterChipsProps = {
	chips: ReadonlyArray<FilterChip>;
	/** Sets every filter back to its default. */
	onClearAll: () => void;
	className?: string;
};

/**
 * The filters that are set, as a labelled list of chips, each removable on
 * its own, then "Clear filters". Nothing renders while no filter is set, so
 * an unfiltered list shows no row at all.
 */
export const FilterChips = ({
	chips,
	onClearAll,
	className,
}: FilterChipsProps): FunctionComponent => {
	const { t } = useTranslation();
	if (chips.length === 0) return null;
	return (
		<div
			className={joinClassNames("flex flex-wrap items-center gap-3", className)}
		>
			<ul
				aria-label={t("filterChips.label")}
				className="flex flex-wrap items-center gap-2"
			>
				{chips.map((chip) => (
					<li key={chip.key} className="inline-flex items-center">
						<Badge>{chip.label}</Badge>
						<Button
							aria-label={t("filterChips.remove", { label: chip.label })}
							className="size-7 [&_svg]:size-3.5"
							variant="icon"
							onClick={chip.onRemove}
						>
							<CrossIcon />
						</Button>
					</li>
				))}
			</ul>
			<Button variant="textlink" onClick={onClearAll}>
				{t("pageToolbar.clearFilters")}
			</Button>
		</div>
	);
};
