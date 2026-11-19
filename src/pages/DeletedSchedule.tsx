import { getRouteApi } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { formatDay } from "@/common/formatDay";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { ArrowLeftIcon } from "@/components/ui/Icon";
import type { CoverOffer } from "@/features/scheduling/coverOffers/api";
import { useDeletedSchedule } from "@/features/scheduling/history/deletedSchedule";
import { GeneratedRoster } from "@/features/scheduling/roster/GeneratedRoster";
import { RosterHeader } from "@/features/scheduling/roster/RosterHeader";
import type { RosterSearch } from "@/features/scheduling/roster/rosterSearch";
import { hasRoster } from "@/features/scheduling/schedules/api";
import {
	deletionDate,
	deletionSentence,
} from "@/features/scheduling/schedules/historyRows";
import { formatTimeRange } from "@/features/scheduling/shifts/formatShift";
import {
	useCurrentCompanyId,
	useCurrentMembershipId,
} from "@/features/workspace/useCurrentCompany";

const route = getRouteApi(
	"/_authenticated/_app/scheduling_/history/$scheduleId"
);

const key = "scheduling.history.deleted";

/** Why a deleted schedule isn't shown: loading, failed, or not found (absent, live or not readable alike). */
const RECORD_PROBLEMS = {
	pending: "loading",
	error: "loadFailed",
	hidden: "unavailable",
	missing: "unavailable",
} as const;

/** Back to Scheduling, where History lists the deleted schedules. */
const BackLink = (): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<Button leadingIcon={<ArrowLeftIcon />} to="/scheduling" variant="textlink">
			{t("scheduling.detail.back")}
		</Button>
	);
};

/** A line saying why the record isn't shown; an alert unless it is still loading. */
const Problem = ({
	alert,
	children,
}: {
	alert: boolean;
	children: string;
}): FunctionComponent => (
	<p
		className="mt-6 text-sm text-neutral-800"
		role={alert ? "alert" : undefined}
	>
		{children}
	</p>
);

/** Shown in place of the record when its route fails. */
export const DeletedScheduleProblem = (): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<>
			<BackLink />
			<Problem alert>{t("scheduling.detail.loadFailed")}</Problem>
		</>
	);
};

/**
 * The cover offers sent on the roster, each as its day, shift, the person
 * asked and the note they were sent. A list to read: no offer can be
 * answered, withdrawn or sent again here.
 */
const CoverOfferRecords = ({
	offers,
}: {
	offers: ReadonlyArray<CoverOffer>;
}): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	return (
		<section aria-labelledby="deleted-schedule-cover-offers" className="mt-12">
			<h2
				className="text-2xl font-semibold text-neutral-900"
				id="deleted-schedule-cover-offers"
			>
				{t(`${key}.coverOffers`)}
			</h2>
			<ul className="mt-4 flex flex-col divide-y divide-neutral-300 text-sm">
				{offers.map((offer) => (
					<li key={offer.offerId} className="py-3 first:pt-0 last:pb-0">
						<p className="font-semibold text-neutral-900">
							{offer.shift
								? t("scheduling.coverOffers.offersOut.gap", {
										day: formatDay(offer.rosterDate, language),
										shift: offer.shift.name,
										time: formatTimeRange(offer.shift, t),
									})
								: formatDay(offer.rosterDate, language)}
						</p>
						<p className="text-neutral-800">
							{offer.member?.displayName ?? t("scheduling.detail.formerMember")}
						</p>
						{offer.remark && (
							<q className="block text-neutral-700">{offer.remark}</q>
						)}
					</li>
				))}
			</ul>
		</section>
	);
};

/**
 * One deleted schedule, read by its id alone and shown as a record: a banner
 * saying when it was deleted, by whom or why, the header with the status it
 * had, its roster as it was (the grid the roster page shows someone who may
 * not change it, with its Issues and Changed lists) and the cover offers
 * sent on it. It offers no action: nothing here is changed, published,
 * generated again, deleted or put back.
 */
const DeletedScheduleRecord = ({
	companyId,
	scheduleId,
}: {
	companyId: string;
	scheduleId: string;
}): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	const navigateHere = route.useNavigate();
	const view = route.useSearch();
	const viewerMembershipId = useCurrentMembershipId();
	const state = useDeletedSchedule(companyId, scheduleId);
	if (state.status !== "ready")
		return (
			<>
				<BackLink />
				<Problem alert={state.status !== "pending"}>
					{t(`scheduling.detail.${RECORD_PROBLEMS[state.status]}`)}
				</Problem>
			</>
		);
	const { schedule } = state;
	return (
		<>
			<BackLink />
			<RosterHeader
				className="mt-4"
				meta={<Badge>{t(`${key}.badge`)}</Badge>}
				schedule={schedule}
			/>
			<Callout className="mt-6" tone="neutral">
				<strong className="block font-semibold">
					{deletionSentence(schedule, t, language)}
				</strong>
				{t(`${key}.banner`, { date: deletionDate(schedule, language) })}
			</Callout>
			{hasRoster(schedule) && (
				<GeneratedRoster
					assignments={schedule.assignments}
					schedule={schedule}
					shifts={schedule.shifts}
					view={view}
					viewerMembershipId={viewerMembershipId}
					onViewChange={(next: RosterSearch) => {
						void navigateHere({ search: next, replace: true });
					}}
				/>
			)}
			{/* Null where the reader may not read cover offers; empty where none was sent. */}
			{schedule.coverOffers !== null && schedule.coverOffers.length > 0 && (
				<CoverOfferRecords offers={schedule.coverOffers} />
			)}
		</>
	);
};

/** A deleted schedule's record at `/scheduling/history/$scheduleId`. */
export const DeletedSchedulePage = (): FunctionComponent => {
	const companyId = useCurrentCompanyId();
	const { scheduleId } = route.useParams();
	return (
		<DeletedScheduleRecord
			key={`${companyId}/${scheduleId}`}
			companyId={companyId}
			scheduleId={scheduleId}
		/>
	);
};
