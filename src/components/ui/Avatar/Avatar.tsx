import type { ComponentPropsWithRef } from "react";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { initialsOf } from "./Avatar.utils";

export type AvatarProps = Omit<ComponentPropsWithRef<"span">, "children"> & {
	/** The person's display name; also the avatar's accessible name. */
	name: string;
};

export const Avatar = ({
	name,
	className,
	...rest
}: AvatarProps): FunctionComponent => (
	<span
		aria-label={name}
		role="img"
		title={name}
		className={joinClassNames(
			"inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-ink-blue-500 text-xl font-medium text-white select-none",
			className
		)}
		{...rest}
	>
		<span aria-hidden="true">{initialsOf(name)}</span>
	</span>
);
