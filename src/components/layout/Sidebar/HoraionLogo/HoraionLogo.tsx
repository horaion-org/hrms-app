import type { FunctionComponent } from "@/common/types";

/** Stand-in pie mark from the Sidebar mockup, pending the final Horaion asset. */
export const HoraionLogo = (): FunctionComponent => (
	<svg
		aria-hidden="true"
		className="size-10 fill-ink-blue-100"
		focusable="false"
		viewBox="0 0 40 40"
	>
		<path d="M18 2a2 2 0 0 0-2.2-2A20 20 0 1 0 40 24.2a2 2 0 0 0-2-2.2H24a6 6 0 0 1-6-6Z" />
		<path d="M22 2a2 2 0 0 1 2.2-2A20 20 0 0 1 40 15.8a2 2 0 0 1-2 2.2H24a2 2 0 0 1-2-2Z" />
	</svg>
);
