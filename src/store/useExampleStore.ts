import { create } from "zustand";
import { devtools } from "zustand/middleware";

/**
 * Example Zustand store. Wrapped in the `devtools` middleware so its state and
 * actions show up in the Redux DevTools browser extension (see the README
 * "Built-in Devtools" section). Delete `src/store/useExampleStore.ts` along with
 * the rest of `src/features/example` once you no longer need the reference.
 */
interface ExampleState {
	selectedMatchId: string | null;
	setSelectedMatchId: (id: string | null) => void;
}

export const useExampleStore = create<ExampleState>()(
	devtools(
		(set) => ({
			selectedMatchId: null,
			setSelectedMatchId: (id): void =>
				{ set({ selectedMatchId: id }, undefined, "example/setSelectedMatchId"); },
		}),
		{ name: "ExampleStore" }
	)
);
