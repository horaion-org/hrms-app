import type { Overtime, OvertimeMember } from "@/features/dashboard/api";

/*
 * Who the Close to the overtime limit card names, worked out from the
 * overtime read. Pure.
 */

/** One person at or over the share, with the ceiling of their department. */
export type PersonNearLimit = OvertimeMember & {
	departmentName: string;
	ceilingMinutes: number;
};

/** Everyone at or over the share this month, most overtime first; a department without a ceiling names nobody. */
export const peopleNearLimit = (overtime: Overtime): Array<PersonNearLimit> =>
	overtime.departments
		.flatMap((department) => {
			const ceilingMinutes = department.ceilingMinutes;
			if (ceilingMinutes === null) return [];
			return department.members.map((member) => ({
				...member,
				departmentName: department.departmentName,
				ceilingMinutes,
			}));
		})
		.sort((first, second) => second.overtimeMinutes - first.overtimeMinutes);
