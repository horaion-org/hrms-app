import { Children, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { HoraionLogo } from "@/components/layout/Sidebar/HoraionLogo";

export type SidebarProps = {
	children: ReactNode;
	className?: string;
};

export const Sidebar = ({
	children,
	className,
}: SidebarProps): FunctionComponent => (
	<div
		className={joinClassNames(
			"flex min-h-dvh w-70 shrink-0 flex-col items-start gap-10 bg-ink-blue-900 p-7",
			className
		)}
	>
		<Link
			activeOptions={{ exact: true }}
			aria-label="Horaion home"
			className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
			to="/"
		>
			<HoraionLogo />
		</Link>
		<nav aria-label="Main navigation">
			<ul className="flex flex-col gap-4">
				{Children.map(children, (child) => child && <li>{child}</li>)}
			</ul>
		</nav>
	</div>
);
