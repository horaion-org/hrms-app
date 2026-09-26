import { Tab as HeadlessTab } from "@headlessui/react";
import type { ComponentPropsWithRef, ReactNode } from "react";
import type { FunctionComponent } from "@/common/types";
import { joinClassNames } from "@/common/joinClassNames";
import { CountBadge, type CountBadgeProps } from "@/components/ui/CountBadge";

export type TabProps = Omit<ComponentPropsWithRef<"button">, "children"> & {
	children?: ReactNode;
	count?: number;
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
	className,
	...props
}: TabProps): FunctionComponent => (
	<HeadlessTab
		className={joinClassNames(
			"inline-flex h-10 shrink-0 flex-nowrap items-center justify-center gap-2 border-b-2 border-transparent px-1 text-base whitespace-nowrap text-neutral-600 outline-none not-data-disabled:data-selected:border-ink-blue-900 not-data-disabled:data-selected:text-ink-blue-900 not-data-disabled:not-data-selected:data-hover:text-ink-blue-700 data-disabled:text-neutral-400 data-disabled:cursor-not-allowed data-focus:outline-2 data-focus:outline-solid data-focus:outline-offset-2 data-focus:outline-ink-blue-500",
			className
		)}
		{...props}
	>
		{({ selected, disabled }) => (
			<>
				{children}{" "}
				<CountBadge count={count} tone={badgeTone(selected, disabled)} />
			</>
		)}
	</HeadlessTab>
);
