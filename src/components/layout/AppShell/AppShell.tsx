import type { ReactNode } from "react";
import type { FunctionComponent } from "@/common/types";

export type AppShellProps = {
	/** The navigation rail, usually a Sidebar. */
	sidebar: ReactNode;
	/** The bar above the content, usually an AppHeader. */
	header?: ReactNode;
	/** The current page, rendered as the main landmark. */
	children: ReactNode;
};

/** Signed-in frame: the rail on the left (on top below `sm`), then the header over the page. */
export const AppShell = ({
	sidebar,
	header,
	children,
}: AppShellProps): FunctionComponent => (
	<div className="flex min-h-dvh flex-col bg-white sm:flex-row">
		{sidebar}
		<div className="flex min-w-0 flex-1 flex-col">
			{header}
			<main className="min-w-0 flex-1 px-4 py-7 sm:px-10 sm:py-10">
				{children}
			</main>
		</div>
	</div>
);
