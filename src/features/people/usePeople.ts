import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ApiProblemError } from "@/common/problem";
import type { ListPage } from "@/features/organisation/api";
import {
	peopleQuery,
	type MemberProfile,
	type PeopleQuery,
} from "@/features/people/api";
import { workspaceQuery } from "@/features/workspace/api";
import { PEOPLE_READ_KEYS } from "@/features/workspace/permissionKeys";
import { retry } from "@/features/workspace/retry";
import { useCanAnywhere } from "@/features/workspace/useCan";

/**
 * One page of the People list. `hidden` when the person's grants don't reach
 * it anywhere, whether the workspace says so up front or the API refuses
 * with a 403. The API returns only the people in units where the key is
 * held, so the rows are never trimmed here.
 */
export type PeopleList =
	| { status: "pending" | "error" | "hidden" }
	| ({ status: "ready" } & ListPage<MemberProfile>);

export const usePeople = (
	companyId: string,
	query: PeopleQuery
): PeopleList => {
	const workspace = useQuery({ ...workspaceQuery, retry });
	const allowed = useCanAnywhere()(PEOPLE_READ_KEYS);
	const list = useQuery(peopleQuery(companyId, query, allowed));

	if (workspace.isPending) return { status: "pending" };
	if (workspace.isError) return { status: "error" };
	if (!allowed) return { status: "hidden" };
	if (list.error instanceof ApiProblemError && list.error.status === 403)
		return { status: "hidden" };
	if (list.isError) return { status: "error" };
	if (list.data === undefined) return { status: "pending" };
	return { status: "ready", ...list.data };
};

/** The search text once typing pauses, so each keystroke is not its own request. */
export const useSettledSearch = (text: string): string => {
	const [settled, setSettled] = useState(text.trim());
	useEffect(() => {
		const timeout = setTimeout(() => {
			setSettled(text.trim());
		}, 250);
		return (): void => {
			clearTimeout(timeout);
		};
	}, [text]);
	return settled;
};
