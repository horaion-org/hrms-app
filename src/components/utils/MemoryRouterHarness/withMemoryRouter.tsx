import type { Decorator } from "@storybook/react-vite";
import type { FunctionComponent } from "@/common/types";
import { MemoryRouterHarness } from "./MemoryRouterHarness";

/** Storybook decorator: renders each story inside the harness at its `initialEntry` parameter. */
export const withMemoryRouter: Decorator = (
	Story,
	{ parameters }
): NonNullable<FunctionComponent> => (
	<MemoryRouterHarness
		initialEntry={
			typeof parameters["initialEntry"] === "string"
				? parameters["initialEntry"]
				: undefined
		}
	>
		<Story />
	</MemoryRouterHarness>
);
