import { useId, type ReactNode } from "react";
import type { FunctionComponent, Heroicon } from "@/common/types";
import { Button } from "@/components/ui/Button";
import {
	ChevronDownIcon,
	ChevronRightIcon,
	PlusIcon,
} from "@/components/ui/Icon";

export type ConstraintSectionProps = {
	title: string;
	/** One line on what the section's constraints decide. */
	description: string;
	icon: Heroicon;
	/** How many constraints the section holds, said beside its title. */
	count: number;
	/** Adds a constraint of this purpose; left out where the person may not add. */
	add?: { label: string; onAdd: () => void };
	/** A link beside the title, such as where the section's constraints are set. */
	action?: ReactNode;
	/**
	 * Lets the heading fold the section: whether it is open, what a click on the
	 * heading does, and the one line said while it is closed. Without it the
	 * section is always open.
	 */
	collapse?: { open: boolean; onToggle: () => void; gist: ReactNode };
	/** Said in place of the rows when there are none. */
	emptyText?: string;
	/** The section's rows, each a ConstraintRow. */
	children?: ReactNode;
};

/**
 * One purpose's constraints on the Constraints page and the work policy: an
 * icon, its title with a count and what it decides, an Add for that purpose,
 * then its rows in one card. A foldable section's title is the button that
 * folds it, and a closed section says its gist in one line.
 */
export const ConstraintSection = ({
	title,
	description,
	icon: Icon,
	count,
	add,
	action,
	collapse,
	emptyText,
	children,
}: ConstraintSectionProps): FunctionComponent => {
	const id = useId();
	const headingId = `${id}-heading`;
	const bodyId = `${id}-body`;
	const open = collapse?.open ?? true;
	const titleText = (
		<>
			{title} <span className="font-medium text-neutral-700">· {count}</span>
		</>
	);
	return (
		<section aria-labelledby={headingId} className="flex flex-col gap-3">
			<div className="flex flex-wrap items-center gap-3">
				<span
					aria-hidden="true"
					className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-ink-blue-50 text-ink-blue-900 [&_svg]:size-6"
				>
					<Icon />
				</span>
				<div className="min-w-0 flex-1">
					<h3 className="text-xl font-semibold text-neutral-900" id={headingId}>
						{collapse ? (
							<button
								aria-controls={bodyId}
								aria-expanded={open}
								className="inline-flex cursor-pointer items-center gap-2 rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-blue-500"
								type="button"
								onClick={collapse.onToggle}
							>
								{open ? (
									<ChevronDownIcon
										aria-hidden="true"
										className="size-5 shrink-0"
									/>
								) : (
									<ChevronRightIcon
										aria-hidden="true"
										className="size-5 shrink-0"
									/>
								)}
								<span>{titleText}</span>
							</button>
						) : (
							titleText
						)}
					</h3>
					<p className="text-xs text-neutral-700">
						{collapse && !open ? collapse.gist : description}
					</p>
				</div>
				{action}
				{add && (
					<Button
						leadingIcon={<PlusIcon />}
						variant="textlink"
						onClick={add.onAdd}
					>
						{add.label}
					</Button>
				)}
			</div>
			<div hidden={!open} id={bodyId}>
				{count === 0 && emptyText ? (
					// Nothing to list: one quiet line, not an empty box.
					<p className="text-sm text-neutral-700">{emptyText}</p>
				) : (
					<ul className="divide-y divide-neutral-300 rounded-xl border border-neutral-400 bg-white">
						{children}
					</ul>
				)}
			</div>
		</section>
	);
};
