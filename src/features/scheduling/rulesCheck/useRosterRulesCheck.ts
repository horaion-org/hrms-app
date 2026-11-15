import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
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
};

/** The last answer this visit got, and the revision it was for. */
export type LastValidation = { revision: number; check: RosterRulesCheck };

/** A target that asks nothing: no roster may be validated here. */
const NO_TARGET: RosterChangeTarget = {
	companyId: "",
	unit: { branchId: "", departmentId: "" },
	scheduleId: "",
	runId: null,
};

/**
 * Validate schedule, asked for on demand: nothing is sent until `ask`, and
 * nothing at all without a `target` (someone who may not change the roster).
 * An ask holds for the revision it was made at, so a roster changed since is
 * unasked again; `last` keeps the latest answer and its revision, which the
 * week bar's button compares with the roster's revision to light up.
 */
export const useRosterRulesCheck = (
	target: RosterChangeTarget | undefined,
	revision: number
): RosterValidation => {
	const [askedAt, setAskedAt] = useState<number>();
	const [last, setLast] = useState<LastValidation>();
	const asked = target !== undefined && askedAt === revision;
	const query = useQuery(
		rosterRulesCheckQuery(target ?? NO_TARGET, revision, asked)
	);
	// The latest answer is remembered for the button once the query moves on to a new revision.
	if (asked && query.data && last?.check !== query.data)
		setLast({ revision, check: query.data });
	const ask = (): void => {
		if (asked) void query.refetch();
		else setAskedAt(revision);
	};

	if (!asked) return { status: "idle", ask, last };
	if (query.isError)
		return {
			status: "refused",
			refusal: rulesCheckRefusalOf(query.error),
			ask,
			last,
		};
	if (query.data === undefined || query.isFetching)
		return { status: "loading", ask, last };
	return { status: "ready", check: query.data, ask, last };
};
