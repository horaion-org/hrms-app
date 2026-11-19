import type { CoverOption } from "@/features/scheduling/cover/api";
import type { CoverListView } from "@/features/scheduling/cover/coverListView";
import type { CoverWithEngine } from "@/features/scheduling/cover/coverWithEngine";
import { repairCells } from "@/features/scheduling/cover/engineRepairChange";
import type { RepairOption } from "@/features/scheduling/cover/engineRepairApi";
import type { ChangeTilePair } from "@/features/scheduling/roster/changeTiles";
import type { RosterChangeCell } from "@/features/scheduling/rosterChanges/api";

/*
 * A short shift's options as the Issues panel's cards, pure: who, one badge
 * for what it costs, the change as before → after pairs, and which one card
 * is suggested. The list is the one `coverListView` chooses: the engine's
 * options, or the backend's people (when the engine cannot answer, and on a
 * published roster, whose offers go out from them).
 */

/** The one badge a card carries. */
export type CoverCardBadge =
	| { kind: "withinHours" }
	| { kind: "extraHours" }
	| { kind: "overtime" }
	/** The gap stays this many short once applied. */
	| { kind: "leavesShort"; count: number }
	/** From the hours-based list, which checks no scheduling rule. */
	| { kind: "notRuleChecked" };

/** What a card's Review opens: an engine option's change, or a person of the backend's list. */
export type CoverCardChoice =
	| {
			kind: "engine";
			option: RepairOption;
			/** The change as the roster takes it; none for one made by hand. */
			cells: Array<RosterChangeCell> | undefined;
	  }
	| { kind: "backend"; option: CoverOption };

/** One option's card. */
export type CoverCard = {
	key: string;
	/** Who the change is for, each person once. */
	name: string;
	badge: CoverCardBadge;
	/** The change drawn; empty for an engine option made by hand. */
	pairs: Array<ChangeTilePair>;
	suggested: boolean;
	choice: CoverCardChoice;
};

/** What the cards are made from. */
export type CoverCardSources = {
	view: CoverListView;
	/** The engine's options, once it answered; feasible first. */
	engineOptions: ReadonlyArray<RepairOption> | undefined;
	/** The backend's people, with the engine's answer merged in where it gave one. */
	backend: CoverWithEngine | undefined;
	/** A member's name by membership id. */
	memberName: (membershipId: string) => string;
	/** A change's cells drawn as pairs (`changeTilePairs`). */
	pairsOf: (cells: ReadonlyArray<RosterChangeCell>) => Array<ChangeTilePair>;
};

/** An engine option's people, each once, as the engine names them. */
const peopleOf = (
	option: RepairOption,
	memberName: CoverCardSources["memberName"]
): string => {
	const names = option.moves.map(
		(move) =>
			move.displayName ??
			(move.membershipId === null ? "" : memberName(move.membershipId))
	);
	return [...new Set(names.filter(Boolean))].join(", ");
};

/** The overtime an engine option adds: its own count, else its stretches' minutes. */
export const engineOvertimeMinutes = (option: RepairOption): number =>
	option.extraMinutes?.overtime ??
	option.moves.reduce(
		(minutes, move) =>
			move.kind === "OVERTIME_EXTENSION"
				? minutes + (move.extensionMinutes ?? 0)
				: minutes,
		0
	);

/** An engine option's badge: what it leaves short, else whether it costs overtime. */
const engineBadge = (option: RepairOption): CoverCardBadge => {
	if (option.leftShort.length > 0)
		return { kind: "leavesShort", count: option.leftShortBy ?? 1 };
	return engineOvertimeMinutes(option) > 0
		? { kind: "overtime" }
		: { kind: "withinHours" };
};

/** The engine's verdicts that vouch for a person of the backend's list. */
const VOUCHED = ["fills", "couldTake"];

/** A backend person's badge: their hours when the engine vouched for them, else that no rule was checked. */
const backendBadge = (
	option: CoverOption,
	backend: CoverWithEngine
): CoverCardBadge => {
	if (!VOUCHED.includes(backend.engineNote[option.membershipId] ?? ""))
		return { kind: "notRuleChecked" };
	if (option.kind === "OVERTIME") return { kind: "overtime" };
	return option.kind === "EXTRA_HOURS"
		? { kind: "extraHours" }
		: { kind: "withinHours" };
};

/** The engine's feasible options as cards, its first choice suggested. */
const engineCards = ({
	engineOptions = [],
	memberName,
	pairsOf,
}: CoverCardSources): Array<CoverCard> =>
	engineOptions
		.filter((option) => option.feasible)
		.map((option, rank) => {
			const cells = repairCells(option);
			return {
				// An option has no id of its own; its place in the engine's ranking is stable.
				key: `engine|${rank}`,
				name: peopleOf(option, memberName),
				badge: engineBadge(option),
				pairs: cells ? pairsOf(cells) : [],
				suggested: rank === 0,
				choice: { kind: "engine", option, cells },
			};
		});

/** The backend's people as cards: the engine's choice suggested, else the first. */
const backendCards = ({
	backend,
	memberName,
	pairsOf,
}: CoverCardSources): Array<CoverCard> => {
	if (!backend) return [];
	const suggested = backend.suggested ?? backend.options[0]?.membershipId;
	return backend.options.map((option) => ({
		key: `backend|${option.membershipId}`,
		name: memberName(option.membershipId),
		badge: backendBadge(option, backend),
		pairs: pairsOf(option.cells),
		suggested: option.membershipId === suggested,
		choice: { kind: "backend", option },
	}));
};

/** The cards of the list `coverListView` chose; none while the gap's own state stands in. */
export const coverCards = (sources: CoverCardSources): Array<CoverCard> => {
	if (sources.view === "engine") return engineCards(sources);
	if (sources.view === "gapStatus") return [];
	return backendCards(sources);
};

/** A week's hours for the review: before → after of the contract, and the overtime past it. */
export type WeekHours = {
	beforeMinutes: number;
	afterMinutes: number;
	contractMinutes: number;
	overtimeMinutes: number;
	/** How full the week is after, 0 to 100, for the bar. */
	percent: number;
};

/** The person's week if a backend option is applied, as its own figures say. */
export const weekHoursOf = (option: CoverOption): WeekHours => {
	const { before, after, contract } = option.weekMinutes;
	return {
		beforeMinutes: before,
		afterMinutes: after,
		contractMinutes: contract,
		overtimeMinutes: Math.max(0, after - contract),
		percent: contract > 0 ? Math.min(100, (after / contract) * 100) : 100,
	};
};
