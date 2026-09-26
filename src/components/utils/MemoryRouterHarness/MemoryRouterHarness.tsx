import { RouterProvider } from "@tanstack/react-router";
import { createContext, use, useMemo, type ReactNode } from "react";
import { createMemoryRouter } from "@/common/createMemoryRouter";
import type { FunctionComponent } from "@/common/types";

export type MemoryRouterHarnessProps = {
	children: ReactNode;
	initialEntry?: string;
};

const HarnessChildren = createContext<ReactNode>(null);

const RenderHarnessChildren = (): FunctionComponent => (
	<>{use(HarnessChildren)}</>
);

/** A fresh history when the initial entry changes; new children re-render in place. */
export const MemoryRouterHarness = ({
	children,
	initialEntry = "/",
}: MemoryRouterHarnessProps): FunctionComponent => {
	const router = useMemo(
		() => createMemoryRouter(<RenderHarnessChildren />, initialEntry),
		[initialEntry]
	);
	return (
		<HarnessChildren value={children}>
			{/* A swapped router stays unrendered until remounted and loaded. */}
			<RouterProvider key={initialEntry} router={router} />
		</HarnessChildren>
	);
};
