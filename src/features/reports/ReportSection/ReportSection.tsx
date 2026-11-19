import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import type { GuardedRead } from "@/features/dashboard/guardedRead";
import type { Finding } from "@/features/reports/reportFindings";

const key = "reports";

/** The three questions Reports answers, each with its own words under `reports.<id>`. */
export type ReportId = "staffing" | "overtime" | "stability";

export type ReportSectionProps<T> = {
	id: ReportId;
	read: GuardedRead<T>;
	/** What the answer shows, stated as the section's heading. */
	findingOf: (data: T) => Finding;
	/** Whether the answer holds nothing to show, which one line then says. */
	isEmpty: (data: T) => boolean;
	/** The table, given the read's answer. */
	children: (data: T) => ReactNode;
	/** The chosen range can't be asked for, so nothing loads: the section says to choose a valid one. */
	rangeInvalid?: boolean;
};

/**
 * One question: asked in small type, then answered by its finding as the
 * heading, then its table. Before the answer, the heading is the section's
 * plain name. An empty answer is one calm line, with no table.
 */
export const ReportSection = <T,>({
	id,
	read,
	findingOf,
	isEmpty,
	children,
	rangeInvalid = false,
}: ReportSectionProps<T>): FunctionComponent => {
	const { t } = useTranslation();
	if (read.status === "hidden") return null;
	const finding = read.status === "ready" ? findingOf(read.data) : undefined;
	const title = t(`${key}.${id}.title`);
	// A finding's sentence, or the section's plain name should a key ever be missing.
	const heading = finding
		? t(`${key}.${id}.findings.${finding.key}`, {
				...finding.values,
				defaultValue: title,
			})
		: title;
	return (
		<section aria-labelledby={`reports-${id}`} className="flex flex-col gap-4">
			<div className="flex flex-col gap-1">
				<p className="text-xs font-semibold text-neutral-700">
					{t(`${key}.${id}.question`)}
				</p>
				<h2
					className="text-xl font-semibold text-neutral-900"
					id={`reports-${id}`}
				>
					{heading}
				</h2>
			</div>
			{read.status === "error" && (
				<p className="text-sm text-error-700" role="alert">
					{t(`${key}.failed`)}
				</p>
			)}
			{rangeInvalid && (
				<p className="text-sm text-neutral-700">{t(`${key}.chooseValidRange`)}</p>
			)}
			{read.status === "pending" && !rangeInvalid && (
				<p className="text-sm text-neutral-700">{t(`${key}.loading`)}</p>
			)}
			{read.status === "ready" &&
				(isEmpty(read.data) ? (
					<p className="text-sm text-neutral-700">{t(`${key}.${id}.empty`)}</p>
				) : (
					children(read.data)
				))}
		</section>
	);
};
