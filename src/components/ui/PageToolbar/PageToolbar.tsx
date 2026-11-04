import type { ReactNode } from "react";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";

export type PageToolbarProps = {
	/** Names the group for assistive technology, e.g. "People list controls". */
	label: string;
	/** What narrows or moves the list: search, the Filters button, a period. */
	filters?: ReactNode;
	/** What can be done from the list, primary action last. */
	actions?: ReactNode;
	/** The filters that are set, on their own row beneath, e.g. `FilterChips`. */
	chips?: ReactNode;
	className?: string;
};

const zoneClasses = "flex w-full flex-wrap items-center gap-4 sm:w-auto";
const actionZoneClasses =
	"ml-auto flex w-full flex-wrap items-center justify-end gap-3 sm:w-auto";

/**
 * The one row above a list: its filters, then its actions, the same on
 * every page, with the filters that are set beneath. Zones wrap rather
 * than scroll and each takes the full width below `sm`. A labelled group,
 * not an ARIA toolbar: its controls keep their own tab stops. The listed
 * Branch is not here: it is the app header's scope.
 */
export const PageToolbar = ({
	label,
	filters,
	actions,
	chips,
	className,
}: PageToolbarProps): FunctionComponent => (
	<div
		aria-label={label}
		role="group"
		className={joinClassNames(
			"flex flex-wrap items-center gap-x-6 gap-y-4",
			className
		)}
	>
		{filters && (
			<div className={joinClassNames(zoneClasses, "min-w-0 lg:flex-1")}>
				{filters}
			</div>
		)}
		{actions && <div className={actionZoneClasses}>{actions}</div>}
		{chips && <div className="w-full">{chips}</div>}
	</div>
);
