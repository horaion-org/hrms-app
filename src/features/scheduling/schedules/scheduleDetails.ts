import type { TFunction } from "i18next";
import type { DescriptionListItem } from "@/components/ui/DescriptionList";
import type { Schedule } from "@/features/scheduling/schedules/api";
import { scheduleDecision } from "@/features/scheduling/schedules/scheduleDecision";

const key = "scheduling.detail.details";

/**
 * A schedule's history as labelled rows: who requested its generation and
 * when, when the run finished, who published or rejected it and when, and
 * the time zone its times are in. A row with nothing to say is left out.
 * `formatMoment` turns an ISO instant into the schedule's local date and time.
 */
export const scheduleDetailItems = (
	schedule: Schedule,
	formatMoment: (instant: string) => string,
	t: TFunction
): Array<DescriptionListItem> => {
	const items: Array<DescriptionListItem> = [];
	const byAt = (name: string | null | undefined, instant: string): string =>
		name
			? t(`${key}.byAt`, { name, at: formatMoment(instant) })
			: formatMoment(instant);
	if (schedule.generationRequestedAt !== null)
		items.push({
			label: t(`${key}.requested`),
			value: byAt(
				schedule.generationRequestedBy
					? (schedule.generationRequestedBy.displayName ??
							t("scheduling.detail.formerMember"))
					: null,
				schedule.generationRequestedAt
			),
		});
	if (schedule.generation?.finishedAt)
		items.push({
			label: t(`${key}.finished`),
			value: formatMoment(schedule.generation.finishedAt),
		});
	const decision = scheduleDecision(schedule);
	if (decision && decision.kind !== "pending" && decision.decidedAt)
		items.push({
			label: t(`${key}.${decision.kind}`),
			value: byAt(decision.decidedBy, decision.decidedAt),
		});
	items.push({ label: t(`${key}.timeZone`), value: schedule.timeZone });
	return items;
};
