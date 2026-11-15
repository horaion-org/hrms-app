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

/** Where the check stands: not asked yet, asking, answered, or refused with why. */
export type RosterRulesCheckState =
	| { status: "idle" | "loading" }
	| { status: "ready"; check: RosterRulesCheck }
	| { status: "refused"; refusal: RulesCheckRefusal };

/**
 * The roster's rules check, asked for on demand: nothing is sent until `ask`.
 * An ask holds for the revision it was made at, so a roster changed since is
 * unchecked again rather than shown with an old answer, as the engine's
 * repair options are.
 */
export const useRosterRulesCheck = (
	target: RosterChangeTarget,
	revision: number
): RosterRulesCheckState & { ask: () => void } => {
	const [askedAt, setAskedAt] = useState<number>();
	const asked = askedAt === revision;
	const query = useQuery(rosterRulesCheckQuery(target, revision, asked));
	const ask = (): void => {
		if (asked) void query.refetch();
		else setAskedAt(revision);
	};

	if (!asked) return { status: "idle", ask };
	if (query.isError)
		return {
			status: "refused",
			refusal: rulesCheckRefusalOf(query.error),
			ask,
		};
	if (query.data === undefined || query.isFetching)
		return { status: "loading", ask };
	return { status: "ready", check: query.data, ask };
};
