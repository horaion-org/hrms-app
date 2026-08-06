import type { ReactNode } from "react";
import type { FunctionComponent } from "@/common/types";

type BadgeTone = "neutral" | "positive" | "muted" | "warning";

type BadgeProps = {
	tone?: BadgeTone;
	children: ReactNode;
};

const TONES: Record<BadgeTone, string> = {
	neutral: "bg-slate-100 text-slate-700",
	positive: "bg-emerald-100 text-emerald-800",
	muted: "bg-slate-100 text-slate-500",
	warning: "bg-amber-100 text-amber-800",
};

export const Badge = ({
	tone = "neutral",
	children,
}: BadgeProps): FunctionComponent => {
	return (
		<span
			className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TONES[tone]}`}
		>
			{children}
		</span>
	);
};
