import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { validatesOnOpen } from "@/features/scheduling/rulesCheck/issuesFromValidation";
import {
	rosterRulesCheckQuery,
	type RosterRulesCheck,
} from "@/features/scheduling/rulesCheck/rosterRulesCheckApi";
import {
	rulesCheckRefusalOf,
	type RulesCheckRefusal,
} from "@/features/scheduling/rulesCheck/rosterRulesCheckWords";
import type { RosterChangeTarget } from "@/features/scheduling/rosterChanges/useRosterChangeActions";

/** Where the validation stands: not asked yet, asking, answered, or refused with why. */
export type RosterRulesCheckState =
	| { status: "idle" | "loading" }
	| { status: "ready"; check: RosterRulesCheck }
	| { status: "refused"; refusal: RulesCheckRefusal };

/** Validate schedule's state as the roster reads it: where it stands, how to ask, and the last answer. */
export type RosterValidation = RosterRulesCheckState & {
	ask: () => void;
	last?: LastValidation;
	/** The roster's revision now, which an answer is compared with to say whether it is out of date. */
	revision: number;
};

/** The last answer this visit got, the revision it was for, and when it came (epoch milliseconds). */
export type LastValidation = {
	revision: number;
	check: RosterRulesCheck;
	checkedAt?: number;
};

/** A target that asks nothing: no roster may be validated here. */
const NO_TARGET: RosterChangeTarget = {
	companyId: "",
	unit: { branchId: "", departmentId: "" },
	scheduleId: "",
	runId: null,
};

/**
 * Validate schedule: asked by `ask`, or by itself as the page opens on a
 * roster whose hand changes (`hasChanges`) nothing has validated in this
 * visit (`validatesOnOpen`), once per revision; nothing at all without a
 * `target` (someone who may not read the roster). An ask holds for the
 * revision it was made at, so a roster changed since is unasked again; `last`
 * keeps the latest answer and its revision, which the week bar's button
 * compares with the roster's revision to light up.
 */
export const useRosterRulesCheck = (
	target: RosterChangeTarget | undefined,
	revision: number,
	hasChanges = false
): RosterValidation => {
	const [askedAt, setAskedAt] = useState<number>();
	const [last, setLast] = useState<LastValidation>();
	// Set while rendering, as `last` is: the ask starts with this render, and a re-render finds it asked.
	if (
		validatesOnOpen({
			mayValidate: target !== undefined,
			revision,
			last,
			hasChanges,
			askedAt,
		})
	)
		setAskedAt(revision);
	const asked = target !== undefined && askedAt === revision;
	const query = useQuery(
		rosterRulesCheckQuery(target ?? NO_TARGET, revision, asked)
	);
	// The latest answer is remembered for the button once the query moves on to a new revision.
	if (asked && query.data && last?.check !== query.data)
		setLast({ revision, check: query.data, checkedAt: query.dataUpdatedAt });
	const ask = (): void => {
		// An ask already in flight is the answer to wait for, never a second request.
		if (query.isFetching) return;
		if (asked) void query.refetch();
		else setAskedAt(revision);
	};

	if (!asked) return { status: "idle", ask, last, revision };
	if (query.isError)
		return {
			status: "refused",
			refusal: rulesCheckRefusalOf(query.error),
			ask,
			last,
			revision,
		};
	if (query.data === undefined || query.isFetching)
		return { status: "loading", ask, last, revision };
	return { status: "ready", check: query.data, ask, last, revision };
};
