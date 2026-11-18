import { apiRequest } from "@/common/api-client";
import type { DepartmentPath } from "@/common/companyPath";
import { schedulePath } from "@/features/scheduling/paths";
import {
	generationInProgress,
	scheduleSchema,
	type Schedule,
} from "@/features/scheduling/schedules/api";

/**
 * Whether a roster whose publication was withdrawn may be asked to generate
 * again through its own route (API ADR-0134): its generation ended and no run
 * is open. The API still refuses it when staff were told of changes to it.
 */
export const regenerableOncePublished = (schedule: Schedule): boolean =>
	(schedule.status === "GENERATED" ||
		schedule.status === "GENERATION_FAILED" ||
		schedule.status === "REJECTED") &&
	schedule.publicationWithdrawnAt !== null &&
	!generationInProgress(schedule);

/**
 * Generates one schedule again through its own route, which a withdrawn
 * roster needs (a month run never regenerates it). It answers the schedule,
 * GENERATION_REQUESTED.
 */
export const regenerateSchedule = (
	companyId: string,
	unit: DepartmentPath,
	scheduleId: string
): Promise<Schedule> =>
	apiRequest(
		`${schedulePath(companyId, unit, scheduleId)}/regeneration`,
		scheduleSchema,
		{ method: "POST" }
	);
