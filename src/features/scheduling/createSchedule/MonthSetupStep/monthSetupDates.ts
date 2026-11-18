import type { ReactNode } from "react";
import type { DatesPlan } from "@/features/scheduling/dates/api";

/** What the page knows of the chosen dates: their plan, whether it is loading, the branch's today, and who they roster. */
export type MonthSetupDates = {
	/** Undefined until both days are valid and the plan is read. */
	plan: DatesPlan | undefined;
	pending: boolean;
	today: string;
	/** Shown after the name: who the schedule rosters, and the way to choose them. */
	people?: ReactNode;
	/** People are chosen over days that have a schedule, which the API refuses: the plan promises no redo. */
	redoRefused?: boolean;
};
