import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";

export type SkeletonProps = {
	/** Sizes and rounds the placeholder, e.g. "h-12 w-32 rounded-lg". */
	className?: string;
};

/**
 * A grey placeholder for content still being worked out. It is hidden from
 * assistive tech, so say what is loading nearby (e.g. with `aria-busy` and a
 * visually hidden note).
 */
export const Skeleton = ({ className }: SkeletonProps): FunctionComponent => (
	<span
		aria-hidden="true"
		className={joinClassNames(
			"block animate-pulse rounded-full bg-neutral-400 opacity-50",
			className
		)}
	/>
);
