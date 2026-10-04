import { createContext, useContext } from "react";

export type TabsOrientation = "horizontal" | "vertical";

/** Lets TabList and Tab style themselves for the orientation Tabs was given. */
export const TabsOrientationContext =
	createContext<TabsOrientation>("horizontal");

export const useTabsOrientation = (): TabsOrientation =>
	useContext(TabsOrientationContext);
