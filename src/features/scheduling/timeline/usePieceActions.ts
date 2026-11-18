import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import { approvalStanding } from "@/features/approvals/approvalStanding";
import type { DayRun } from "@/features/scheduling/dates/api";
import {
	partRedoOf,
	weekRunsAround,
} from "@/features/scheduling/dates/datesSetup";
import { formatPeriod } from "@/features/scheduling/periods";
import {
	publishedRosterOtherThan,
	publishedWeekQuery,
} from "@/features/scheduling/publishedWeek/api";
import { isoDateIn } from "@/features/scheduling/roster/roster";
import { decidable, hasRoster } from "@/features/scheduling/schedules/api";
import {
	daysLeftBeforeOf,
	lastPublishedPartStartOf,
	partLinesOf,
} from "@/features/scheduling/schedules/partLines";
import {
	type PublishMode,
	publishModeOf,
} from "@/features/scheduling/schedules/PublishScheduleDialog";
import {
	type Regeneration,
	regenerationOf,
} from "@/features/scheduling/schedules/regeneration";
import { rosterPagePermissions } from "@/features/scheduling/schedules/rosterPagePermissions";
import {
	approvalActionFacts,
	mayDeleteSchedule,
} from "@/features/scheduling/schedules/scheduleActions";
import { useScheduleApproval } from "@/features/scheduling/schedules/useScheduleApproval";
import { weekPassed } from "@/features/scheduling/schedules/weekPassed";
import {
	type PieceMenuItem,
	pieceMenuOf,
} from "@/features/scheduling/timeline/pieceActions";
import type { TimelinePiece } from "@/features/scheduling/timeline/timelineRows";
import { useAccess } from "@/features/workspace/useAccess";
import { useCurrentMembershipId } from "@/features/workspace/useCurrentCompany";

/** What one piece's menu and its dialogs need. */
export type PieceActions = {
	menu: Array<PieceMenuItem>;
	/** What Publish confirms: publish, submit to the flow, or approve the open step. */
	publishMode: PublishMode;
	/** The days before the piece that publishing leaves unschedulable, which the publish dialog warns of. */
	daysLeftBefore: Array<DayRun>;
	/** How the piece is generated again, which chooses its dialog and tells it what happens. */
	regeneration: Regeneration;
};

/**
 * One piece's actions, from the same facts the roster page builds for the
 * same schedule (`ScheduleDetail`): the viewer's permissions, whether its
 * week is published elsewhere, where its approval stands and how it is
 * generated again. Only a piece not yet published asks the published-week
 * and approval reads; a published one needs neither.
 */
export const usePieceActions = (
	companyId: string,
	{ schedule, weekParts, month }: TimelinePiece
): PieceActions => {
	const { t, i18n } = useTranslation();
	const access = useAccess();
	const viewerMembershipId = useCurrentMembershipId();
	const permissions = rosterPagePermissions(schedule, access);
	const awaitingPublication =
		schedule.status === "PUBLISHED" ? undefined : schedule;
	const publishedWeek = useQuery(
		publishedWeekQuery(
			companyId,
			permissions.mayRead ? awaitingPublication : undefined,
			awaitingPublication?.periodStart,
			// A part asks about its own days: an earlier part published doesn't hold it up (API ADR-0113).
			awaitingPublication && {
				coveredFrom: awaitingPublication.coveredFrom,
				coveredTo: awaitingPublication.coveredTo,
			}
		)
	);
	const weekPublishedElsewhere =
		publishedRosterOtherThan(publishedWeek.data, schedule.scheduleId) !==
		undefined;
	const approval = useScheduleApproval(companyId, awaitingPublication);
	const standing = approvalStanding({
		awaitingDecision: decidable(schedule),
		publication: schedule.publication,
		read: approval.read,
		viewerMembershipId,
	});
	const regeneration = regenerationOf(schedule, weekParts, {
		weekPassed: weekPassed(schedule, new Date()),
		monthRead: month !== undefined,
		weekPublishedElsewhere,
		...permissions,
	});
	const language = formattingLocale(i18n);
	const partLines = partLinesOf(
		{
			covered: { from: schedule.coveredFrom, to: schedule.coveredTo },
			// Said once the month read names the week's parts, never guessed before it.
			runs: month
				? weekRunsAround(
						schedule,
						weekParts,
						isoDateIn(schedule.timeZone, new Date())
					)
				: [],
			redo: partRedoOf(schedule, weekParts),
			lastPublishedPartStart: lastPublishedPartStartOf(
				weekParts,
				schedule.publicationWithdrawnAt ? [schedule.scheduleId] : []
			),
		},
		(days) => formatPeriod({ start: days.from, end: days.to }, language),
		t
	);
	return {
		menu: pieceMenuOf({
			status: schedule.status,
			mayPublish: permissions.mayReject && !weekPublishedElsewhere,
			mayReject: permissions.mayReject,
			mayWithdraw: permissions.mayWithdraw,
			mayRegenerate: regeneration.offered,
			regeneratesPart: regeneration.partOfWeek,
			hasRoster: hasRoster(schedule),
			...approvalActionFacts(standing),
			mayDelete: mayDeleteSchedule(schedule, access),
		}),
		publishMode: publishModeOf(standing, approval.instance?.steps ?? []),
		daysLeftBefore: daysLeftBeforeOf(partLines, schedule.coveredFrom),
		regeneration,
	};
};
