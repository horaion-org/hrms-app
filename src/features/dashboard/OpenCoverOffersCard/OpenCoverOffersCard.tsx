import { useTranslation } from "react-i18next";
import { formatDay } from "@/common/formatDay";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ExpandableList } from "@/components/ui/ExpandableList";
import { SwapIcon } from "@/components/ui/Icon";
import type { TeamCoverOffer } from "@/features/dashboard/api";
import {
	failedLineClasses,
	HOME_ROW_COUNT,
	rowClasses,
	rowLeadClasses,
	rowListClasses,
	rowTextClasses,
} from "@/features/dashboard/cardStyles";
import type { GuardedRead } from "@/features/dashboard/guardedRead";
import type { CoverOffer } from "@/features/scheduling/coverOffers/api";

const key = "dashboard.cards.coverOffers";

/** One row of the card: an offer the person owes an answer on, or one their staff have not answered. */
type Row =
	| { kind: "mine"; id: string; offer: CoverOffer }
	| { kind: "team"; id: string; offer: TeamCoverOffer };

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
 * What waits on an answer about cover, a line each: first the person's own
 * offers to answer, then the offers staff in their units have not
 * answered, each opening its roster. Hidden when neither applies.
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
	const rows: Array<Row> = [
		...mine.map((offer): Row => ({ kind: "mine", id: offer.offerId, offer })),
		...team.map((offer): Row => ({
			kind: "team",
			id: offer.coverOfferId,
			offer,
		})),
	];
	return (
		<Card className={className} icon={SwapIcon} title={t(`${key}.title`)}>
			{teamOffers.status === "error" && (
				<p className={failedLineClasses} role="alert">
					{t(`${key}.failed`)}
				</p>
			)}
			{rows.length > 0 && (
				<ExpandableList
					collapsedCount={HOME_ROW_COUNT}
					itemClassName={rowClasses}
					items={rows}
					keyOf={(row) => `${row.kind}|${row.id}`}
					listClassName={rowListClasses}
					renderItem={(row) => {
						if (row.kind === "mine") {
							const shift = row.offer.shift?.name ?? t(`${key}.aShift`);
							const day = formatDay(row.offer.rosterDate, language);
							return (
								<>
									<span className={rowTextClasses}>
										<span className={rowLeadClasses}>{t(`${key}.you`)}</span>
										{" · "}
										{shift}
										{" · "}
										{day}
									</span>
									<Button
										aria-label={t(`${key}.answerNamed`, { shift, day })}
										className="shrink-0"
										params={{ scheduleId: row.offer.scheduleId }}
										to="/me/schedules/$scheduleId"
										variant="textlink"
									>
										{t(`${key}.answer`)}
									</Button>
								</>
							);
						}
						const name = row.offer.displayName ?? t(`${key}.formerMember`);
						const day = formatDay(row.offer.day, language);
						return (
							<>
								<span className={rowTextClasses}>
									<span className={rowLeadClasses}>{name}</span>
									{" · "}
									{row.offer.shiftName}
									{" · "}
									{day}
									{row.offer.expiresAt &&
										` · ${t(`${key}.by`, {
											deadline: deadlineLabel(row.offer.expiresAt, language),
										})}`}
								</span>
								<Button
									className="shrink-0"
									params={{ scheduleId: row.offer.scheduleId }}
									to="/scheduling/$scheduleId"
									variant="textlink"
									aria-label={t(`${key}.openRosterNamed`, {
										name,
										shift: row.offer.shiftName,
										day,
									})}
								>
									{t(`${key}.openRoster`)}
								</Button>
							</>
						);
					}}
				/>
			)}
		</Card>
	);
};
