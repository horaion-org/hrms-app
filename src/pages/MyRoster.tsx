import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import { ApiProblemError } from "@/common/problem";
import type { FunctionComponent } from "@/common/types";
import { useNow } from "@/common/useNow";
import { myCoverOffersQuery } from "@/features/scheduling/coverOffers/api";
import {
	formatOfferTime,
	offeredDeadlines,
} from "@/features/scheduling/coverOffers/coverOfferRules";
import { MyCoverOffers } from "@/features/scheduling/coverOffers/MyCoverOffers";
import { GeneratedRoster } from "@/features/scheduling/GeneratedRoster";
import { myRosterQuery } from "@/features/scheduling/myRoster/api";
import { MyRosterChanges } from "@/features/scheduling/MyRosterChanges";
import { formatPeriod } from "@/features/scheduling/periods";
import {
	useCurrentCompanyId,
	useCurrentMembershipId,
} from "@/features/workspace/useCurrentCompany";

const route = getRouteApi("/_authenticated/_app/me/schedules/$scheduleId");

const key = "scheduling.myRoster";

/** How often open offers are read against the clock, so a deadline passing removes their buttons. */
const CLOCK_INTERVAL_MS = 60_000;

/** A line saying why the roster isn't shown; an alert unless it is still loading. */
const Problem = ({
	alert,
	children,
}: {
	alert: boolean;
	children: string;
}): FunctionComponent => (
	<p className="text-sm text-neutral-800" role={alert ? "alert" : undefined}>
		{children}
	</p>
);

/** Shown in place of the page when its route fails. */
export const MyRosterProblem = (): FunctionComponent => {
	const { t } = useTranslation();
	return <Problem alert>{t(`${key}.loadFailed`)}</Problem>;
};

/**
 * A published roster the person is on, at `/me/schedules/$scheduleId`:
 * where a shift-assignment or changed-assignment notification leads. The
 * same week-by-week grid as the scheduling page, read-only, without the
 * figures, findings or any action; the member's open shift offers come
 * first, one card each to accept or decline (and the one a notification
 * linked, `?offer=`, whatever its status); their own days changed after
 * publication are listed above the grid with the manager's remark, and dotted.
 * The API decides access: a schedule that isn't published, or doesn't
 * roster them, is a 404 like one that doesn't exist.
 */
export const MyRosterPage = (): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	const companyId = useCurrentCompanyId();
	const viewerMembershipId = useCurrentMembershipId();
	const { scheduleId } = route.useParams();
	const { offer: linkedOfferId, ...view } = route.useSearch();
	const navigate = route.useNavigate();
	const now = useNow(CLOCK_INTERVAL_MS);
	const roster = useQuery(myRosterQuery(companyId, scheduleId));
	const offers = useQuery(myCoverOffersQuery(companyId));
	if (roster.isPending)
		return <Problem alert={false}>{t(`${key}.loading`)}</Problem>;
	if (roster.isError)
		return (
			<Problem alert>
				{t(
					roster.error instanceof ApiProblemError && roster.error.status === 404
						? `${key}.unavailable`
						: `${key}.loadFailed`
				)}
			</Problem>
		);
	const { data } = roster;
	const offeredDays = new Map(
		[...offeredDeadlines(offers.data ?? [], scheduleId, now)].map(
			([day, deadline]) => [
				day,
				formatOfferTime(deadline, language, data.timeZone, now),
			]
		)
	);
	return (
		<>
			<h1 className="text-4xl font-medium text-neutral-900">
				{t(`${key}.title`, {
					department: data.departmentName,
					period: formatPeriod(
						{ start: data.periodStart, end: data.periodEnd },
						language
					),
				})}
			</h1>
			<p className="mt-3 flex flex-wrap items-center gap-3 text-sm font-medium text-neutral-800">
				{data.branchName}
				<span className="text-xs font-normal text-neutral-700">
					{t("scheduling.detail.timeZone", { timeZone: data.timeZone })}
				</span>
			</p>
			<MyCoverOffers
				assignments={data.assignments}
				className="mt-6"
				companyId={companyId}
				linkedOfferId={linkedOfferId}
				now={now}
				scheduleId={scheduleId}
				timeZone={data.timeZone}
				viewerMembershipId={viewerMembershipId}
			/>
			<MyRosterChanges assignments={data.assignments} className="mt-6" />
			<GeneratedRoster
				assignments={data.assignments}
				offeredDays={offeredDays}
				schedule={data}
				view={view}
				viewerMembershipId={viewerMembershipId}
				withSummary={false}
				onViewChange={(next) => {
					void navigate({
						search: linkedOfferId ? { ...next, offer: linkedOfferId } : next,
						replace: true,
					});
				}}
			/>
		</>
	);
};
