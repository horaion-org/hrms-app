import type { TFunction } from "i18next";
import type { CoverOption } from "@/features/scheduling/cover/api";
import type {
	RepairOption,
	RepairShortSpan,
} from "@/features/scheduling/cover/engineRepairApi";
import {
	costChips,
	optionKindLine,
	weekLine,
	whatItLeaves,
	type CostChip,
	type OptionWordSources,
	type WhatItLeaves,
} from "@/features/scheduling/cover/engineRepairWords";
import type { CoverOffer } from "@/features/scheduling/coverOffers/api";
import { offerStanding } from "@/features/scheduling/coverOffers/coverOfferRules";
import type { ChangeTileGroup } from "@/features/scheduling/roster/changeTiles";
import type { RosterChangeCell } from "@/features/scheduling/rosterChanges/api";

/*
 * A short shift's options as the Issues panel's cards, pure: who, what the
 * option is, the change drawn by person and day, what it costs, what it still
 * leaves short, and which one card is suggested. The list is the one
 * `coverListView` chooses: the engine's options, or the backend's people when
 * the engine cannot answer.
 */

/** A week's hours for the review: before → after of the contract, and the overtime past it. */
export type WeekHours = {
	beforeMinutes: number;
	afterMinutes: number;
	contractMinutes: number;
	overtimeMinutes: number;
	/** How full the week is after, 0 to 100, for the bar. */
	percent: number;
};

/** A person's week before and after a change, in minutes, against their contract. */
export type WeekMinutes = { before: number; after: number; contract: number };

/** A week as the review draws it: its minutes, the overtime past the contract, and how full it is. */
export const weekHoursOf = ({
	before,
	after,
	contract,
}: WeekMinutes): WeekHours => ({
	beforeMinutes: before,
	afterMinutes: after,
	contractMinutes: contract,
	overtimeMinutes: Math.max(0, after - contract),
	percent: contract > 0 ? Math.min(100, (after / contract) * 100) : 100,
});

/** One person a card's change is for, as the review shows them: their name and their week, when priced. */
export type ReviewPerson = {
	membershipId: string;
	name: string;
	weekMinutes: WeekMinutes | null;
};

/** The people a card's review shows a block for, in the order of its cells. */
export const reviewPeopleOf = (
	choice: OptionCardChoice,
	memberName: (membershipId: string) => string
): Array<ReviewPerson> =>
	choice.kind === "engine"
		? choice.option.people.map((person) => ({
				membershipId: person.membershipId,
				name: person.displayName ?? memberName(person.membershipId),
				weekMinutes: person.weekMinutes,
			}))
		: [
				{
					membershipId: choice.option.membershipId,
					name: memberName(choice.option.membershipId),
					weekMinutes: choice.option.weekMinutes,
				},
			];

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

/**
 * Where the newest offer to one person for the shift and day their card adds
 * stands, as the card shows it: the offers come newest first, and a decline
 * of another shift that day is no decline of this one.
 */
const cardOfferOf = (
	offers: ReadonlyArray<CoverOffer>,
	cell: RosterChangeCell | undefined,
	now: Date
): CardOffer => {
	const newest =
		cell?.kind === "WORK"
			? offers.find(
					(offer) =>
						offer.member?.membershipId === cell.membershipId &&
						offer.rosterDate === cell.day &&
						offer.shift?.shiftId === cell.shiftId
				)
			: undefined;
	const standing = newest && offerStanding(newest, now);
	if (standing?.kind === "open") return { kind: "open", until: standing.until };
	return standing?.kind === "declined"
		? { kind: "declined" }
		: { kind: "none" };
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
 * declined; the caption "Cover part of it" sits before the first part
 * fill. Pure.
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
	return { cards, partCaptionAt, noFullFill };
};

/**
 * The hours-based people as cards, when the engine cannot answer: each comes
 * in on their day off, with its cost and "Not rule-checked", their week, and
 * the first one suggested unless they declined. Pure.
 */
export const fallbackCards = (
	options: ReadonlyArray<CoverOption>,
	sources: OptionCardSources
): Array<OptionCard> =>
	options.map((option, place) => {
		const [cell] = option.cells;
		const offer = cardOfferOf(sources.offers, cell, sources.now);
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
			// As among the engine's options: someone who declined is never the one suggested.
			suggested: place === 0 && offer.kind !== "declined",
			offer,
			choice: { kind: "backend", option },
		};
	});

/** Whether two engine options make the same change: the same kind, and the same cells in the same order. */
const isSameChange = (first: RepairOption, second: RepairOption): boolean =>
	first.kind === second.kind &&
	JSON.stringify(first.cells) === JSON.stringify(second.cells);

/**
 * The card under review: the one whose engine option makes the chosen
 * change, wherever it ranks now, else the hours-based person chosen; none
 * when the answer no longer holds the change. Pure.
 */
export const reviewedCardOf = (
	cards: ReadonlyArray<OptionCard>,
	chosen: { option: RepairOption | undefined; membershipId: string | undefined }
): OptionCard | undefined =>
	cards.find(({ choice }) =>
		choice.kind === "engine"
			? chosen.option !== undefined &&
				isSameChange(choice.option, chosen.option)
			: chosen.option === undefined &&
				choice.option.membershipId === chosen.membershipId
	);
