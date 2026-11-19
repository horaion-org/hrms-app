import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useDebouncedValue } from "@/common/useDebouncedValue";
import { departmentsToApplyIn } from "@/features/leave/applyDepartments";
import type { ApplyEmployees } from "@/features/leave/LeaveRequestDialog";
import {
	ALL_DEPARTMENTS,
	shownDepartment,
} from "@/features/people/ApplyForSomeoneDialog";
import { peopleQuery } from "@/features/people/api";
import { recordScope } from "@/features/workspace/scopes";
import { useAccess } from "@/features/workspace/useAccess";
import type { ResolvedUnitSelection } from "@/features/workspace/unitSelection";

/**
 * Who an application on someone's behalf may name, for the dialog `mode`
 * open ("apply" or "record"; anything else asks for nothing): the people
 * search, narrowed to one Department of the page's units where the caller
 * holds the key, and its answer kept to those the caller may apply, or
 * record, for. Starts on the page's Department when it is offered.
 * `refresh` reads the people again, after a refusal that says they changed.
 */
export const useApplyEmployees = (
	companyId: string,
	mode: string | undefined,
	units: Pick<ResolvedUnitSelection, "departments" | "department">
): ApplyEmployees & { refresh: () => void } => {
	const access = useAccess();
	const key =
		mode === "record" ? "leave_request:review" : "leave_request:create";
	const asks =
		(mode === "apply" || mode === "record") && access.canAnywhere(key);
	const [search, setSearch] = useState("");
	const [pickedDepartment, setPickedDepartment] = useState<string>();
	const departments = departmentsToApplyIn(units.departments, (departmentId) =>
		access.can(key, recordScope(departmentId))
	);
	const department = shownDepartment(
		pickedDepartment,
		departments,
		units.department?.departmentId
	);
	const settled = useDebouncedValue(search.trim());
	const people = useQuery(
		peopleQuery(
			companyId,
			{
				page: 1,
				sort: { field: "displayName", desc: false },
				status: "ACTIVE",
				search: settled,
				departmentId: department === ALL_DEPARTMENTS ? undefined : department,
			},
			asks
		)
	);
	return {
		search,
		onSearch: setSearch,
		department,
		departments,
		onDepartment: setPickedDepartment,
		refresh: (): void => {
			void people.refetch();
		},
		options: (people.data?.items ?? []).filter((person) =>
			access.can(key, recordScope(person.departmentId))
		),
	};
};
