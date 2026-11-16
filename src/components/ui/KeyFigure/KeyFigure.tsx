import { useId, type ComponentPropsWithRef, type ReactNode } from "react";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { ArrowDownIcon, ArrowUpIcon } from "@/components/ui/Icon";

/** How a figure moved against the period before it. */
export type KeyFigureChange = {
	direction: "up" | "down";
	/** The size of the move, already formatted, e.g. "6". */
	amount: string;
	/** The move in words, for a reader who cannot see the arrow, e.g. "Up 6". */
	description: string;
};

export type KeyFigureProps = Omit<
	ComponentPropsWithRef<"section">,
	"children" | "title"
> & {
	/** What the figure counts, e.g. "People short". */
	label: string;
	/** The figure, already formatted. */
	value: string;
	/** What the figure is of or over, beside it, e.g. "next 14 days". */
	unit?: string;
	/** Whether the figure needs attention, said in words beside its label. */
	status?: { tone: BadgeTone; label: string };
	/** The move against the period before, shown before the comparison. */
	change?: KeyFigureChange;
	/** What the figure is compared with, e.g. "on the 14 days before". */
	comparison?: string;
	/** A small chart under the figure. */
	children?: ReactNode;
};

/**
 * One figure a reader takes in at a glance: what it counts, the figure,
 * its status in words, and what it is compared with. A figure without a
 * comparison says little, so give one wherever there is one.
 */
export const KeyFigure = ({
	label,
	value,
	unit,
	status,
	change,
	comparison,
	children,
	className,
	...rest
}: KeyFigureProps): FunctionComponent => {
	const labelId = useId();
	const ChangeIcon = change?.direction === "down" ? ArrowDownIcon : ArrowUpIcon;
	return (
		<section
			aria-labelledby={labelId}
			className={joinClassNames(
				"flex min-w-0 flex-col gap-2 rounded-xl border border-neutral-400 bg-white p-5",
				className
			)}
			{...rest}
		>
			<div className="flex items-start justify-between gap-2">
				<h3
					className="min-w-0 text-sm font-semibold text-neutral-800"
					id={labelId}
				>
					{label}
				</h3>
				{status && <Badge tone={status.tone}>{status.label}</Badge>}
			</div>
			<p className="flex flex-wrap items-baseline gap-x-2">
				<span className="text-[2rem] leading-10 font-semibold text-neutral-900">
					{value}
				</span>
				{unit !== undefined && (
					<span className="text-sm font-medium text-neutral-700">{unit}</span>
				)}
			</p>
			{children}
			{(change !== undefined || comparison !== undefined) && (
				<p className="flex flex-wrap items-center gap-x-1 text-xs text-neutral-700">
					{change && (
						<span className="inline-flex items-center gap-0.5 font-semibold text-neutral-800">
							<ChangeIcon aria-hidden="true" className="size-3" />
							<span aria-hidden="true">{change.amount}</span>
							<span className="sr-only">{change.description}</span>
						</span>
					)}
					{comparison}
				</p>
			)}
		</section>
	);
};
