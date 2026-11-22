import { useId, type Ref } from "react";
import { Trans, useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { ChevronRightIcon } from "@/components/ui/Icon";
import { formatOfferTime } from "@/features/scheduling/coverOffers/coverOfferRules";
import type {
	OptionCard,
	PersonSentence,
} from "@/features/scheduling/roster/coverCards";
import { ChangeTilePairs } from "./ChangeTilePairs";
import { COST_CHIP_TONES } from "./issuePanelLooks";

export type CoverCardItemProps = {
	card: OptionCard;
	/** The short shift's day, which the row names: a drawn change's pairs on it say no date. */
	gapDay?: string;
	/** Opens the card's review inside the row; without it there is nothing to review. */
	onReview?: () => void;
	/** The card itself, when it opens the review, so focus can come back to it from the review. */
	reviewRef?: Ref<HTMLButtonElement>;
	/** The roster's time zone and now, for an offer's deadline. */
	timeZone: string;
	now: Date;
};

const key = "scheduling.issues.cover";

/** The chip on the one card suggested. */
const SuggestedBadge = (): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<Badge compact tone="neutral">
			{t("scheduling.cover.list.suggested")}
		</Badge>
	);
};

/**
 * One person's line: their initials, then their sentence, the name in the
 * card's name weight and the rest in its body weight; "Suggested" after the
 * first person's sentence on the suggested card.
 */
const PersonLine = ({
	sentence,
	suggested,
}: {
	sentence: PersonSentence;
	suggested: boolean;
}): FunctionComponent => (
	<>
		{/* The sentence names them; the initials are only a face. */}
		<Avatar
			aria-hidden="true"
			className="size-8! text-xs!"
			name={sentence.name}
		/>
		<span className="flex flex-wrap items-center gap-x-1.5 gap-y-1 self-center text-neutral-800">
			<span>
				<Trans
					i18nKey={sentence.key}
					values={{ ...sentence.values, name: sentence.name }}
					components={{
						name: <span className="font-semibold text-neutral-900" />,
					}}
				/>
			</span>
			{suggested && <SuggestedBadge />}
		</span>
	</>
);

/**
 * A change no sentence says (the older repair's): one face, who, "2
 * changes", and each person's days drawn under their name, as before.
 */
const DrawnChange = ({
	card,
	changeCount,
	gapDay,
}: {
	card: OptionCard;
	changeCount: string;
	gapDay: string | undefined;
}): FunctionComponent => (
	<>
		{/* One face: the first person's, whose change comes first. */}
		<Avatar
			className="size-8! text-xs!"
			name={card.groups[0]?.name || card.people}
		/>
		<span className="flex min-w-0 flex-col gap-1">
			<span className="flex flex-wrap items-center gap-1.5">
				<span className="font-semibold text-neutral-900">{card.people}</span>
				{card.suggested && <SuggestedBadge />}
			</span>
			<span className="text-neutral-800">{changeCount}</span>
			<ChangeTilePairs groups={card.groups} knownDay={gapDay} />
		</span>
	</>
);

/**
 * One option (UX note 2026-11-22 §2): one line per person, their initials
 * and their sentence ("Aisha Rahman comes in on a day off"), "Suggested" on
 * the one card suggested; a change no sentence says is drawn instead. Under
 * them what it still leaves short in red, then one cost line: its cost chips
 * (and "Fills 1 of 2", "Taken off this shift earlier" when so), the week, and
 * a declined offer's "Declined". The whole card opens its review, a chevron
 * at its right edge, as RosterShift's tile opens its day; a card with an
 * offer out to its person is no control and says so on its cost line.
 */
export const CoverCardItem = ({
	card,
	gapDay,
	onReview,
	reviewRef,
	timeZone,
	now,
}: CoverCardItemProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	const bodyId = useId();
	const { offer, leaves, change } = card;
	const opensReview = onReview !== undefined && offer.kind !== "open";
	const looks = joinClassNames(
		"w-full rounded-lg border p-2.5 text-left",
		card.suggested ? "border-ink-blue-500" : "border-neutral-400"
	);
	const body = (
		<span
			className="grid min-w-0 flex-1 grid-cols-[2rem_minmax(0,1fr)] items-start gap-x-2.5 gap-y-1.5"
			id={bodyId}
		>
			{change.kind === "sentences" ? (
				change.sentences.map((sentence, place) => (
					<PersonLine
						key={sentence.membershipId}
						sentence={sentence}
						suggested={card.suggested && place === 0}
					/>
				))
			) : (
				<DrawnChange
					card={card}
					changeCount={change.changeCount}
					gapDay={gapDay}
				/>
			)}
			<span className="col-start-2 flex min-w-0 flex-col gap-1">
				{leaves?.kind === "part" && (
					<span className="text-error-700">{leaves.text}</span>
				)}
				<span className="flex flex-wrap items-center gap-1.5">
					{card.costChips.map((chip) => (
						<Badge key={chip.kind} compact tone={COST_CHIP_TONES[chip.kind]}>
							{chip.text}
						</Badge>
					))}
					{leaves?.kind === "onePerson" && (
						<Badge compact tone="neutral">
							{leaves.text}
						</Badge>
					)}
					{card.takenOffEarlier && (
						<Badge compact tone="neutral">
							{card.takenOffEarlier}
						</Badge>
					)}
					{card.weekLine && (
						<span className="text-xs text-neutral-700">{card.weekLine}</span>
					)}
					{offer.kind === "declined" && (
						<span className="ms-auto text-xs text-neutral-700">
							{t(`${key}.declined`)}
						</span>
					)}
					{offer.kind === "open" && (
						<span className="ms-auto text-xs text-neutral-700">
							{t(`${key}.offerSent`, {
								time: offer.until
									? formatOfferTime(offer.until, language, timeZone, now)
									: "",
							})}
						</span>
					)}
				</span>
			</span>
		</span>
	);
	if (!opensReview) return <div className={looks}>{body}</div>;
	return (
		<button
			ref={reviewRef}
			aria-describedby={bodyId}
			aria-label={t(`${key}.reviewFor`, { name: card.people })}
			type="button"
			className={joinClassNames(
				looks,
				"flex cursor-pointer items-center gap-2 hover:brightness-98 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-blue-500"
			)}
			onClick={onReview}
		>
			{body}
			<ChevronRightIcon
				aria-hidden="true"
				className="size-5 shrink-0 text-neutral-600"
			/>
		</button>
	);
};
