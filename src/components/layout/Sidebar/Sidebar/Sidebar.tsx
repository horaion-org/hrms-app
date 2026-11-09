import { Children, type ReactNode, useId, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { HoraionLogo } from "@/components/layout/Sidebar/HoraionLogo";
import { Button } from "@/components/ui/Button";
import { CloseIcon, MenuIcon } from "@/components/ui/Icon";

export type SidebarProps = {
	children: ReactNode;
	className?: string;
	footer?: ReactNode;
	/** The small-screen Menu button's accessible name, in the person's language. */
	menuLabel: string;
};

/**
 * The navigation rail: a full-height column beside the page from `lg`, and
 * below it (phones and tablets) a bar with the logo and a Menu button that shows the navigation
 * and footer under it, so the page starts right after the bar.
 */
export const Sidebar = ({
	children,
	className,
	footer,
	menuLabel,
}: SidebarProps): FunctionComponent => {
	const panelId = useId();
	// The menu stays open only on the page it was opened at, so following a link closes it.
	const location = useRouterState({ select: (state) => state.location.href });
	const [openAt, setOpenAt] = useState<string>();
	const menuOpen = openAt === location;
	return (
		<div
			className={joinClassNames(
				"flex w-full shrink-0 flex-col items-start gap-6 overflow-y-auto bg-ink-blue-900 p-4",
				"lg:sticky lg:top-0 lg:h-dvh lg:w-70 lg:gap-10 lg:p-7",
				className
			)}
		>
			<div className="flex w-full items-center justify-between">
				<Link
					activeOptions={{ exact: true }}
					aria-label="Horaion home"
					className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
					to="/"
				>
					<HoraionLogo />
				</Link>
				<Button
					aria-controls={panelId}
					aria-expanded={menuOpen}
					aria-label={menuLabel}
					className="h-11 w-11 lg:hidden [&>svg]:size-6 [&>svg]:text-white hover:[&>svg]:text-ink-blue-100"
					variant="icon"
					onClick={() => {
						setOpenAt(menuOpen ? undefined : location);
					}}
				>
					{menuOpen ? <CloseIcon /> : <MenuIcon />}
				</Button>
			</div>
			<div
				id={panelId}
				className={joinClassNames(
					"w-full flex-1 flex-col gap-6 lg:flex lg:gap-10",
					menuOpen ? "flex" : "hidden"
				)}
			>
				<nav aria-label="Main navigation">
					<ul className="flex flex-col gap-4">
						{Children.map(children, (child) => child && <li>{child}</li>)}
					</ul>
				</nav>
				{footer && <div className="mt-auto w-full">{footer}</div>}
			</div>
		</div>
	);
};
