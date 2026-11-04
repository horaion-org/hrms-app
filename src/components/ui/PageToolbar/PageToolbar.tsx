import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";

export type PageToolbarProps = {
	/** Names the group for assistive technology, e.g. "People list controls". */
	label: string;
	/** What the list is narrowed to, e.g. the Branch and Department selectors. */
	scope?: ReactNode;
	/** What narrows the list within that scope: a status, a period, a search. */
	filters?: ReactNode;
	/** What can be done from the list, primary action last. */
	actions?: ReactNode;
	/** Offers "Clear filters" at the end of the filters; given only while a filter differs from its default. */
	onClearFilters?: () => void;
	className?: string;
};

const zoneClasses = "flex w-full flex-wrap items-end gap-4 sm:w-auto";
const actionZoneClasses =
	"ml-auto flex w-full flex-wrap items-center justify-end gap-3 sm:w-auto";

/**
 * The bar above a list: scope, then filters, then actions, in that order on
 * every page. Zones wrap rather than scroll and each takes the full width
 * below `sm`. A labelled group, not an ARIA toolbar: its controls keep their
 * own tab stops.
 */
export const PageToolbar = ({
	label,
	scope,
	filters,
	actions,
	onClearFilters,
	className,
}: PageToolbarProps): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<div
			aria-label={label}
			role="group"
			className={joinClassNames(
				"flex flex-wrap items-end gap-x-6 gap-y-4",
				className
			)}
		>
			{scope && <div className={zoneClasses}>{scope}</div>}
			{(filters || onClearFilters) && (
				<div className={joinClassNames(zoneClasses, "min-w-0 lg:flex-1")}>
					{filters}
					{onClearFilters && (
						<Button
							className="h-11"
							variant="textlink"
							onClick={onClearFilters}
						>
							{t("pageToolbar.clearFilters")}
						</Button>
					)}
				</div>
			)}
			{actions && <div className={actionZoneClasses}>{actions}</div>}
		</div>
	);
};
