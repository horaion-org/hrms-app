import { Link, type LinkProps } from "@tanstack/react-router";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent, Heroicon } from "@/common/types";

export type QuickAction = {
	label: string;
	icon: Heroicon;
	to: NonNullable<LinkProps["to"]>;
};

export type QuickActionsProps = {
	/** Shortcuts in display order; four fill a two-by-two grid. */
	actions: Array<QuickAction>;
	/** Names the list for assistive tech. */
	label: string;
	className?: string;
};

/** Shortcuts to the tasks people start most, as tiles. */
export const QuickActions = ({
	actions,
	label,
	className,
}: QuickActionsProps): FunctionComponent => (
	<ul
		aria-label={label}
		className={joinClassNames("grid grid-cols-2 gap-6", className)}
	>
		{actions.map(({ label: actionLabel, icon: Icon, to }) => (
			<li key={actionLabel}>
				<Link
					className="flex h-33.5 flex-col items-center justify-center gap-4 rounded bg-neutral-200 px-4 text-center text-sm font-semibold text-neutral-900 hover:bg-neutral-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-blue-500"
					to={to}
				>
					<Icon aria-hidden="true" className="size-8 text-ink-blue-900" />
					{actionLabel}
				</Link>
			</li>
		))}
	</ul>
);
