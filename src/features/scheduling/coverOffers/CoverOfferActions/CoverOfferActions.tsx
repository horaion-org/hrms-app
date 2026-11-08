import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Select } from "@/components/forms/Select";
import { TimeSelect } from "@/components/forms/TimeSelect";
import { Button } from "@/components/ui/Button";
import {
	RECORDED_HOW,
	type CoverOffer,
	type CoverOfferRecordedHow,
} from "@/features/scheduling/coverOffers/api";
import type { CoverOfferRefusal } from "@/features/scheduling/coverOffers/coverOfferRefusal";
import {
	formatOfferTime,
	latestTimeStep,
	MAX_PARALLEL_OFFERS,
	recordedInstant,
} from "@/features/scheduling/coverOffers/coverOfferRules";

export type CoverOfferActionsProps = {
	/** The member asked, as the panel names them. */
	name: string;
	/** The roster's time zone: deadlines read, and a recorded yes is timed, on its clock. */
	timeZone: string;
	/** Other members' open offers for the same gap: said above the buttons; at three, no more are sent. */
	rivals?: ReadonlyArray<CoverOffer>;
	/** Whether the change is ready to go: previewed, and its checks answered. */
	ready: boolean;
	/** The member already has an open offer this day, so only a recorded yes may follow. */
	sendBlocked?: boolean;
	/** Which action is in flight, if any. */
	pending?: "send" | "record";
	/** Why the last action didn't go through, if it didn't. */
	refusal?: CoverOfferRefusal;
	onSend: () => void;
	/** A yes given outside the app: how, and the instant it was given. */
	onRecord: (recorded: { how: CoverOfferRecordedHow; when: string }) => void;
	/** The clock, for tests and stories; now by default. */
	now?: () => Date;
};

const key = "scheduling.coverOffers.actions";

/**
 * What replaces "Apply change" on a published roster for a change that adds
 * or moves work: a plain line saying why, then "They agreed" and "Send
 * offer". "They agreed" opens two fields in place (how, at what time today)
 * and applies at once. Refusals are text beside the buttons. Once an offer
 * is out, `CoverOfferSent` takes its place.
 */
export const CoverOfferActions = ({
	name,
	timeZone,
	rivals = [],
	ready,
	sendBlocked = false,
	pending,
	refusal,
	onSend,
	onRecord,
	now = (): Date => new Date(),
}: CoverOfferActionsProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = i18n.resolvedLanguage ?? i18n.language;
	const [recording, setRecording] = useState(false);
	const [how, setHow] = useState<CoverOfferRecordedHow>();
	const [time, setTime] = useState(() => latestTimeStep(now(), timeZone));
	const [triedRecord, setTriedRecord] = useState(false);
	const titleId = useId();
	const howId = useId();
	const whenId = useId();
	const howField = useRef<HTMLButtonElement>(null);
	const agreedButton = useRef<HTMLButtonElement>(null);
	// Opening the section moves focus to "How"; Back returns it to "They agreed".
	const focusNext = useRef<"how" | "agreed">(undefined);
	useEffect(() => {
		if (focusNext.current === "how") howField.current?.focus();
		if (focusNext.current === "agreed") agreedButton.current?.focus();
		focusNext.current = undefined;
	}, [recording]);

	const refusalLine = refusal && (
		<p className="text-sm text-error-700" role="alert">
			{t(`${key}.error.${refusal}`, { name })}
		</p>
	);

	const instant = recordedInstant(now(), timeZone, time);
	const howError = triedRecord && how === undefined;
	const whenError = instant === undefined;

	if (recording)
		return (
			<section aria-labelledby={titleId} className="flex flex-col gap-3">
				<h3 className="text-sm font-medium text-neutral-800" id={titleId}>
					{t(`${key}.recordTitle`, { name })}
				</h3>
				<FormRow
					required
					error={howError ? t(`${key}.howRequired`) : undefined}
					htmlFor={howId}
					label={t(`${key}.how`)}
					layout="stacked"
				>
					<Select
						ref={howField}
						aria-invalid={howError}
						aria-labelledby={formRowIds(howId).labelId}
						placeholder={t(`${key}.how`)}
						status={howError ? "error" : undefined}
						value={how}
						options={RECORDED_HOW.map((value) => ({
							value,
							label: t(`${key}.howOptions.${value}`),
						}))}
						onChange={(value) => {
							setHow(value as CoverOfferRecordedHow);
						}}
					/>
				</FormRow>
				<FormRow
					required
					error={whenError ? t(`${key}.whenFuture`) : undefined}
					hint={t(`${key}.whenHint`)}
					htmlFor={whenId}
					label={t(`${key}.when`)}
					layout="stacked"
				>
					<TimeSelect
						aria-invalid={whenError}
						aria-labelledby={formRowIds(whenId).labelId}
						status={whenError ? "error" : undefined}
						value={time}
						onChange={setTime}
					/>
				</FormRow>
				<p className="text-sm text-neutral-800">
					{t(`${key}.recordHint`, { name })}
				</p>
				{refusalLine}
				<div className="flex items-center justify-end gap-3">
					<Button
						variant="textlink"
						onClick={() => {
							focusNext.current = "agreed";
							setRecording(false);
						}}
					>
						{t(`${key}.back`)}
					</Button>
					<Button
						disabled={!ready}
						loading={pending === "record"}
						size="sm"
						onClick={() => {
							setTriedRecord(true);
							if (how === undefined || instant === undefined) return;
							onRecord({ how, when: instant });
						}}
					>
						{t(`${key}.recordAndApply`)}
					</Button>
				</div>
			</section>
		);

	const groupFull = rivals.length >= MAX_PARALLEL_OFFERS;
	return (
		<div className="flex flex-col gap-3">
			<p className="text-sm text-neutral-800">
				{t(`${key}.mustAgree`, { name })}
			</p>
			{rivals.length > 0 && (
				<p className="text-sm text-neutral-800">
					{groupFull
						? t(`${key}.groupFull`, { count: rivals.length })
						: t(`${key}.rivals`, {
								count: rivals.length,
								names: rivals
									.map((offer) => {
										const who =
											offer.member?.displayName ??
											t("scheduling.detail.formerMember");
										return offer.expiresAt
											? `${who} (${formatOfferTime(offer.expiresAt, language, timeZone, now())})`
											: who;
									})
									.join(", "),
							})}
				</p>
			)}
			{refusalLine}
			<div className="flex justify-end gap-3">
				<Button
					ref={agreedButton}
					disabled={!ready || pending !== undefined}
					size="sm"
					variant="secondary"
					onClick={() => {
						focusNext.current = "how";
						setRecording(true);
					}}
				>
					{t(`${key}.theyAgreed`)}
				</Button>
				{!groupFull && (
					<Button
						disabled={!ready || sendBlocked}
						loading={pending === "send"}
						size="sm"
						onClick={onSend}
					>
						{t(`${key}.sendOffer`)}
					</Button>
				)}
			</div>
		</div>
	);
};
