import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import type { GuardedRead } from "@/features/dashboard/guardedRead";

const key = "insights";

const sectionHeading = "text-base font-semibold text-ink-blue-600 uppercase";

/** The three analyses Insights shows, each with its own words under `insights.<id>`. */
export type InsightId = "staffing" | "overtime" | "stability";

export type InsightSectionProps<T> = {
	id: InsightId;
	read: GuardedRead<T>;
	/** The table, given the read's answer. */
	children: (data: T) => ReactNode;
};

/** One analysis: its heading and intro, then its table, or a line while it loads or when it failed. */
export const InsightSection = <T,>({
	id,
	read,
	children,
}: InsightSectionProps<T>): FunctionComponent => {
	const { t } = useTranslation();
	if (read.status === "hidden") return null;
	return (
		<section aria-labelledby={`insights-${id}`} className="flex flex-col gap-4">
			<div className="flex flex-col gap-1">
				<h2 className={sectionHeading} id={`insights-${id}`}>
					{t(`${key}.${id}.title`)}
				</h2>
				<p className="text-sm text-neutral-800">{t(`${key}.${id}.intro`)}</p>
			</div>
			{read.status === "error" && (
				<p className="text-sm text-error-700" role="alert">
					{t(`${key}.failed`)}
				</p>
			)}
			{read.status === "pending" && (
				<p className="text-sm text-neutral-700">{t(`${key}.loading`)}</p>
			)}
			{read.status === "ready" && children(read.data)}
		</section>
	);
};
