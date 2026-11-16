import type { FunctionComponent } from "@/common/types";

export type ChipProps = { label: string };

/** A short label in a small tinted box, e.g. a time window or a shift's name. */
export const Chip = ({ label }: ChipProps): FunctionComponent => (
	<span className="block truncate rounded border border-ink-blue-200 bg-ink-blue-50 px-1.5 py-1 text-center text-xs font-medium text-ink-blue-900">
		{label}
	</span>
);
