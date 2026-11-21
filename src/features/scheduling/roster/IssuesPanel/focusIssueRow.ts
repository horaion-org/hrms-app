import { createContext } from "react";

/**
 * Moves focus to an Issues row's own button, by the row's key. The Issues
 * list gives it to what a row opens to, so a fix applied from inside the row
 * can hand focus back to the row; outside the list it does nothing.
 */
export const FocusIssueRow = createContext<(rowKey: string) => void>(() => {});
