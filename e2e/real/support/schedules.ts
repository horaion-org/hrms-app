import { ApiClient, expectStatus } from "./api";
import type { Seed } from "./seed-data";

/** The department path every schedule route hangs off. */
export function departmentPath(seed: Pick<Seed, "branchId">, departmentId: string): string {
	return `~/branches/${seed.branchId}/departments/${departmentId}`;
}

export function schedulePath(seed: Pick<Seed, "branchId">, departmentId: string, scheduleId: string): string {
	return `${departmentPath(seed, departmentId)}/schedules/${scheduleId}`;
}

/** Creates a week's schedule over the given shifts and constraints and returns it. */
export async function createSchedule(
	api: ApiClient,
	seed: Pick<Seed, "branchId">,
	departmentId: string,
	input: { name: string; periodStart: string; shiftIds: string[]; constraintIds: string[]; includeLeave?: boolean }
): Promise<any> {
	const result = await api.post(`${departmentPath(seed, departmentId)}/schedules`, {
		name: input.name,
		periodStart: input.periodStart,
		includeLeave: input.includeLeave ?? true,
		allowOpenShifts: false,
		includedShiftIds: input.shiftIds,
		includedConstraintIds: input.constraintIds,
	});
	return expectStatus(result, 201, `create schedule ${input.name}`);
}

/** Requests generation and waits until the engine's result has been applied (or the run failed). */
export async function generateAndWait(
	api: ApiClient,
	seed: Pick<Seed, "branchId">,
	departmentId: string,
	scheduleId: string,
	timeoutMs = 240_000
): Promise<any> {
	const path = schedulePath(seed, departmentId, scheduleId);
	const requested = await api.post(`${path}/generation`);
	if (requested.status >= 300) {
		throw new Error(`generation of ${scheduleId}: ${requested.status} ${requested.text.slice(0, 400)}`);
	}
	return waitForGeneration(api, path, timeoutMs);
}

export async function waitForGeneration(api: ApiClient, path: string, timeoutMs = 240_000): Promise<any> {
	const deadline = Date.now() + timeoutMs;
	for (;;) {
		const schedule = expectStatus(await api.get(path), 200, "read schedule");
		if (["GENERATED", "GENERATION_FAILED", "PUBLISHED"].includes(schedule.status)) return schedule;
		if (Date.now() > deadline) throw new Error(`generation timed out in status ${schedule.status}`);
		await new Promise((resolve) => setTimeout(resolve, 3_000));
	}
}

/** The roster cells of a schedule: one row per member and day. */
export async function assignments(api: ApiClient, seed: Pick<Seed, "branchId">, departmentId: string, scheduleId: string) {
	return expectStatus(await api.get(`${schedulePath(seed, departmentId, scheduleId)}/assignments`), 200, "assignments");
}

/** Operations' three shifts and their staffing rules: what every Operations week in the flows is built from. */
export function operationsWeek(seed: Pick<Seed, "shifts" | "constraints">) {
	return {
		shiftIds: [seed.shifts.morning, seed.shifts.evening, seed.shifts.night],
		constraintIds: [seed.constraints.morning, seed.constraints.evening, seed.constraints.night],
	};
}

/** Creates an Operations week, generates it and returns its id once GENERATED (throws otherwise). */
export async function generatedOperationsWeek(
	api: ApiClient,
	seed: Pick<Seed, "branchId" | "departments" | "shifts" | "constraints">,
	name: string,
	periodStart: string,
	includeLeave = true
): Promise<string> {
	const operations = seed.departments.operations;
	const schedule = await createSchedule(api, seed, operations, { name, periodStart, includeLeave, ...operationsWeek(seed) });
	const result = await generateAndWait(api, seed, operations, schedule.scheduleId);
	if (result.status !== "GENERATED") throw new Error(`${name} generation ended ${result.status}`);
	return schedule.scheduleId;
}
