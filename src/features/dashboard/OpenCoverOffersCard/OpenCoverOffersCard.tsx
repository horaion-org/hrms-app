import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { Card } from "@/components/ui/Card";
import { SwapIcon } from "@/components/ui/Icon";
import type { TeamCoverOffer } from "@/features/dashboard/api";
import {
	CARD_ROW_LIMIT,
	cardLinkClasses,
	emptyLineClasses,
	failedLineClasses,
	rowClasses,
	rowDetailClasses,
	rowListClasses,
	rowTitleClasses,
} from "@/features/dashboard/cardStyles";
import { dayLabel } from "@/features/dashboard/dashboardDates";
import type { GuardedRead } from "@/features/dashboard/guardedRead";
import type { CoverOffer } from "@/features/scheduling/coverOffers/api";

const key = "dashboard.cards.coverOffers";

export type OpenCoverOffersCardProps = {
	/** The offers staff in the person's units have not answered. */
	teamOffers: GuardedRead<Array<TeamCoverOffer>>;
	/** The person's own offers waiting on their answer. */
	myOffers: GuardedRead<Array<CoverOffer>>;
	className?: string;
};

/** A deadline as the card writes it, e.g. "17 Nov, 17:00". */
const deadlineLabel = (expiresAt: string, language: string): string =>
	new Intl.DateTimeFormat(language, {
		day: "numeric",
		month: "short",
		hour: "2-digit",
		minute: "2-digit",
	}).format(new Date(expiresAt));

/**
 * What waits on an answer about cover: the offers staff in the person's
 * units have not answered, each opening its roster, and, only when there
 * are any, the person's own offers to answer. Hidden when neither applies.
 */
export const OpenCoverOffersCard = ({
	teamOffers,
	myOffers,
	className,
}: OpenCoverOffersCardProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	const team = teamOffers.status === "ready" ? teamOffers.data : [];
	const mine = myOffers.status === "ready" ? myOffers.data : [];
	if (teamOffers.status === "hidden" && mine.length === 0) return null;
	return (
		<Card className={className} icon={SwapIcon} title={t(`${key}.title`)}>
			{teamOffers.status === "error" && (
				<p className={failedLineClasses} role="alert">
					{t(`${key}.failed`)}
				</p>
			)}
			{teamOffers.status === "ready" && team.length === 0 && (
				<p className={emptyLineClasses}>{t(`${key}.empty`)}</p>
			)}
			{team.length > 0 && (
				<ul className={rowListClasses}>
					{team.slice(0, CARD_ROW_LIMIT).map((offer) => (
						<li key={offer.coverOfferId} className={rowClasses}>
							<Link
								className={cardLinkClasses}
								params={{ scheduleId: offer.scheduleId }}
								to="/scheduling/$scheduleId"
							>
								{t(`${key}.notAnswered`, {
									name: offer.displayName ?? t(`${key}.formerMember`),
									shift: offer.shiftName,
									day: dayLabel(offer.day, language),
								})}
							</Link>
							<span className={rowDetailClasses}>
								{offer.expiresAt
									? t(`${key}.detailWithDeadline`, {
											department: offer.departmentName,
											deadline: deadlineLabel(offer.expiresAt, language),
										})
									: offer.departmentName}
							</span>
						</li>
					))}
				</ul>
			)}
			{mine.length > 0 && (
				<div className="flex flex-col gap-3">
					<h3 className={rowTitleClasses}>{t(`${key}.mineTitle`)}</h3>
					<ul className={rowListClasses}>
						{mine.slice(0, CARD_ROW_LIMIT).map((offer) => (
							<li key={offer.offerId} className={rowClasses}>
								<Link
									className={cardLinkClasses}
									params={{ scheduleId: offer.scheduleId }}
									to="/me/schedules/$scheduleId"
								>
									{t(`${key}.mine`, {
										shift: offer.shift?.name ?? t(`${key}.aShift`),
										day: dayLabel(offer.rosterDate, language),
									})}
								</Link>
							</li>
						))}
					</ul>
				</div>
			)}
		</Card>
	);
};
