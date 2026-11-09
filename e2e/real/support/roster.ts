import { ApiClient, ApiResult, expectStatus } from "./api";
import type { Seed } from "./seed-data";
import { schedulePath } from "./schedules";

export type Cell = { membershipId: string; day: string; kind: "WORK" | "OFF" | "LEAVE"; shiftId?: string };

/** The seeded shift names (`seed.setup.ts`). */
export type ShiftName = "Morning" | "Evening" | "Night" | "Support Day";

/** The shifts a roster edit may use, by name (their ids are the schedule's own shift ids). */
export async function rosterShifts(api: ApiClient, seed: Pick<Seed, "branchId">, departmentId: string, scheduleId: string): Promise<Record<ShiftName, string>> {
	const shifts = expectStatus(await api.get(`${schedulePath(seed, departmentId, scheduleId)}/roster-changes/shifts`), 200, "roster shifts");
	return Object.fromEntries(shifts.map((shift: any) => [shift.name, shift.shiftId])) as Record<ShiftName, string>;
}

export async function readSchedule(api: ApiClient, seed: Pick<Seed, "branchId">, departmentId: string, scheduleId: string): Promise<any> {
	return expectStatus(await api.get(schedulePath(seed, departmentId, scheduleId)), 200, "schedule");
}

/** One member's day on the roster. */
export async function dayOf(api: ApiClient, seed: Pick<Seed, "branchId">, departmentId: string, scheduleId: string, membershipId: string, day: string): Promise<any> {
	const rows = expectStatus(await api.get(`${schedulePath(seed, departmentId, scheduleId)}/assignments`), 200, "assignments");
	return rows.find((row: any) => row.member.membershipId === membershipId && row.day === day);
}

/** Previews a change at the roster's current revision. */
export async function previewChange(api: ApiClient, seed: Pick<Seed, "branchId">, departmentId: string, scheduleId: string, cells: Cell[]): Promise<ApiResult> {
	const revision = (await readSchedule(api, seed, departmentId, scheduleId)).rosterRevision;
	return api.post(`${schedulePath(seed, departmentId, scheduleId)}/roster-changes/preview`, { expectedRevision: revision, cells });
}

/** Previews, then applies with the preview's fingerprint (acknowledging its warnings) and the remark. */
export async function applyChange(
	api: ApiClient,
	seed: Pick<Seed, "branchId">,
	departmentId: string,
	scheduleId: string,
	cells: Cell[],
	remark: string | null
): Promise<{ preview: ApiResult; applied: ApiResult }> {
	const preview = await previewChange(api, seed, departmentId, scheduleId, cells);
	if (preview.status !== 200) return { preview, applied: preview };
	const applied = await api.post(`${schedulePath(seed, departmentId, scheduleId)}/roster-changes`, {
		expectedRevision: preview.data.expectedRevision,
		cells,
		remark,
		checksFingerprint: preview.data.checksFingerprint,
	});
	return { preview, applied };
}

export async function undoChange(api: ApiClient, seed: Pick<Seed, "branchId">, departmentId: string, scheduleId: string, changeId: string, remark: string | null = null): Promise<ApiResult> {
	const path = schedulePath(seed, departmentId, scheduleId);
	const revision = (await readSchedule(api, seed, departmentId, scheduleId)).rosterRevision;
	const preview = await api.post(`${path}/roster-changes/${changeId}/undo/preview`, { expectedRevision: revision });
	if (preview.status !== 200) return preview;
	return api.post(`${path}/roster-changes/${changeId}/undo`, { expectedRevision: revision, remark, checksFingerprint: preview.data?.checksFingerprint ?? null });
}
