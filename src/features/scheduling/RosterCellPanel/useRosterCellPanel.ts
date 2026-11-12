import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import { activeLeaveTypesQuery, leaveRequestQuery } from "@/features/leave/api";
import { rangeDays } from "@/features/leave/dates";
import { leaveTypeOptions } from "@/features/leave/leaveTypeOptions";
import type { CoverOffer } from "@/features/scheduling/coverOffers/api";
import { useCellCoverOffer } from "@/features/scheduling/coverOffers/useCellCoverOffer";
import { dayTypeInSentence } from "@/features/scheduling/dayTypes";
import { formatDay } from "@/features/scheduling/periods";
import type { RosterCellPanelState } from "@/features/scheduling/RosterCellPanel/cellPanelState";
import { useLeaveMove } from "@/features/scheduling/RosterCellPanel/useLeaveMove";
import { leaveLinkSearch } from "@/features/scheduling/RosterDayNotes/leaveLinkSearch";
import {
	rosterChangePreviewQuery,
	type RosterChange,
} from "@/features/scheduling/rosterChanges/api";
import {
	assignmentCell,
	rosterCellText,
} from "@/features/scheduling/rosterChanges/cellText";
import type { CheckNames } from "@/features/scheduling/rosterChanges/checkSentence";
import {
	leaveMoveChange,
	leaveMoveNotes,
} from "@/features/scheduling/rosterChanges/leaveMoveCopy";
import { rosterChangeRefusal } from "@/features/scheduling/rosterChanges/rosterChangeRefusal";
import {
	applyGate,
	canApply,
	cellsForChoice,
	dayTypeChoices,
	notWorkingWording,
	peopleTold,
	preselectedDayType,
	rosterCellKey,
	rosteredJobTitleId,
	shiftChoices,
	swapPartners,
} from "@/features/scheduling/rosterChanges/rosterEdit";
import {
	editChoiceOf,
	isLeaveDay,
	leaveMoveOf,
	moveChangesRoster,
	needsDecision,
	panelModes,
	rosterChangeBodyOf,
	type RosterPanelMode,
} from "@/features/scheduling/rosterChanges/rosterLeave";
import {
	useRosterChangeActions,
	type RosterChangeTarget,
} from "@/features/scheduling/rosterChanges/useRosterChangeActions";
import {
	scheduleKey,
	type ScheduleAssignment,
	type ScheduleShift,
} from "@/features/scheduling/schedules/api";

export type RosterCellPanelInput = {
	target: RosterChangeTarget;
	revision: number;
	assignment: ScheduleAssignment;
	assignments: ReadonlyArray<ScheduleAssignment>;
	shifts: ReadonlyArray<ScheduleShift>;
	/** The schedule's types for a day not worked; empty from an older API. */
	nonWorkingDayTypes: ReadonlyArray<string>;
	onPreviewDays: (keys: ReadonlyArray<string>) => void;
	onApplied: (change: RosterChange) => void;
	onLeaveChanged?: () => void;
	leaveEditing?: { viewerMembershipId: string };
	notifiesMembers: boolean;
	/** The day has notes that need a look, which the panel shows first. */
	hasIssues: boolean;
	/** On a published roster: the schedule's cover offers and its time zone. */
	coverOffers?: { offers: ReadonlyArray<CoverOffer>; timeZone: string };
	onCoverRecorded?: () => void;
};

/**
 * Everything the roster day editor decides and does: the chosen mode and its
 * pick, the leave types and request, the preview with its checks, the remark
 * and tick, and Apply, which on a published roster asks first. Leave moves
 * run through `useLeaveMove`; with `coverOffers`, a change that adds or moves
 * work asks the member instead, through `useCellCoverOffer`. The panel only
 * renders what this returns.
 */
export const useRosterCellPanel = ({
	target,
	revision,
	assignment,
	assignments,
	shifts,
	nonWorkingDayTypes,
	onPreviewDays,
	onApplied,
	onLeaveChanged,
	leaveEditing,
	notifiesMembers,
	hasIssues,
	coverOffers,
	onCoverRecorded,
}: RosterCellPanelInput): RosterCellPanelState => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	const client = useQueryClient();
	const [mode, setMode] = useState<RosterPanelMode>();
	const [shiftId, setShiftId] = useState<string>();
	const [partnerId, setPartnerId] = useState<string>();
	const [leaveType, setLeaveType] = useState<string>();
	const [chosenDayType, setDayType] = useState<string>();
	const [remark, setRemark] = useState("");
	// The fingerprint of the checks the person ticked: new checks need a new tick.
	const [tickedFor, setTickedFor] = useState<string | null>(null);
	// On a published roster, Apply first asks whether to tell the people whose days change.
	const [confirming, setConfirming] = useState(false);
	const { apply } = useRosterChangeActions(target);
	const leave = useLeaveMove({
		target,
		revision,
		assignment,
		apply,
		onApplied,
		onLeaveChanged,
	});

	// Who and what the day is.
	const name =
		assignment.member?.displayName ?? t("scheduling.detail.formerMember");
	const day = formatDay(assignment.day, language);
	const membershipId = assignment.member?.membershipId ?? null;
	const ownDay =
		leaveEditing !== undefined &&
		membershipId === leaveEditing.viewerMembershipId;
	const mayChangeLeave =
		leaveEditing !== undefined && membershipId !== null && !ownDay;
	const leaveDay = isLeaveDay(assignment);
	const leaveDayEditable = mayChangeLeave && leaveDay;

	// What can be chosen, and what is.
	const partners = swapPartners(assignments, assignment);
	const choices = shiftChoices(
		shifts,
		assignment.day,
		membershipId === null
			? null
			: rosteredJobTitleId(assignments, membershipId),
		assignment.shift?.shiftId
	);
	// A leave day goes back to not worked through Leave, which takes no type.
	const dayTypes = leaveDayEditable
		? []
		: dayTypeChoices(nonWorkingDayTypes, assignment);
	const dayType =
		chosenDayType ?? preselectedDayType(dayTypes, assignment.dayType);
	// Another shift needs the schedule's frozen shifts; until they load it isn't offered.
	const modes = panelModes({
		assignment,
		hasShifts: shifts.length > 0,
		mayChangeLeave,
		canChooseDayType: dayTypes.length > 0,
	});
	const leaveMove = mayChangeLeave
		? leaveMoveOf(assignment, mode, { leaveType, shiftId })
		: undefined;
	const leaveTypes = useQuery(
		activeLeaveTypesQuery(target.companyId, mayChangeLeave)
	);
	const leaveOptions = leaveTypeOptions(leaveTypes.data ?? [], t).filter(
		(option) =>
			mode !== "anotherType" || option.label !== assignment.leaveTypeName
	);
	const request = useQuery({
		...leaveRequestQuery(
			target.companyId,
			leaveEditing?.viewerMembershipId ?? "",
			assignment.leaveRequestId ?? "",
			ownDay ? undefined : (membershipId ?? undefined)
		),
		enabled: leaveEditing !== undefined && Boolean(assignment.leaveRequestId),
	});
	// Only someone who may change leave here is sent to the request.
	const requestLink =
		leaveEditing !== undefined && assignment.leaveRequestId
			? leaveLinkSearch(
					assignment.leaveRequestId,
					membershipId,
					leaveEditing.viewerMembershipId
				)
			: undefined;

	// The roster change the choice makes, and its preview.
	const choice = editChoiceOf({
		leaveDayEditable,
		mode,
		shiftId,
		dayType,
		partner: partners.available.find((row) => row.assignmentId === partnerId),
		leaveMove,
	});
	const cells = cellsForChoice(assignment, choice);
	const body = rosterChangeBodyOf({
		revision,
		cells,
		leaveMove,
		day: assignment.day,
	});
	const preview = useQuery(
		rosterChangePreviewQuery(
			target.companyId,
			target.unit,
			target.scheduleId,
			body
		)
	);
	const fingerprint = preview.data?.checksFingerprint ?? null;
	const gate = applyGate(preview.data?.checks ?? []);
	const ticked = fingerprint !== null && tickedFor === fingerprint;
	const previewRefusal = preview.error
		? rosterChangeRefusal(preview.error)
		: undefined;
	const remarkGiven = remark.trim().length > 0;
	const busy = apply.isPending || leave.pending;
	const offer = useCellCoverOffer({
		target,
		offers: coverOffers?.offers,
		published: notifiesMembers && coverOffers !== undefined,
		assignment,
		choice,
		leaveMove: leaveMove !== undefined,
		body,
		checksFingerprint: fingerprint,
		remark,
		onChecksChanged: () => {
			void preview.refetch();
		},
		onRecorded: onCoverRecorded,
	});
	const previewKeys = cells
		.map((cell) => rosterCellKey(cell.membershipId, cell.day))
		.join(",");

	// The grid outlines what the change would touch.
	useEffect(() => {
		onPreviewDays(previewKeys === "" ? [] : previewKeys.split(","));
	}, [previewKeys, onPreviewDays]);

	const names: CheckNames = {
		member: (id) =>
			assignments.find((row) => row.member?.membershipId === id)?.member
				?.displayName ?? t("scheduling.detail.formerMember"),
		// The roster's own days name the shifts worked when the frozen shifts can't be read.
		shift: (id) =>
			shifts.find((shift) => shift.shiftId === id)?.name ??
			assignments.find((row) => row.shift?.shiftId === id)?.shift?.name ??
			"",
		day: (date) => formatDay(date, language),
		dayType: (code) => dayTypeInSentence(code, t),
	};

	const chooseMode = (value: RosterPanelMode): void => {
		setMode(value);
		// A failure belongs to the choice that caused it.
		apply.reset();
		offer.reset();
		leave.reset();
	};

	const submit = (): void => {
		if (!body || !preview.data) return;
		apply.mutate(
			{
				...body,
				remark: remark.trim() === "" ? undefined : remark.trim(),
				checksFingerprint: preview.data.checksFingerprint ?? undefined,
			},
			{
				onSuccess: (change) => {
					setConfirming(false);
					onApplied(change);
				},
				onError: (error) => {
					setConfirming(false);
					if (rosterChangeRefusal(error) === "checksChanged")
						void preview.refetch();
				},
			}
		);
	};

	const confirmLeaveMove = (): void => {
		setConfirming(false);
		if (!leaveMove) return;
		void leave.run(leaveMove, remark.trim(), {
			cells,
			checksFingerprint: fingerprint ?? undefined,
		});
	};

	/** The leave review's Apply: a published roster asks first when the move writes it. */
	const applyLeaveMove = (): void => {
		if (!leaveMove) return;
		if (notifiesMembers && moveChangesRoster(assignment, leaveMove))
			setConfirming(true);
		else confirmLeaveMove();
	};

	/** The change review's Apply. */
	const applyChange = (): void => {
		if (leaveMove) applyLeaveMove();
		else if (notifiesMembers) setConfirming(true);
		else submit();
	};

	/** On a revision clash the roster is read again; otherwise the preview is asked for again. */
	const retryPreview = (): void => {
		if (previewRefusal === "revision")
			void client.invalidateQueries({
				queryKey: scheduleKey(target.companyId, target.scheduleId),
			});
		else void preview.refetch();
	};

	const leaveTypeLabel = (code: string): string =>
		leaveOptions.find((option) => option.value === code)?.label ?? "";

	return {
		name,
		day,
		language,
		facts: {
			hasIssues,
			needsDecision: needsDecision(assignment),
			leaveRequestPending:
				assignment.flag === "LEAVE_REQUESTED" &&
				Boolean(assignment.leaveTypeName) &&
				requestLink !== undefined,
			offerOpen:
				coverOffers !== undefined &&
				offer.openOffer !== undefined &&
				offer.justSent === undefined,
			stranded: leave.stranded !== undefined,
			hasChoices: modes.length > 0,
			previewing: body !== undefined,
			offerSent: coverOffers !== undefined && offer.justSent !== undefined,
			movingLeave: leaveMove !== undefined,
		},
		ownDay,
		leaveDay,
		requestLink,
		requestDays: request.data
			? rangeDays({ start: request.data.startDate, end: request.data.endDate })
					.length
			: 1,
		stranded: leave.stranded,
		choices: {
			modes,
			mode,
			chooseMode,
			shiftChoices: choices,
			shiftId,
			setShiftId,
			notWorkingWording: notWorkingWording(assignment, leaveDayEditable),
			dayTypes,
			dayType,
			setDayType,
			partners,
			partnerId,
			setPartnerId,
			leaveOptions,
			leaveType,
			setLeaveType,
		},
		changeReview: {
			names,
			preview: preview.data,
			previewRefusal,
			retryPreview,
			applyRefusal: apply.error ? rosterChangeRefusal(apply.error) : undefined,
			leaveFailure: leave.failure,
			remark,
			setRemark,
			remarkRequired: leaveMove !== undefined,
			ticked,
			setTicked: (checked): void => {
				setTickedFor(checked ? fingerprint : null);
			},
			applyAnyway: gate.needsRemark,
			applyBlocked:
				!preview.data ||
				!canApply(gate, ticked, remark) ||
				(leaveMove !== undefined && !remarkGiven),
			applyChange,
			busy,
		},
		leaveReview: {
			change: leaveMoveChange(
				leaveMove,
				rosterCellText(assignmentCell(assignment), t),
				leaveTypeLabel,
				t
			),
			notes: leaveMoveNotes(
				leaveMove,
				{ name, day, dayHasShift: assignment.shift !== null },
				t
			),
			leaveFailure: leave.failure,
			remark,
			setRemark,
			applyBlocked: !remarkGiven,
			applyLeaveMove,
			busy: leave.pending,
		},
		coverOffer: coverOffers && {
			...offer,
			timeZone: coverOffers.timeZone,
			ready: Boolean(preview.data) && canApply(gate, ticked, remark),
		},
		confirmation:
			confirming && (leaveMove || preview.data)
				? {
						count: leaveMove ? 1 : peopleTold(preview.data?.cells ?? []),
						submitting: busy,
						confirm: leaveMove ? confirmLeaveMove : submit,
						close: (): void => {
							setConfirming(false);
						},
					}
				: undefined,
	};
};
