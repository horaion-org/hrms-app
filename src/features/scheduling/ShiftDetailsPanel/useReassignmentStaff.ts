import { skipToken, useQuery } from "@tanstack/react-query";
import { ApiProblemError } from "@/common/problem";
import {
	fetchPeople,
	PEOPLE_PAGE_SIZE,
	type MemberProfile,
} from "@/features/people/api";
import type { DepartmentPath } from "@/features/scheduling/paths";
import { administrativeMeta } from "@/features/workspace/queryAccess";
import { retry } from "@/features/workspace/retry";
import { departmentScope } from "@/features/workspace/scopes";
import { useAccess } from "@/features/workspace/useAccess";

/** The API filters by branch and permission; department is matched by id across every page. */
export const fetchReassignmentStaff = async (
	companyId: string,
	unit: DepartmentPath,
	signal?: AbortSignal
): Promise<Array<MemberProfile>> => {
	const members: Array<MemberProfile> = [];
	for (let page = 1; ; page += 1) {
		// The result total determines whether another page is needed.
		// eslint-disable-next-line no-await-in-loop
		const result = await fetchPeople(
			companyId,
			{
				page,
				branchId: unit.branchId,
				status: "ACTIVE",
				search: "",
				sort: { field: "displayName", desc: false },
			},
			signal
		);
		members.push(
			...result.items.filter(
				(member) =>
					member.status === "ACTIVE" &&
					member.branchId === unit.branchId &&
					member.departmentId === unit.departmentId
			)
		);
		if (page * PEOPLE_PAGE_SIZE >= result.total || result.items.length === 0)
			return members;
	}
};

type StaffState =
	| { status: "pending" | "hidden" | "error" }
	| { status: "ready"; members: Array<MemberProfile> };

export const useReassignmentStaff = (
	companyId: string,
	unit: DepartmentPath | undefined
): StaffState => {
	const access = useAccess();
	const allowed =
		unit !== undefined &&
		access.can("member_profile:read", departmentScope(unit.departmentId));
	const query = useQuery({
		queryKey: ["scheduling", companyId, "reassignment-staff", unit],
		queryFn: allowed
			? ({ signal }): Promise<Array<MemberProfile>> =>
					fetchReassignmentStaff(companyId, unit, signal)
			: skipToken,
		meta: administrativeMeta(companyId),
		retry,
	});
	if (access.status !== "ready") return { status: access.status };
	if (!unit) return { status: "pending" };
	if (
		!allowed ||
		(query.error instanceof ApiProblemError && query.error.status === 403)
	)
		return { status: "hidden" };
	if (query.isError) return { status: "error" };
	return query.data
		? { status: "ready", members: query.data }
		: { status: "pending" };
};
