import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { SCHEDULING_UNIT_RULES } from "@/features/scheduling/schedules/schedulesUnitRules";
import { isScheduleStep, type ScheduleStep } from "@/features/scheduling/steps";
import { workspaceQuery } from "@/features/workspace/api";
import type { FixedBranchLoaderData } from "@/features/workspace/branchScope";
import {
	SCHEDULE_CREATE_KEYS,
	SCHEDULE_READ_KEYS,
} from "@/features/workspace/permissionKeys";
import { departmentChoices } from "@/features/workspace/unitChoices";
import { CreateSchedule } from "@/pages/CreateSchedule";

/**
 * The wizard's step and, once Setup is done, the saved draft it works on:
 * the schedule and its department, whose routes name it. `department` and
 * `week` pre-fill a new draft; they are ignored once `scheduleId` is set.
 */
export type CreateScheduleSearch = {
	step?: ScheduleStep;
	scheduleId?: string;
	departmentId?: string;
	department?: string;
	week?: string;
};

const isId = (value: unknown): value is string =>
	typeof value === "string" && value.trim() !== "";

const isIsoDate = (value: unknown): value is string =>
	z.iso.date().safeParse(value).success;

export const Route = createFileRoute("/_authenticated/_app/scheduling_/new")({
	validateSearch: (search: Record<string, unknown>): CreateScheduleSearch => {
		const { step, scheduleId, departmentId, department, week } = search;
		return {
			...(isScheduleStep(step) ? { step } : {}),
			...(isId(scheduleId) ? { scheduleId } : {}),
			...(isId(departmentId) ? { departmentId } : {}),
			...(isId(department) ? { department } : {}),
			...(isIsoDate(week) ? { week } : {}),
		};
	},
	// Before a draft exists, the header's Branch narrows the Departments it may be created in,
	// with the Scheduling list's rules.
	staticData: {
		branchScope: {
			keys: SCHEDULE_CREATE_KEYS,
			rulesFor: () => SCHEDULING_UNIT_RULES,
		},
	},
	// A draft's ids name it only together; its Department fixes its Branch.
	loaderDeps: ({ search }) => ({
		draftDepartmentId:
			search.scheduleId === undefined ? undefined : search.departmentId,
	}),
	// Once a draft exists the header names its Branch, as the workspace lists it.
	loader: async ({ context, deps }): Promise<FixedBranchLoaderData> => {
		if (deps.draftDepartmentId === undefined) return {};
		const companyId =
			"currentCompany" in context && context.currentCompany.kind === "settled"
				? context.currentCompany.company.companyId
				: "";
		const workspace = await context.queryClient
			.ensureQueryData(workspaceQuery)
			.catch(() => undefined);
		const department =
			workspace &&
			departmentChoices(workspace, companyId, SCHEDULE_READ_KEYS).find(
				(choice) => choice.departmentId === deps.draftDepartmentId
			);
		return department
			? {
					fixedBranch: {
						branchId: department.branchId,
						name: department.branchName,
					},
				}
			: {};
	},
	component: CreateSchedule,
});
