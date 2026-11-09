import { createContext, useContext } from "react";

/** `verticalFromMd`: one horizontal row below `md`, the vertical column from it. */
export type TabsOrientation = "horizontal" | "vertical" | "verticalFromMd";

/** Lets TabList and Tab style themselves for the orientation Tabs was given. */
export const TabsOrientationContext =
	createContext<TabsOrientation>("horizontal");

export const useTabsOrientation = (): TabsOrientation =>
	useContext(TabsOrientationContext);
