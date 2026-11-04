import { createContext } from "react";

type StepContextValue = {
	index: number;
	isLast: boolean;
	/** Where the step sits next to the current one; only steps before it can be returned to. */
	position: "before" | "current" | "after";
	onStepClick?: (index: number) => void;
};

export const StepContext = createContext<StepContextValue | null>(null);
