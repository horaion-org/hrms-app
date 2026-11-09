import { Tab as HeadlessTab } from "@headlessui/react";
import { useId, type ComponentPropsWithRef, type ReactNode } from "react";
import type { FunctionComponent } from "@/common/types";
import { joinClassNames } from "@/common/joinClassNames";
import { CountBadge, type CountBadgeProps } from "@/components/ui/CountBadge";
import { ChevronRightIcon } from "@/components/ui/Icon";
import {
	useTabsOrientation,
	type TabsOrientation,
} from "@/components/ui/Tabs/Tabs/Tabs.context";

export type TabProps = Omit<ComponentPropsWithRef<"button">, "children"> & {
	children?: ReactNode;
	count?: number;
	/**
	 * What `count` counts, in words, e.g. "4 pending". Given, the badge is
	 * hidden from assistive technology and this describes the tab instead,
	 * so the tab's name stays its label.
	 */
	countLabel?: string;
	/**
	 * A short line about the view, such as "Core workspace preferences.". It is
	 * the tab's accessible description, never part of its name. Vertical Tabs
	 * show it under the label; horizontal Tabs keep their one-line height and
	 * expose it to assistive technology only.
	 */
	description?: ReactNode;
};

const horizontalClasses =
	"inline-flex h-10 shrink-0 pointer-coarse:min-h-11 flex-nowrap items-center justify-center gap-2 border-b-2 border-transparent px-1 text-base whitespace-nowrap text-neutral-600 outline-none not-data-disabled:data-selected:border-ink-blue-900 not-data-disabled:data-selected:text-ink-blue-900 not-data-disabled:not-data-selected:data-hover:text-ink-blue-700 data-disabled:text-neutral-400 data-disabled:cursor-not-allowed data-focus:outline-2 data-focus:outline-solid data-focus:outline-offset-2 data-focus:outline-ink-blue-500";

/* Rows sit flush inside a bordered card, so the focus ring is drawn inside. */
const verticalClasses =
	"grid min-h-25 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 border-b border-neutral-400 bg-white px-5 py-5 text-left text-neutral-900 outline-none not-data-disabled:data-selected:bg-neutral-100 not-data-disabled:not-data-selected:data-hover:bg-neutral-50 data-disabled:cursor-not-allowed data-disabled:text-neutral-400 data-focus:outline-2 data-focus:outline-solid data-focus:-outline-offset-2 data-focus:outline-ink-blue-500";

/* Below `md` a horizontal tab, from `md` a vertical row: the two sets above, each behind its breakpoint. */
const verticalFromMdClasses =
	"max-md:inline-flex max-md:h-10 max-md:shrink-0 max-md:pointer-coarse:min-h-11 max-md:flex-nowrap max-md:items-center max-md:justify-center max-md:gap-2 max-md:border-b-2 max-md:border-transparent max-md:px-1 max-md:text-base max-md:whitespace-nowrap max-md:text-neutral-600 max-md:outline-none max-md:not-data-disabled:data-selected:border-ink-blue-900 max-md:not-data-disabled:data-selected:text-ink-blue-900 max-md:not-data-disabled:not-data-selected:data-hover:text-ink-blue-700 max-md:data-disabled:text-neutral-400 max-md:data-disabled:cursor-not-allowed max-md:data-focus:outline-2 max-md:data-focus:outline-solid max-md:data-focus:outline-offset-2 max-md:data-focus:outline-ink-blue-500 " +
	"md:grid md:min-h-25 md:w-full md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-x-4 md:border-b md:border-neutral-400 md:bg-white md:px-5 md:py-5 md:text-left md:text-neutral-900 md:outline-none md:not-data-disabled:data-selected:bg-neutral-100 md:not-data-disabled:not-data-selected:data-hover:bg-neutral-50 md:data-disabled:cursor-not-allowed md:data-disabled:text-neutral-400 md:data-focus:outline-2 md:data-focus:outline-solid md:data-focus:-outline-offset-2 md:data-focus:outline-ink-blue-500";

const tabClasses: Record<TabsOrientation, string> = {
	horizontal: horizontalClasses,
	vertical: verticalClasses,
	verticalFromMd: verticalFromMdClasses,
};

/** The vertical row's label, description and chevron; `md:` variants when it is vertical only from `md`. */
const rowPartClasses = {
	vertical: {
		label: "flex items-center gap-2 text-sm font-bold",
		description: "mt-2 block text-xs font-medium",
		chevron: "size-6 shrink-0",
	},
	verticalFromMd: {
		label: "flex items-center gap-2 md:text-sm md:font-bold",
		description: "max-md:sr-only md:mt-2 md:block md:text-xs md:font-medium",
		chevron: "size-6 shrink-0 max-md:hidden",
	},
};

const badgeTone = (
	selected: boolean,
	disabled: boolean
): CountBadgeProps["tone"] => {
	if (disabled) return "disabled";
	return selected ? "active" : "inactive";
};

export const Tab = ({
	children,
	count,
	countLabel,
	description,
	className,
	"aria-describedby": ariaDescribedBy,
	...props
}: TabProps): FunctionComponent => {
	const orientation = useTabsOrientation();
	const vertical = orientation !== "horizontal";
	const row =
		rowPartClasses[orientation === "verticalFromMd" ? orientation : "vertical"];
	const descriptionId = useId();
	const countLabelId = useId();
	const hasDescription =
		description !== undefined && description !== null && description !== "";
	const describesCount =
		Boolean(countLabel) && count !== undefined && count > 0;
	const describedBy = [
		hasDescription && descriptionId,
		describesCount && countLabelId,
		ariaDescribedBy,
	]
		.filter(Boolean)
		.join(" ");
	return (
		<HeadlessTab
			aria-describedby={describedBy || undefined}
			className={joinClassNames(
				"cursor-pointer",
				tabClasses[orientation],
				className
			)}
			{...props}
		>
			{({ selected, disabled }) => {
				const badge = (
					<>
						<CountBadge
							aria-hidden={describesCount || undefined}
							count={count}
							tone={badgeTone(selected, disabled)}
						/>
						{describesCount && (
							<span aria-hidden="true" className="sr-only" id={countLabelId}>
								{countLabel}
							</span>
						)}
					</>
				);
				// Hidden from the name; aria-describedby still reads hidden text.
				const descriptionText = hasDescription && (
					<span
						aria-hidden="true"
						id={descriptionId}
						className={
							vertical
								? joinClassNames(
										row.description,
										disabled ? "text-neutral-400" : "text-neutral-800"
									)
								: "sr-only"
						}
					>
						{description}
					</span>
				);
				return vertical ? (
					<>
						<span className="min-w-0">
							<span className={row.label}>
								{children} {badge}
							</span>
							{descriptionText}
						</span>
						<ChevronRightIcon
							className={joinClassNames(
								row.chevron,
								disabled ? "text-neutral-400" : "text-ink-blue-900"
							)}
						/>
					</>
				) : (
					<>
						{children} {badge}
						{descriptionText}
					</>
				);
			}}
		</HeadlessTab>
	);
};
