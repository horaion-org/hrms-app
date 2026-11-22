import type { Ref } from "react";
import { Trans, useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
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
	/** Opens the card's review inside the row; without it (an offer out to its person) there is nothing to review. */
	onReview?: () => void;
	/** The Review button, so focus can come back to it from the review. */
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
 * (and "Fills 1 of 2", "Taken off this shift earlier" when so) and the week,
 * with Review at its end. An offer out to its person reads in Review's place;
 * a declined one says so.
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
	const { offer, leaves, change } = card;
	return (
		<div
			className={joinClassNames(
				"grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-x-2.5 gap-y-1.5 rounded-lg border p-2.5",
				card.suggested ? "border-ink-blue-500" : "border-neutral-400"
			)}
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
					<span className="ms-auto flex items-center gap-2">
						{offer.kind === "declined" && (
							<span className="text-xs text-neutral-700">
								{t(`${key}.declined`)}
							</span>
						)}
						{offer.kind === "open" ? (
							<span className="text-xs text-neutral-700">
								{t(`${key}.offerSent`, {
									time: offer.until
										? formatOfferTime(offer.until, language, timeZone, now)
										: "",
								})}
							</span>
						) : (
							onReview && (
								<Button
									ref={reviewRef}
									aria-label={t(`${key}.reviewFor`, { name: card.people })}
									size="sm"
									variant="secondary"
									onClick={onReview}
								>
									{t(`${key}.review`)}
								</Button>
							)
						)}
					</span>
				</span>
			</span>
		</div>
	);
};
