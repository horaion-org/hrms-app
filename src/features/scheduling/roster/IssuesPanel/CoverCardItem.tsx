import type { Ref } from "react";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatOfferTime } from "@/features/scheduling/coverOffers/coverOfferRules";
import type { OptionCard } from "@/features/scheduling/roster/coverCards";
import { ChangeTilePairs } from "./ChangeTilePairs";
import { COST_CHIP_TONES } from "./issuePanelLooks";

export type CoverCardItemProps = {
	card: OptionCard;
	/** The short shift's day, which the row names: the card's pairs on it say no date. */
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

/**
 * One option (UX note 2): initials and who, "Suggested" on the one card
 * suggested, what it is, the change drawn by person and day, what it still
 * leaves short in red, then its cost chips (and "Taken off this shift
 * earlier" when so) and the week with Review at the
 * end of that line (on a line of its own only when it does not fit). An offer
 * out to its person reads in Review's place; a declined one says so.
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
	const { offer, leaves } = card;
	return (
		<div
			className={joinClassNames(
				"grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-2.5 rounded-lg border p-2.5",
				card.suggested ? "border-ink-blue-500" : "border-neutral-400"
			)}
		>
			{/* One face per card: the first person's, whose change comes first. */}
			<Avatar
				className="size-8! text-xs!"
				name={card.groups[0]?.name || card.people}
			/>
			<div className="flex min-w-0 flex-col gap-1">
				<span className="flex flex-wrap items-center gap-1.5">
					<span className="font-semibold text-neutral-900">{card.people}</span>
					{card.suggested && (
						<Badge compact tone="neutral">
							{t("scheduling.cover.list.suggested")}
						</Badge>
					)}
				</span>
				<span className="text-neutral-800">{card.kindLine}</span>
				<ChangeTilePairs groups={card.groups} knownDay={gapDay} />
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
			</div>
		</div>
	);
};
