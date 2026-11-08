import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { useNow } from "@/common/useNow";
import { Button } from "@/components/ui/Button";
import type { CoverOffer } from "@/features/scheduling/coverOffers/api";
import { coverOfferRefusal } from "@/features/scheduling/coverOffers/coverOfferRefusal";
import {
	formatOfferTime,
	offersOutGroups,
	type OfferLine,
} from "@/features/scheduling/coverOffers/coverOfferRules";
import { payText } from "@/features/scheduling/coverOffers/coverOfferWords";
import { useCoverOfferActions } from "@/features/scheduling/coverOffers/useCoverOfferActions";
import { formatTimeRange } from "@/features/scheduling/formatShift";
import { formatDay } from "@/features/scheduling/periods";
import type { RosterChangeTarget } from "@/features/scheduling/rosterChanges/useRosterChangeActions";
import type { ScheduleAssignment } from "@/features/scheduling/schedules/api";

export type OffersOutSectionProps = {
	/** The schedule the offers are on, for Withdraw. */
	target: Pick<RosterChangeTarget, "companyId" | "unit" | "scheduleId">;
	/** The schedule's offers, as `GET …/cover-offers` answers them. */
	offers: ReadonlyArray<CoverOffer>;
	/** The roster rows, which say which shifts are still short. */
	assignments: ReadonlyArray<
		Pick<ScheduleAssignment, "day" | "uncoveredShift">
	>;
	/** The roster's time zone, which times read in. */
	timeZone: string;
	/** The offers couldn't be read: one line and Try again, the rest of Issues still shows. */
	failed?: boolean;
	onRetry?: () => void;
	/** The clock, for tests and stories; renewed each minute by default. */
	now?: Date;
};

/** How often waiting offers are read against the clock, so one past its deadline reads as ran out. */
const CLOCK_INTERVAL_MS = 60_000;

const key = "scheduling.coverOffers.offersOut";

/**
 * The Issues list's "Offers out": under each short shift, who was offered
 * it, the option in words, and where each offer stands with its time
 * ("waiting, answer by 15:30", "declined 06:12" with the reason quoted).
 * Each waiting line has Withdraw (the section is shown only to someone who
 * may change the roster). It never adds to the Issues count: the gap is
 * already counted once.
 */
export const OffersOutSection = ({
	target,
	offers,
	assignments,
	timeZone,
	failed = false,
	onRetry,
	now: givenNow,
}: OffersOutSectionProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	const clock = useNow(CLOCK_INTERVAL_MS);
	const now = givenNow ?? clock;
	const { withdraw } = useCoverOfferActions(target);
	const heading = (
		<h3 className="mb-2 font-semibold text-neutral-800">{t(`${key}.title`)}</h3>
	);
	if (failed)
		return (
			<>
				{heading}
				<div className="flex flex-col items-start gap-1" role="alert">
					<p className="text-neutral-800">{t(`${key}.loadFailed`)}</p>
					{onRetry && (
						<Button variant="textlink" onClick={onRetry}>
							{t(`${key}.tryAgain`)}
						</Button>
					)}
				</div>
			</>
		);
	const groups = offersOutGroups(offers, assignments, now);
	if (groups.length === 0) return null;
	const withdrawing = withdraw.isPending ? withdraw.variables : undefined;
	const time = (instant: string | null): string =>
		instant ? formatOfferTime(instant, language, timeZone, now) : "";
	const lineText = (line: OfferLine): string =>
		t(`${key}.line`, {
			name: line.name ?? t("scheduling.detail.formerMember"),
			pay: payText(line.pay, t),
			standing: t(`${key}.${line.standing}`, { time: time(line.at) }),
		});
	return (
		<>
			{heading}
			{withdraw.error && (
				<p className="mb-2 text-error-700" role="alert">
					{t(
						`scheduling.coverOffers.actions.error.${coverOfferRefusal(withdraw.error)}`,
						{ name: "" }
					)}
				</p>
			)}
			<ul className="flex flex-col divide-y divide-neutral-300">
				{groups.map((group) => (
					<li key={group.key} className="py-3 first:pt-0 last:pb-0">
						<p className="font-semibold text-neutral-900">
							{t(`${key}.gap`, {
								day: formatDay(group.day, language),
								shift: group.shift.name,
								time: formatTimeRange(group.shift, t),
							})}
						</p>
						<p className="text-neutral-800">
							{t(`${key}.summary`, { count: group.lines.length })}
						</p>
						<ul className="mt-1 flex flex-col gap-1">
							{group.lines.map((line) => (
								<li
									key={line.offerId}
									className="flex items-start justify-between gap-3"
								>
									<span className="min-w-0 text-neutral-700">
										{lineText(line)}
										{line.reason && <q className="block">{line.reason}</q>}
									</span>
									{line.standing === "waiting" && (
										<Button
											disabled={withdrawing === line.offerId}
											variant="textlink"
											aria-label={t(`${key}.withdrawLabel`, {
												name: line.name ?? t("scheduling.detail.formerMember"),
											})}
											onClick={() => {
												withdraw.mutate(line.offerId);
											}}
										>
											{t(`${key}.withdraw`)}
										</Button>
									)}
								</li>
							))}
						</ul>
					</li>
				))}
			</ul>
		</>
	);
};
