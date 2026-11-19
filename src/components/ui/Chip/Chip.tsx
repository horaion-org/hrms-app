import type { FunctionComponent } from "@/common/types";

export type ChipProps = { label: string };

/**
 * A short label in a small tinted box, e.g. a time window or a shift's name:
 * a name chip, not a status pill. The design system's pills carry status in
 * four tones and have no ink-blue one, so this look is left for the
 * design-system clean-up to decide; its values are system ones (4 px padding
 * and radius, 12 px type, ink-blue 50, 200 and 900).
 */
export const Chip = ({ label }: ChipProps): FunctionComponent => (
	<span className="block truncate rounded-sm border border-ink-blue-200 bg-ink-blue-50 p-1 text-center text-xs font-medium text-ink-blue-900">
		{label}
	</span>
);
