import { Tab as HeadlessTab } from "@headlessui/react";
import { useId, type ComponentPropsWithRef, type ReactNode } from "react";
import type { FunctionComponent } from "@/common/types";
import { joinClassNames } from "@/common/joinClassNames";
import { CountBadge, type CountBadgeProps } from "@/components/ui/CountBadge";
import { ChevronRightIcon } from "@/components/ui/Icon";
import { useTabsOrientation } from "@/components/ui/Tabs/Tabs/Tabs.context";

export type TabProps = Omit<ComponentPropsWithRef<"button">, "children"> & {
	children?: ReactNode;
	count?: number;
	/**
	 * A short line about the view, such as "Core workspace preferences.". It is
	 * the tab's accessible description, never part of its name. Vertical Tabs
	 * show it under the label; horizontal Tabs keep their one-line height and
	 * expose it to assistive technology only.
	 */
	description?: ReactNode;
};

const horizontalClasses =
	"inline-flex h-10 shrink-0 flex-nowrap items-center justify-center gap-2 border-b-2 border-transparent px-1 text-base whitespace-nowrap text-neutral-600 outline-none not-data-disabled:data-selected:border-ink-blue-900 not-data-disabled:data-selected:text-ink-blue-900 not-data-disabled:not-data-selected:data-hover:text-ink-blue-700 data-disabled:text-neutral-400 data-disabled:cursor-not-allowed data-focus:outline-2 data-focus:outline-solid data-focus:outline-offset-2 data-focus:outline-ink-blue-500";

/* Rows sit flush inside a bordered card, so the focus ring is drawn inside. */
const verticalClasses =
	"grid min-h-25 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 border-b border-neutral-400 bg-white px-5 py-5 text-left text-neutral-900 outline-none not-data-disabled:data-selected:bg-neutral-100 not-data-disabled:not-data-selected:data-hover:bg-neutral-50 data-disabled:cursor-not-allowed data-disabled:text-neutral-400 data-focus:outline-2 data-focus:outline-solid data-focus:-outline-offset-2 data-focus:outline-ink-blue-500";

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
	description,
	className,
	"aria-describedby": ariaDescribedBy,
	...props
}: TabProps): FunctionComponent => {
	const vertical = useTabsOrientation() === "vertical";
	const descriptionId = useId();
	const hasDescription =
		description !== undefined && description !== null && description !== "";
	return (
		<HeadlessTab
			aria-describedby={
				hasDescription
					? [descriptionId, ariaDescribedBy].filter(Boolean).join(" ")
					: ariaDescribedBy
			}
			className={joinClassNames(
				vertical ? verticalClasses : horizontalClasses,
				className
			)}
			{...props}
		>
			{({ selected, disabled }) => {
				const badge = (
					<CountBadge count={count} tone={badgeTone(selected, disabled)} />
				);
				// Hidden from the name; aria-describedby still reads hidden text.
				const descriptionText = hasDescription && (
					<span
						aria-hidden="true"
						id={descriptionId}
						className={
							vertical
								? joinClassNames(
										"mt-2 block text-xs font-medium",
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
							<span className="flex items-center gap-2 text-sm font-bold">
								{children} {badge}
							</span>
							{descriptionText}
						</span>
						<ChevronRightIcon
							className={joinClassNames(
								"size-6 shrink-0",
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
