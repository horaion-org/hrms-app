import { useId, useState, type ReactNode } from "react";
import type { FunctionComponent, Heroicon } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { PlusIcon } from "@/components/ui/Icon";

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
	/** Starts folded, saying `summary`, until opened with the show label. */
	folded?: { summary: string; showLabel: string; hideLabel: string };
	/** Said in place of the rows when there are none. */
	emptyText?: string;
	/** The section's rows, each a ConstraintRow. */
	children?: ReactNode;
};

/**
 * One purpose's constraints on the Constraints page and the work policy: an
 * icon, its title with a count and what it decides, an Add for that purpose,
 * then its rows in one card. The company's section starts folded to a line.
 */
export const ConstraintSection = ({
	title,
	description,
	icon: Icon,
	count,
	add,
	action,
	folded,
	emptyText,
	children,
}: ConstraintSectionProps): FunctionComponent => {
	const id = useId();
	const headingId = `${id}-heading`;
	const rowsId = `${id}-rows`;
	const [open, setOpen] = useState(folded === undefined);
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
						{title}{" "}
						<span className="font-medium text-neutral-700">· {count}</span>
					</h3>
					<p className="text-xs text-neutral-700">{description}</p>
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
			<div className="rounded-xl border border-neutral-400 bg-white">
				{folded && (
					<div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
						{!open && (
							<p className="min-w-0 flex-1 text-sm text-neutral-800">
								{folded.summary}
							</p>
						)}
						<Button
							aria-controls={rowsId}
							aria-expanded={open}
							className="ml-auto"
							variant="textlink"
							onClick={() => {
								setOpen(!open);
							}}
						>
							{open ? folded.hideLabel : folded.showLabel}
						</Button>
					</div>
				)}
				<ul
					className="divide-y divide-neutral-300 border-neutral-300 [&:not(:first-child)]:border-t"
					hidden={!open}
					id={rowsId}
				>
					{children}
				</ul>
				{open && count === 0 && emptyText && (
					<p className="px-6 py-4 text-sm text-neutral-800">{emptyText}</p>
				)}
			</div>
		</section>
	);
};
