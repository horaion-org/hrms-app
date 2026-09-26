import { createContext } from "react";

type StepContextValue = {
	index: number;
	isLast: boolean;
	status: "completed" | "current" | "upcoming";
	onStepClick?: (index: number) => void;
};

export const StepContext = createContext<StepContextValue | null>(null);
