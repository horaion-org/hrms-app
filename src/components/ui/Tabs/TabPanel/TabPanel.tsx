import { TabPanel as HeadlessTabPanel } from "@headlessui/react";
import type { ComponentPropsWithRef } from "react";
import type { FunctionComponent } from "@/common/types";

export type TabPanelProps = ComponentPropsWithRef<"div">;

export const TabPanel = (props: TabPanelProps): FunctionComponent => (
	<HeadlessTabPanel {...props} />
);
