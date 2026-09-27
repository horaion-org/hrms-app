import {
	Link as RouterLink,
	type LinkProps as RouterLinkProps,
} from "@tanstack/react-router";
import type { ComponentPropsWithRef } from "react";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import type { LinkVariant } from "@/components/ui/Link/Link.constants";

export type LinkProps = Omit<
	ComponentPropsWithRef<"a">,
	keyof RouterLinkProps | "children"
> &
	Omit<RouterLinkProps, "children" | "to"> & {
		/** Typed from the registered routes, so targets are checked at compile time. */
		to: NonNullable<RouterLinkProps["to"]>;
		variant?: LinkVariant;
		children: string;
	};

const baseClasses =
	"rounded-sm underline underline-offset-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-blue-500";

const variantClasses: Record<LinkVariant, string> = {
	action: "text-ink-blue-900 hover:text-ink-blue-700 active:text-ink-blue-500",
	muted: "text-neutral-700 hover:text-neutral-900 active:text-ink-blue-700",
};

/** An inline text link to another route in the app. */
export const Link = ({
	variant = "action",
	className,
	...props
}: LinkProps): FunctionComponent => (
	<RouterLink
		{...props}
		className={joinClassNames(baseClasses, variantClasses[variant], className)}
	/>
);
