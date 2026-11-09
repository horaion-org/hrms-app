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

/**
 * Signed-in frame: the rail on the left (on top below `lg`), then the header
 * over the page. The page gets 16 px of side padding on phones, 24 px on
 * tablets and 40 px from `lg`.
 */
export const AppShell = ({
	sidebar,
	header,
	children,
}: AppShellProps): FunctionComponent => (
	<div className="flex min-h-dvh flex-col bg-white lg:flex-row">
		{sidebar}
		<div className="flex min-w-0 flex-1 flex-col">
			{header}
			<main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
				{children}
			</main>
		</div>
	</div>
);
