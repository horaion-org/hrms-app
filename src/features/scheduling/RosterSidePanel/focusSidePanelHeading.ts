import { createContext } from "react";

/**
 * Moves focus to the side panel's own heading. The panel gives it to what it
 * holds, so a list whose focused row goes away can put focus somewhere safe
 * without reaching into the panel's markup; outside a panel it does nothing.
 */
export const FocusSidePanelHeading = createContext<() => void>(() => {});
