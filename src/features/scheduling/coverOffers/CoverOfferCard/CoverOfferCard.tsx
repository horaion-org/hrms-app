import { useId, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { FormRow } from "@/components/forms/FormRow";
import { Textarea } from "@/components/forms/Textarea";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DescriptionList } from "@/components/ui/DescriptionList";
import { FillShiftsIcon, TickIcon, TimeIcon } from "@/components/ui/Icon";
import { Quote } from "@/components/ui/Quote";
import {
	COVER_OFFER_ANSWER_REASON_MAX_LENGTH,
	type CoverOffer,
} from "@/features/scheduling/coverOffers/api";
import {
	formatOfferTime,
	offerStanding,
	payWordsOf,
} from "@/features/scheduling/coverOffers/coverOfferRules";
import { payText } from "@/features/scheduling/coverOffers/coverOfferWords";
import { formatTimeRange } from "@/features/scheduling/formatShift";
import { formatDay } from "@/features/scheduling/periods";

/** Why the member's answer didn't go through. */
export type CoverOfferAnswerRefusal = "stale" | "notOpen" | "failed";

export type CoverOfferCardProps = {
	offer: CoverOffer;
	/** The roster's time zone, which the deadline reads in. */
	timeZone: string;
	/** The clock, renewed each minute by the page, so a deadline passing removes the buttons. */
	now: Date;
	/** What the day holds now, e.g. "Day off". */
	was?: string;
	pending?: "accept" | "decline";
	refusal?: CoverOfferAnswerRefusal;
	onAccept: () => void;
	/** Declines, with what the member chose to add. */
	onDecline: (reason: string | undefined) => void;
};

const key = "scheduling.coverOffers.card";

/**
 * One shift offered to the member, at the top of their roster: when, what
 * changes, the pay in words, who asked and by when to answer, with the
 * manager's note. Accept is one tap (the card is the review); Decline first
 * offers an optional reason. Once the offer is closed, one line says why in
 * place of the buttons.
 */
export const CoverOfferCard = ({
	offer,
	timeZone,
	now,
	was,
	pending,
	refusal,
	onAccept,
	onDecline,
}: CoverOfferCardProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	const [declining, setDeclining] = useState(false);
	const [reason, setReason] = useState("");
	const reasonId = useId();
	const manager = offer.createdBy.displayName ?? t(`${key}.formerManager`);
	const standing = offerStanding(offer, now);
	const time = (instant: string | null): string =>
		instant ? formatOfferTime(instant, language, timeZone, now) : "";

	const closedLine = (): ReactNode => {
		switch (standing.kind) {
			case "open":
				return null;
			case "accepted":
				return (
					<>
						<TickIcon aria-hidden="true" className="size-5 text-success-700" />
						{standing.at
							? t(`${key}.closed.accepted`, { time: time(standing.at) })
							: t(`${key}.closed.acceptedNoTime`)}
					</>
				);
			case "declined":
				return standing.at
					? t(`${key}.closed.declined`, { time: time(standing.at) })
					: t(`${key}.closed.declinedNoTime`);
			case "expired":
				return (
					<>
						<TimeIcon aria-hidden="true" className="size-5 text-neutral-700" />
						{t(`${key}.closed.expired`, {
							time: time(standing.at),
							name: manager,
						})}
					</>
				);
			case "withdrawn":
				return t(`${key}.closed.withdrawn`);
			case "unavailable":
				return t(`${key}.closed.unavailable`);
		}
	};

	const details = [
		...(was ? [{ label: t(`${key}.was`), value: was }] : []),
		{ label: t(`${key}.pay`), value: payText(payWordsOf(offer), t) },
		{
			label: t(`${key}.askedBy`),
			value: t(`${key}.askedByValue`, { name: manager }),
		},
		...(standing.kind === "open" && offer.expiresAt
			? [
					{
						label: t(`${key}.answerBy`),
						value: (
							<time dateTime={offer.expiresAt}>{time(offer.expiresAt)}</time>
						),
					},
				]
			: []),
	];

	const answer = (): ReactNode => {
		if (standing.kind !== "open")
			return (
				<p
					className="flex items-center gap-2 text-sm text-neutral-900"
					role="status"
				>
					{closedLine()}
				</p>
			);
		const refusalLine = refusal && (
			<p className="text-sm text-error-700" role="alert">
				{t(`${key}.error.${refusal}`, { name: manager })}
			</p>
		);
		if (declining)
			return (
				<div className="flex flex-col gap-3">
					<FormRow
						counter={`${reason.length}/${COVER_OFFER_ANSWER_REASON_MAX_LENGTH}`}
						htmlFor={reasonId}
						label={t(`${key}.reason`, { name: manager })}
						layout="stacked"
					>
						<Textarea
							autoFocus
							className="w-full"
							id={reasonId}
							maxLength={COVER_OFFER_ANSWER_REASON_MAX_LENGTH}
							rows={2}
							value={reason}
							onChange={(event) => {
								setReason(event.target.value);
							}}
						/>
					</FormRow>
					{refusalLine}
					<Button
						className="w-full"
						loading={pending === "decline"}
						variant="secondary"
						onClick={() => {
							onDecline(reason.trim() === "" ? undefined : reason.trim());
						}}
					>
						{t(`${key}.sendDecline`)}
					</Button>
					<Button
						className="self-center"
						variant="textlink"
						onClick={() => {
							setDeclining(false);
						}}
					>
						{t(`${key}.back`)}
					</Button>
				</div>
			);
		return (
			<div className="flex flex-col gap-3">
				{refusalLine}
				<Button
					className="w-full"
					disabled={pending !== undefined}
					loading={pending === "accept"}
					onClick={onAccept}
				>
					{t(`${key}.accept`)}
				</Button>
				<Button
					className="w-full"
					disabled={pending !== undefined}
					variant="secondary"
					onClick={() => {
						setDeclining(true);
					}}
				>
					{t(`${key}.decline`)}
				</Button>
			</div>
		);
	};

	return (
		<Card icon={FillShiftsIcon} title={t(`${key}.title`)}>
			<div>
				<p className="text-base font-bold text-neutral-900">
					{formatDay(offer.rosterDate, language)}
					{offer.shift && ` · ${offer.shift.name}`}
				</p>
				{offer.shift && (
					<p className="text-sm text-neutral-800">
						{formatTimeRange(offer.shift, t)}
					</p>
				)}
			</div>
			<DescriptionList items={details} />
			{offer.remark && (
				<Quote caption={t(`${key}.noteCaption`, { name: manager })}>
					{offer.remark}
				</Quote>
			)}
			{answer()}
		</Card>
	);
};
