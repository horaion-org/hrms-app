import { TabPanels as HeadlessTabPanels } from "@headlessui/react";
import type { ComponentPropsWithRef } from "react";
import type { FunctionComponent } from "@/common/types";

export type TabPanelsProps = ComponentPropsWithRef<"div">;

export const TabPanels = (props: TabPanelsProps): FunctionComponent => (
	<HeadlessTabPanels {...props} />
);
