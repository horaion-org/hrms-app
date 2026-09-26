import { TabGroup } from "@headlessui/react";
import type { ComponentPropsWithRef } from "react";
import type { FunctionComponent } from "@/common/types";

export type TabsProps = Omit<ComponentPropsWithRef<"div">, "onChange"> & {
	defaultIndex?: number;
	selectedIndex?: number;
	onChange?: (index: number) => void;
};

export const Tabs = (props: TabsProps): FunctionComponent => (
	<TabGroup {...props} />
);
