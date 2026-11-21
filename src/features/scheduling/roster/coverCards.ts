import type { CoverOption } from "@/features/scheduling/cover/api";
import type { CoverListView } from "@/features/scheduling/cover/coverListView";
import type { CoverWithEngine } from "@/features/scheduling/cover/coverWithEngine";
import { repairCells } from "@/features/scheduling/cover/engineRepairChange";
import type {
	RepairOption,
	RepairShortSpan,
} from "@/features/scheduling/cover/engineRepairApi";
import type {
	ChangeTileGroup,
	ChangeTilePair,
} from "@/features/scheduling/roster/changeTiles";
import type { RosterChangeCell } from "@/features/scheduling/rosterChanges/api";
import type { TFunction } from "i18next";
import type { CoverOffer } from "@/features/scheduling/coverOffers/api";
import { offerStanding } from "@/features/scheduling/coverOffers/coverOfferRules";
import {
	costChips,
	optionKindLine,
	weekLine,
	whatItLeaves,
	type CostChip,
	type OptionWordSources,
	type WhatItLeaves,
} from "@/features/scheduling/cover/engineRepairWords";

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

/** Where an offer to the card's one person stands: none, sent and waiting, or declined. */
export type CardOffer =
	| { kind: "none" }
	| { kind: "open"; until: string | null }
	| { kind: "declined" };

/** What an option card's Review opens: an engine option, or a person of the hours-based list. */
export type OptionCardChoice =
	| { kind: "engine"; option: RepairOption }
	| { kind: "backend"; option: CoverOption };

/** One option's card, every line in words (UX note 2): who, what, the change drawn, the cost, what it leaves. */
export type OptionCard = {
	key: string;
	/** Who the change is for: "Aisha Rahman", "Ben Ong and Chen Wei". */
	people: string;
	/** What it is, by kind: "Comes in on a day off". */
	kindLine: string;
	groups: Array<ChangeTileGroup>;
	costChips: Array<CostChip>;
	/** One person's week before and after; none for two people, or when the ledger could not price it. */
	weekLine: string | undefined;
	leaves: WhatItLeaves | undefined;
	suggested: boolean;
	offer: CardOffer;
	choice: OptionCardChoice;
};

/** What the option cards are made from. */
export type OptionCardSources = OptionWordSources & {
	/** A member's name by membership id, for someone the answer does not name. */
	memberName: (membershipId: string) => string;
	/** A change's cells drawn by person (`changeTileGroups`). */
	groupsOf: (cells: ReadonlyArray<RosterChangeCell>) => Array<ChangeTileGroup>;
	/** What the roster has short on this gap now, which "Fills 1 of 2" counts from. */
	shortNow: ReadonlyArray<RepairShortSpan> | null;
	/** The roster's cover offers, on a published roster; none on a draft. */
	offers: ReadonlyArray<CoverOffer>;
	now: Date;
	t: TFunction;
};

/** The cards of the engine's options, with where the part fills start and how many show before the fold. */
export type OptionCardList = {
	cards: Array<OptionCard>;
	/** The place of the first card that fills only part, which the caption "Cover part of it" sits before; none when every card or no card is one. */
	partCaptionAt: number | undefined;
	/** Every card fills only part: the list opens with "Nothing covers the whole shift." */
	noFullFill: boolean;
	/** How many list items show before "Show all": three cards, and the caption when it falls among them. */
	collapsedCount: number;
};

/** How many cards show before the rest are folded away. */
export const CARDS_BEFORE_FOLD = 3;

/** The people a change names, in the answer's order: "Ben Ong and Chen Wei". */
const peopleNamesOf = (
	option: RepairOption,
	{ memberName, t }: OptionCardSources
): string =>
	t("scheduling.cover.engine.peopleAnd", {
		items: option.people.map(
			(person) => person.displayName ?? memberName(person.membershipId)
		),
	});

/** Where the latest offer to one person for one day stands, as a card shows it. */
const cardOfferOf = (
	offers: ReadonlyArray<CoverOffer>,
	cell: RosterChangeCell | undefined,
	now: Date
): CardOffer => {
	const latest = offers
		.filter(
			(offer) =>
				offer.member?.membershipId === cell?.membershipId &&
				offer.rosterDate === cell?.day
		)
		.at(-1);
	const standing = latest && offerStanding(latest, now);
	if (standing?.kind === "open") return { kind: "open", until: standing.until };
	return standing?.kind === "declined" ? { kind: "declined" } : { kind: "none" };
};

/** The day an option adds work on: its first WORK cell. */
const workCellOf = (option: RepairOption): RosterChangeCell | undefined =>
	option.cells.find((cell) => cell.kind === "WORK");

/** One engine option as its card, not yet marked Suggested. */
const optionCardOf = (
	option: RepairOption,
	rank: number,
	sources: OptionCardSources
): OptionCard => {
	const [onlyPerson, ...others] = option.people;
	const onePerson = onlyPerson !== undefined && others.length === 0;
	return {
		// An option has no id of its own; its place in the engine's ranking is stable.
		key: `engine|${rank}`,
		people: peopleNamesOf(option, sources),
		kindLine: optionKindLine(option, sources, sources.t),
		groups: sources.groupsOf(option.cells),
		costChips: costChips(option, sources.t),
		weekLine:
			onePerson && onlyPerson.weekMinutes
				? weekLine(onlyPerson.weekMinutes, sources.t)
				: undefined,
		leaves: whatItLeaves(option, sources.shortNow, sources.t),
		suggested: false,
		offer: onePerson
			? cardOfferOf(sources.offers, workCellOf(option), sources.now)
			: { kind: "none" },
		choice: { kind: "engine", option },
	};
};

/**
 * The engine's options as cards, in its order (UX note 3): the first is
 * Suggested when it fills more than part of the gap and its person has not
 * declined; the caption "Cover part of it" sits before the first part fill;
 * three cards show before the fold, the caption counted when it falls among
 * them. Pure.
 */
export const optionCardList = (
	options: ReadonlyArray<RepairOption>,
	sources: OptionCardSources
): OptionCardList => {
	const unmarked = options.map((option, rank) =>
		optionCardOf(option, rank, sources)
	);
	const isPart = (card: OptionCard): boolean =>
		card.choice.kind === "engine" && card.choice.option.fills === "PART";
	const firstPart = unmarked.findIndex(isPart);
	const noFullFill = unmarked.length > 0 && unmarked.every(isPart);
	const partCaptionAt = firstPart > 0 ? firstPart : undefined;
	const cards = unmarked.map((card, place) => ({
		...card,
		suggested: place === 0 && !isPart(card) && card.offer.kind !== "declined",
	}));
	return {
		cards,
		partCaptionAt,
		noFullFill,
		collapsedCount:
			partCaptionAt !== undefined && partCaptionAt < CARDS_BEFORE_FOLD
				? CARDS_BEFORE_FOLD + 1
				: CARDS_BEFORE_FOLD,
	};
};

/**
 * The hours-based people as cards, when the engine cannot answer: each comes
 * in on their day off, with its cost and "Not rule-checked", their week, and
 * the first one suggested as before. Pure.
 */
export const fallbackCards = (
	options: ReadonlyArray<CoverOption>,
	sources: OptionCardSources
): Array<OptionCard> =>
	options.map((option, place) => {
		const [cell] = option.cells;
		return {
			key: `backend|${option.membershipId}`,
			people: sources.memberName(option.membershipId),
			kindLine: optionKindLine(
				{ kind: "CALL_IN", cells: option.cells },
				sources,
				sources.t
			),
			groups: sources.groupsOf(option.cells),
			costChips: costChips(
				{
					extraMinutes: {
						overtime: option.pay.overtimeMinutes,
						pastContract: option.pay.extraMinutes,
						restDayWork: 0,
						timeOffEarned: 0,
					},
					workingTimeRulesChecked: false,
				},
				sources.t
			),
			weekLine: weekLine(option.weekMinutes, sources.t),
			leaves: undefined,
			suggested: place === 0,
			offer: cardOfferOf(sources.offers, cell, sources.now),
			choice: { kind: "backend", option },
		};
	});
