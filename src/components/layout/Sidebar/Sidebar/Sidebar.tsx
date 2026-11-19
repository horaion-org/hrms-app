import { Children, type ReactNode, useId, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { HoraionLogo } from "@/components/layout/Sidebar/HoraionLogo";
import { Button } from "@/components/ui/Button";
import { CloseIcon, MenuIcon } from "@/components/ui/Icon";

export type SidebarProps = {
	children: ReactNode;
	className?: string;
	/** From `lg`, narrows the rail to icons alone; below it the bar and Menu are unchanged. */
	collapsed?: boolean;
	/** The control that collapses and expands the rail, shown beside the logo from `lg`. */
	collapseToggle?: ReactNode;
	footer?: ReactNode;
	/** The small-screen Menu button's accessible name, in the person's language. */
	menuLabel: string;
};

/**
 * The navigation rail: a full-height column beside the page from `lg`, and
 * below it (phones and tablets) a bar with the logo and a Menu button that shows the navigation
 * and footer under it, so the page starts right after the bar. From `lg` the rail can be
 * collapsed to an 80 px column of icons, the logo stacked over the collapse control.
 */
export const Sidebar = ({
	children,
	className,
	collapsed = false,
	collapseToggle,
	footer,
	menuLabel,
}: SidebarProps): FunctionComponent => {
	const { t } = useTranslation();
	const panelId = useId();
	// The menu stays open only on the page it was opened at, so following a link closes it.
	const location = useRouterState({ select: (state) => state.location.href });
	const [openAt, setOpenAt] = useState<string>();
	const menuOpen = openAt === location;
	return (
		<div
			className={joinClassNames(
				"flex w-full shrink-0 flex-col items-start gap-6 overflow-y-auto bg-ink-blue-900 p-4",
				"lg:sticky lg:top-0 lg:h-dvh lg:gap-10",
				collapsed ? "lg:w-20 lg:p-4" : "lg:w-70 lg:p-7",
				className
			)}
		>
			<div
				className={joinClassNames(
					"flex w-full items-center justify-between",
					collapsed && "lg:flex-col lg:gap-4"
				)}
			>
				<Link
					activeOptions={{ exact: true }}
					className="flex items-center justify-center rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
					to="/"
				>
					<HoraionLogo collapsed={collapsed} />
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
				{collapseToggle && (
					<div className="max-lg:hidden">{collapseToggle}</div>
				)}
			</div>
			<div
				id={panelId}
				className={joinClassNames(
					"w-full flex-1 flex-col gap-6 lg:flex lg:gap-10",
					menuOpen ? "flex" : "hidden"
				)}
			>
				<nav aria-label={t("shell.mainNavigation")}>
					<ul className="flex flex-col gap-4">
						{/* A child that renders nothing (a `Can` the person fails) leaves an empty item; it is hidden so it adds no gap. */}
						{Children.map(
							children,
							(child) => child && <li className="empty:hidden">{child}</li>
						)}
					</ul>
				</nav>
				{footer && <div className="mt-auto w-full">{footer}</div>}
			</div>
		</div>
	);
};
