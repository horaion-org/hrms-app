import { TabGroup } from "@headlessui/react";
import type { ComponentPropsWithRef } from "react";
import type { FunctionComponent } from "@/common/types";
import {
	TabsOrientationContext,
	type TabsOrientation,
} from "@/components/ui/Tabs/Tabs/Tabs.context";

export type TabsProps = Omit<ComponentPropsWithRef<"div">, "onChange"> & {
	defaultIndex?: number;
	selectedIndex?: number;
	onChange?: (index: number) => void;
	/**
	 * `vertical` stacks the tabs as a navigation column, moves between them with
	 * ArrowUp/ArrowDown instead of ArrowLeft/ArrowRight, and exposes
	 * `aria-orientation="vertical"` on the TabList. Lay out the TabList and
	 * TabPanels side by side with `className`. Defaults to `horizontal`.
	 */
	orientation?: TabsOrientation;
};

export const Tabs = ({
	orientation = "horizontal",
	...props
}: TabsProps): FunctionComponent => (
	<TabsOrientationContext value={orientation}>
		<TabGroup vertical={orientation === "vertical"} {...props} />
	</TabsOrientationContext>
);
