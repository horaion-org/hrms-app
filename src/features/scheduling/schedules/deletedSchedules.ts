import { skipToken, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/common/api-client";
import { ApiProblemError } from "@/common/problem";
import { deletedSchedulesPath } from "@/features/scheduling/paths";
import {
	scheduleSchema,
	schedulesKey,
} from "@/features/scheduling/schedules/api";
import {
	accessiblePreviousData,
	administrativeMeta,
} from "@/features/workspace/queryAccess";
import { retry } from "@/features/workspace/retry";
import type { UnitSelection } from "@/features/workspace/unitSelection";
import { useAccess } from "@/features/workspace/useAccess";

/*
 * Deleted schedules, read only: a deleted schedule leaves the roster page and
 * every other schedule route (they answer 404 for it) and is kept as a record
 * that History lists. Nothing here changes one, and none is ever put back.
 */

// A cause a newer API adds reads as none known, which is worded "Deleted on …".
const deletionCauseSchema = z
	.enum(["MANAGER", "REPLACED"])
	.nullable()
	.catch(null);

const deletionSchema = z.object({
	deletedAt: z.string(),
	/** Who deleted it; null for a schedule deleted before the API recorded who. */
	deletedByName: z.string().nullable(),
	/** A manager deleted it, or a later run replaced it; null when not recorded, which reads "Deleted on …". */
	cause: deletionCauseSchema,
});

/** When a schedule was deleted, by whom and why, as far as the API recorded it. */
export type ScheduleDeletion = z.infer<typeof deletionSchema>;

/** A deleted schedule: every field of a schedule as it was, and its deletion. */
export const deletedScheduleSchema = scheduleSchema.and(
	z.object({
		deletion: deletionSchema,
		/** Whether staff ever saw its roster: published when deleted, or published once and withdrawn. */
		wasPublished: z.boolean(),
	})
);

/** A deleted schedule as History lists it. */
export type DeletedSchedule = z.infer<typeof deletedScheduleSchema>;

const deletedSchedulePageSchema = z.object({
	content: z.array(deletedScheduleSchema),
	page: z.object({ hasNext: z.boolean() }),
});

/**
 * Read every page of the deleted schedules in the chosen units (every one in
 * scope when none is chosen), newest deletion first, as `fetchSchedules`
 * reads the live ones.
 */
export const fetchDeletedSchedules = async (
	companyId: string,
	units: UnitSelection,
	signal?: AbortSignal
): Promise<Array<DeletedSchedule>> => {
	const schedules: Array<DeletedSchedule> = [];
	for (let page = 0; ; page += 1) {
		const search = new URLSearchParams({
			page: String(page),
			size: "100",
			sort: "deletedAt,desc",
		});
		if (units.branchId) search.set("branchId", units.branchId);
		if (units.departmentId) search.set("departmentId", units.departmentId);
		// The next page is requested only when this page reports one exists.
		// eslint-disable-next-line no-await-in-loop
		const result = await apiRequest(
			`${deletedSchedulesPath(companyId)}?${search.toString()}`,
			deletedSchedulePageSchema,
			{ signal }
		);
		schedules.push(...result.content);
		if (!result.page.hasNext) return schedules;
	}
};

/**
 * The key the deleted schedules in the chosen units are cached under: below
 * the live lists' own, so deleting a schedule, which refreshes those,
 * refreshes this list too.
 */
export const deletedSchedulesInUnitsKey = (
	companyId: string,
	units: UnitSelection
): readonly ["scheduling", string, "list", "deleted", UnitSelection] =>
	[...schedulesKey(companyId), "deleted", units] as const;

type DeletedSchedulesState =
	| { status: "pending" | "error" | "hidden" }
	| { status: "ready"; schedules: Array<DeletedSchedule> };

/** The deleted schedules in the chosen units; every one in scope when none is chosen. */
export const useDeletedSchedules = (
	companyId: string,
	units: UnitSelection
): DeletedSchedulesState => {
	const access = useAccess();
	const allowed = access.canAnywhere("schedule:read");
	const list = useQuery({
		queryKey: deletedSchedulesInUnitsKey(companyId, units),
		queryFn: allowed
			? ({ signal }): Promise<Array<DeletedSchedule>> =>
					fetchDeletedSchedules(companyId, units, signal)
			: skipToken,
		placeholderData: accessiblePreviousData(),
		meta: administrativeMeta(companyId),
		retry,
	});
	if (access.status !== "ready") return { status: access.status };
	if (
		!allowed ||
		(list.error instanceof ApiProblemError && list.error.status === 403)
	)
		return { status: "hidden" };
	if (list.isError) return { status: "error" };
	if (list.data === undefined) return { status: "pending" };
	return { status: "ready", schedules: list.data };
};
