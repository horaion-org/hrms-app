import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import type { Schedule } from "@/features/scheduling/schedules/api";

const key = "scheduling.overview";

/** API-backed counts, settings and lifecycle details; counts are definitions, not assignments. */
export const ScheduleSummary = ({
	schedule,
}: {
	schedule: Schedule;
}): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const date = new Intl.DateTimeFormat(i18n.resolvedLanguage ?? i18n.language, {
		dateStyle: "medium",
		timeStyle: "short",
	});
	const yesNo = (value: boolean): string => t(`${key}.${value ? "yes" : "no"}`);
	return (
		<>
			<dl className="mt-8 grid grid-cols-2 gap-6">
				<div>
					<dt className="font-semibold text-ink-blue-600">
						{t(`${key}.includedShifts`)}
					</dt>
					<dd className="mt-2 text-4xl font-medium text-neutral-900">
						{schedule.includedShiftIds.length}
					</dd>
				</div>
				<div>
					<dt className="font-semibold text-ink-blue-600">
						{t(`${key}.appliedConstraints`)}
					</dt>
					<dd className="mt-2 text-4xl font-medium text-neutral-900">
						{schedule.includedConstraintIds.length}
					</dd>
				</div>
			</dl>
			<dl className="mt-6 space-y-2 text-sm text-neutral-700">
				<div className="flex justify-between gap-4">
					<dt>{t(`${key}.includeLeave`)}</dt>
					<dd>{yesNo(schedule.includeLeave)}</dd>
				</div>
				<div className="flex justify-between gap-4">
					<dt>{t(`${key}.allowOpenShifts`)}</dt>
					<dd>{yesNo(schedule.allowOpenShifts)}</dd>
				</div>
				<div>
					<dt>{t(`${key}.updatedAt`)}</dt>
					<dd>
						<time dateTime={schedule.updatedAt}>
							{date.format(new Date(schedule.updatedAt))}
						</time>
					</dd>
				</div>
				{schedule.generationRequestedAt && (
					<div>
						<dt>{t(`${key}.generationRequestedAt`)}</dt>
						<dd>
							<time dateTime={schedule.generationRequestedAt}>
								{date.format(new Date(schedule.generationRequestedAt))}
							</time>
						</dd>
					</div>
				)}
				{schedule.generationRequestedBy && (
					<div>
						<dt>{t(`${key}.requestedBy`)}</dt>
						<dd>
							{schedule.generationRequestedBy.displayName ??
								t(`${key}.formerMember`)}
						</dd>
					</div>
				)}
			</dl>
		</>
	);
};
