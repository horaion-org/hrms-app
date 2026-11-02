import { useId } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { formatTimeRange } from "@/features/scheduling/formatShift";
import { MemberNotes } from "@/features/scheduling/MemberNotes";
import { formatDay } from "@/features/scheduling/periods";
import { findingsByMember } from "@/features/scheduling/roster/findingsByMember";
import type { GenerationFindings } from "@/features/scheduling/schedules/api";

export type ReviewNotesProps = {
	findings: GenerationFindings;
};

const key = "scheduling.generation";

/** What the engine asks to review on a generated roster: its conflicts and its errors by member. */
export const ReviewNotes = ({
	findings,
}: ReviewNotesProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = i18n.resolvedLanguage ?? i18n.language;
	const titleId = useId();
	const groups = findingsByMember(findings);
	return (
		<div className="flex flex-col gap-6">
			{findings.conflicts.length > 0 && (
				<section aria-labelledby={titleId} className="text-sm">
					<h3 className="font-semibold text-neutral-800" id={titleId}>
						{t(`${key}.conflicts`)}
					</h3>
					<ul className="mt-3 flex flex-col gap-4">
						{findings.conflicts.map((conflict) => (
							<li key={conflict.conflictId}>
								<p className="font-semibold text-neutral-900">
									{t(`${key}.conflictWhen`, {
										day: formatDay(conflict.date, language),
										time: formatTimeRange(
											{ startTime: conflict.start, endTime: conflict.end },
											t
										),
									})}
									<span aria-hidden="true" className="mx-2">
										•
									</span>
									{t(`${key}.missing`, { count: conflict.missing })}
								</p>
								{conflict.message && (
									<q className="mt-1 block text-neutral-800">
										{conflict.message}
									</q>
								)}
								<p className="mt-1 text-neutral-700">
									{t(`${key}.rule`, { rule: conflict.sourceRule })}
								</p>
							</li>
						))}
					</ul>
				</section>
			)}
			{groups.length > 0 && <MemberNotes groups={groups} />}
		</div>
	);
};
