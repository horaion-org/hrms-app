import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { RadioCard } from "@/components/forms/RadioCard";
import { Select } from "@/components/forms/Select";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Callout } from "@/components/ui/Callout";
import { CloseIcon } from "@/components/ui/Icon";
import { activeLeaveTypesQuery, leaveRequestQuery } from "@/features/leave/api";
import { rangeDays } from "@/features/leave/dates";
import { leaveTypeOptions } from "@/features/leave/leaveTypeOptions";
import type { CoverOffer } from "@/features/scheduling/coverOffers/api";
import { CoverOfferActions } from "@/features/scheduling/coverOffers/CoverOfferActions";
import { CoverOfferSent } from "@/features/scheduling/coverOffers/CoverOfferActions/CoverOfferSent";
import { useCellCoverOffer } from "@/features/scheduling/coverOffers/useCellCoverOffer";
import { formatTimeRange } from "@/features/scheduling/formatShift";
import { formatDay } from "@/features/scheduling/periods";
import { RosterChangeReview } from "@/features/scheduling/RosterChangeReview";
import { leaveLinkSearch } from "@/features/scheduling/RosterDayNotes/leaveLinkSearch";
import { RosterLeaveReview } from "@/features/scheduling/RosterLeaveReview";
import {
	rosterChangePreviewQuery,
	type RosterChange,
	type RosterChangeBody,
	type RosterChangeCell,
} from "@/features/scheduling/rosterChanges/api";
import {
	assignmentCell,
	rosterCellText,
} from "@/features/scheduling/rosterChanges/cellText";
import type { CheckNames } from "@/features/scheduling/rosterChanges/checkSentence";
import { rosterChangeRefusal } from "@/features/scheduling/rosterChanges/rosterChangeRefusal";
import {
	applyGate,
	canApply,
	cellsForChoice,
	peopleTold,
	rosterCellKey,
	rosteredJobTitleId,
	shiftChoices,
	swapPartners,
	type RosterEditChoice,
} from "@/features/scheduling/rosterChanges/rosterEdit";
import {
	isLeaveDay,
	leaveMoveOf,
	leaveTookTheShift,
	moveChangesRoster,
	needsDecision,
	panelModes,
	rosterChoiceOfLeaveMove,
	rosterLeaveRefusal,
	type RosterPanelMode,
} from "@/features/scheduling/rosterChanges/rosterLeave";
import {
	useRosterChangeActions,
	type RosterChangeTarget,
} from "@/features/scheduling/rosterChanges/useRosterChangeActions";
import { useRosterLeaveActions } from "@/features/scheduling/rosterChanges/useRosterLeaveActions";
import {
	scheduleKey,
	type RosterCellValue,
	type ScheduleAssignment,
	type ScheduleShift,
} from "@/features/scheduling/schedules/api";

export type RosterCellPanelProps = {
	/** Where the roster lives and which run's rows are shown. */
	target: RosterChangeTarget;
	/** The roster revision the person is looking at. */
	revision: number;
	/** The chosen day. */
	assignment: ScheduleAssignment;
	/** The whole roster, for swap partners and names. */
	assignments: ReadonlyArray<ScheduleAssignment>;
	/** The schedule's frozen shifts, with their days and roles. */
	shifts: ReadonlyArray<ScheduleShift>;
	onClose: () => void;
	/** The days the change being previewed would touch, as `rosterCellKey` names them. */
	onPreviewDays: (keys: ReadonlyArray<string>) => void;
	/** A change landed; the roster already shows it. */
	onApplied: (change: RosterChange) => void;
	/** A leave move landed with no roster change to confirm; the roster refreshes by itself. */
	onLeaveChanged?: () => void;
	/**
	 * Given to someone who may change leave at this department too. Their own
	 * membership: nobody changes their own leave.
	 */
	leaveEditing?: { viewerMembershipId: string };
	/**
	 * The roster is published: applying tells each person whose days change,
	 * with the remark, so Apply asks first how many will be told.
	 */
	notifiesMembers?: boolean;
	/** What needs a look on the day (`RosterDayNotes`), shown first; nothing without. */
	issues?: ReactNode;
	/**
	 * On a published roster: the schedule's cover offers and its time zone.
	 * A change that adds or moves work then goes out as an offer (or a
	 * recorded yes) instead of Apply, and an open offer for the day shows.
	 */
	coverOffers?: { offers: ReadonlyArray<CoverOffer>; timeZone: string };
	/** A recorded yes landed and applied; the roster refreshes by itself. */
	onCoverRecorded?: () => void;
	className?: string;
};

const key = "scheduling.rosterEdit";

/**
 * One roster day beside the grid, for someone who may change the roster: what
 * it holds now (and who changed it last), a choice of another shift, a day
 * off or a same-day swap, a preview with the API's checks, and Apply. With
 * `leaveEditing`, leave choices too: each calls Leave with a required remark,
 * and taking someone off leave then edits the roster in a second step. Leave
 * moves offer no Undo: they are reversed in Leave. Checks that need a tick, or
 * a tick and a remark, hold Apply until given; scheduling rules aren't checked
 * again. On a published roster Apply asks first, saying how many people will
 * be told; with `coverOffers`, a change that adds or moves work asks the
 * member instead (`CoverOfferActions`).
 */
export const RosterCellPanel = ({
	target,
	revision,
	assignment,
	assignments,
	shifts,
	onClose,
	onPreviewDays,
	onApplied,
	onLeaveChanged,
	leaveEditing,
	notifiesMembers = false,
	issues,
	coverOffers,
	onCoverRecorded,
	className,
}: RosterCellPanelProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	const client = useQueryClient();
	const titleId = useId();
	const heading = useRef<HTMLHeadingElement>(null);
	const choicesId = useId();
	const [mode, setMode] = useState<RosterPanelMode>();
	const [shiftId, setShiftId] = useState<string>();
	const [partnerId, setPartnerId] = useState<string>();
	const [leaveType, setLeaveType] = useState<string>();
	// The leave was cancelled but the roster edit after it was refused: why, and whether the day now reads as flagged.
	const [stranded, setStranded] = useState<{
		reason: string;
		flagged: boolean;
	}>();
	const [remark, setRemark] = useState("");
	// The fingerprint of the checks the person ticked: new checks need a new tick.
	const [tickedFor, setTickedFor] = useState<string | null>(null);
	// On a published roster, Apply first asks whether to tell the people whose days change.
	const [confirming, setConfirming] = useState(false);
	const { apply } = useRosterChangeActions(target);
	const leaveActions = useRosterLeaveActions(target);

	const name =
		assignment.member?.displayName ?? t("scheduling.detail.formerMember");
	const day = formatDay(assignment.day, language);
	const membershipId = assignment.member?.membershipId ?? null;
	const partners = swapPartners(assignments, assignment);
	const choices = shiftChoices(
		shifts,
		assignment.day,
		membershipId === null
			? null
			: rosteredJobTitleId(assignments, membershipId),
		assignment.shift?.shiftId
	);
	const partner = partners.available.find(
		(row) => row.assignmentId === partnerId
	);
	const ownDay =
		leaveEditing !== undefined &&
		membershipId === leaveEditing.viewerMembershipId;
	const mayChangeLeave =
		leaveEditing !== undefined && membershipId !== null && !ownDay;
	const leaveDay = isLeaveDay(assignment);
	const leaveMove = mayChangeLeave
		? leaveMoveOf(assignment, mode, { leaveType, shiftId })
		: undefined;
	const leaveTypes = useQuery(
		activeLeaveTypesQuery(target.companyId, mayChangeLeave)
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
	const leaveOptions = leaveTypeOptions(leaveTypes.data ?? [], t).filter(
		(option) =>
			mode !== "anotherType" || option.label !== assignment.leaveTypeName
	);
	const choice: RosterEditChoice | undefined =
		mayChangeLeave && leaveDay
			? rosterChoiceOfLeaveMove(leaveMove)
			: mode === "dayOff"
				? { kind: "dayOff" }
				: mode === "shift" && shiftId !== undefined
					? { kind: "shift", shiftId }
					: mode === "swap" && partner !== undefined
						? { kind: "swap", partner }
						: undefined;
	const cells = cellsForChoice(assignment, choice);
	const body: RosterChangeBody | undefined =
		cells.length > 0
			? {
					expectedRevision: revision,
					cells,
					// The leave goes first, so the checks read the day as it will then be.
					...(leaveMove?.kind === "backToShift"
						? { assumeLeaveCancelledOn: [assignment.day] }
						: {}),
				}
			: undefined;
	const preview = useQuery(
		rosterChangePreviewQuery(
			target.companyId,
			target.unit,
			target.scheduleId,
			body
		)
	);
	const fingerprint = preview.data?.checksFingerprint ?? null;
	const previewKeys = cells
		.map((cell) => rosterCellKey(cell.membershipId, cell.day))
		.join(",");

	// The grid outlines what the change would touch; new checks need a new tick.
	useEffect(() => {
		onPreviewDays(previewKeys === "" ? [] : previewKeys.split(","));
	}, [previewKeys, onPreviewDays]);
	// Opening a day moves focus here, which on a phone also scrolls the panel under the grid into view.
	useEffect(() => {
		heading.current?.focus();
	}, [assignment.assignmentId]);

	const cellText = (cell: RosterCellValue): string => rosterCellText(cell, t);
	const nowCell = assignmentCell(assignment);
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
	};
	const gate = applyGate(preview.data?.checks ?? []);
	const ticked = fingerprint !== null && tickedFor === fingerprint;
	const applyRefusal = apply.error
		? rosterChangeRefusal(apply.error)
		: undefined;
	const previewRefusal = preview.error
		? rosterChangeRefusal(preview.error)
		: undefined;
	const remarkGiven = remark.trim().length > 0;
	const offer = useCellCoverOffer({
		target,
		offers: coverOffers?.offers,
		published: notifiesMembers && coverOffers !== undefined,
		assignment,
		choice,
		leaveMove: leaveMove !== undefined,
		body,
		checksFingerprint: preview.data?.checksFingerprint ?? null,
		remark,
		onChecksChanged: () => {
			void preview.refetch();
		},
		onRecorded: onCoverRecorded,
	});
	const leaveFailure =
		leaveActions.putOnLeave.error ??
		leaveActions.changeType.error ??
		leaveActions.cancelDay.error ??
		leaveActions.cancelDayFirst.error;
	const leavePending =
		leaveActions.putOnLeave.isPending ||
		leaveActions.changeType.isPending ||
		leaveActions.cancelDay.isPending ||
		leaveActions.cancelDayFirst.isPending;
	const modeLabels: Record<RosterPanelMode, string> = {
		shift: t(
			assignment.shift === null ? `${key}.aShift` : `${key}.anotherShift`
		),
		dayOff: t(
			needsDecision(assignment) ? `${key}.confirmDayOff` : `${key}.makeDayOff`
		),
		swap: t(`${key}.swap`),
		leave: t(`${key}.leave`),
		anotherType: t(`${key}.anotherLeaveType`),
	};
	// Another shift needs the schedule's frozen shifts; until they load it isn't offered.
	const modes = panelModes({
		assignment,
		hasShifts: shifts.length > 0,
		mayChangeLeave,
	});

	/** A failure belongs to the choice that caused it. */
	const clearFailures = (): void => {
		apply.reset();
		offer.reset();
		Object.values(leaveActions).forEach((action) => {
			action.reset();
		});
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

	/**
	 * Step two of taking someone off leave, marked as such so the API never
	 * undoes half of the move. Refused, the day is left as the cancelled leave
	 * left it: `assignment` here is still the day before that refresh, which
	 * says whether it is flagged.
	 */
	const editRoster = async (
		rosterCells: Array<RosterChangeCell>,
		checksFingerprint: string | undefined
	): Promise<void> => {
		try {
			onApplied(
				await apply.mutateAsync({
					expectedRevision: revision,
					cells: rosterCells,
					remark: remark.trim(),
					checksFingerprint,
					leaveMove: true,
				})
			);
		} catch (error) {
			setStranded({
				reason: t(`${key}.error.${rosterChangeRefusal(error)}`),
				flagged: leaveTookTheShift(assignment),
			});
		}
	};

	const runLeaveMove = async (): Promise<void> => {
		setConfirming(false);
		if (!leaveMove || membershipId === null) return;
		const leaveOf = {
			membershipId,
			day: assignment.day,
			remark: remark.trim(),
		};
		const dayOfRequest = {
			...leaveOf,
			leaveRequestId: assignment.leaveRequestId ?? "",
		};
		try {
			switch (leaveMove.kind) {
				case "putOnLeave":
					await leaveActions.putOnLeave.mutateAsync({
						...leaveOf,
						leaveType: leaveMove.leaveType,
					});
					onLeaveChanged?.();
					return;
				case "changeType":
					await leaveActions.changeType.mutateAsync({
						...dayOfRequest,
						leaveType: leaveMove.leaveType,
					});
					onLeaveChanged?.();
					return;
				case "backToDayOff":
					if (leaveTookTheShift(assignment)) {
						await leaveActions.cancelDayFirst.mutateAsync(dayOfRequest);
						await editRoster(
							cellsForChoice(assignment, { kind: "dayOff" }),
							undefined
						);
						return;
					}
					await leaveActions.cancelDay.mutateAsync(dayOfRequest);
					onLeaveChanged?.();
					return;
				case "backToShift":
					await leaveActions.cancelDayFirst.mutateAsync(dayOfRequest);
					await editRoster(cells, fingerprint ?? undefined);
					return;
			}
		} catch {
			// The mutation keeps the error, which the panel shows.
		}
	};

	const confirmLeaveMove = (): void => {
		void runLeaveMove();
	};

	const askOrRunLeaveMove = (): void => {
		if (!leaveMove) return;
		if (notifiesMembers && moveChangesRoster(assignment, leaveMove))
			setConfirming(true);
		else confirmLeaveMove();
	};

	const leaveTypeLabel = (code: string): string =>
		leaveOptions.find((option) => option.value === code)?.label ?? "";

	const leaveChange = (): { before: string; after: string } => ({
		before: cellText(nowCell),
		after:
			leaveMove?.kind === "putOnLeave" || leaveMove?.kind === "changeType"
				? leaveTypeLabel(leaveMove.leaveType)
				: t(`${key}.dayOff`),
	});

	const leaveNotes = (): Array<string> => {
		const facts = { name, day };
		switch (leaveMove?.kind) {
			case "putOnLeave":
				return [
					t(`${key}.leaveNote.putOnLeave`, facts),
					t(
						assignment.shift === null
							? `${key}.leaveNote.usesNoLeave`
							: `${key}.leaveNote.needsCover`,
						facts
					),
				];
			case "changeType":
				return [t(`${key}.leaveNote.oneDayOnly`, facts)];
			case "backToDayOff":
				return [t(`${key}.leaveNote.backToDayOff`, facts)];
			default:
				return [];
		}
	};

	const requestDays = request.data
		? rangeDays({ start: request.data.startDate, end: request.data.endDate })
				.length
		: 1;
	const requestLink = assignment.leaveRequestId
		? leaveLinkSearch(
				assignment.leaveRequestId,
				membershipId,
				leaveEditing?.viewerMembershipId
			)
		: undefined;

	const section = (children: ReactNode): ReactNode => (
		<div className="flex flex-col gap-3 px-4 py-4">{children}</div>
	);

	return (
		<aside
			aria-labelledby={titleId}
			className={joinClassNames("w-full shrink-0 lg:w-96", className)}
			onKeyDown={(event) => {
				if (event.key === "Escape") onClose();
			}}
		>
			<div className="divide-y divide-neutral-400 overflow-hidden rounded-lg border border-neutral-400">
				<div className="flex h-14 items-center justify-between px-4">
					<h2
						ref={heading}
						className="font-bold text-neutral-900 outline-none"
						id={titleId}
						tabIndex={-1}
					>
						{t(`${key}.title`, { name, date: day })}
					</h2>
					<Button
						aria-label={t(`${key}.close`)}
						variant="icon"
						onClick={onClose}
					>
						<CloseIcon />
					</Button>
				</div>
				{issues && section(issues)}
				{section(
					<dl className="flex flex-col gap-1 text-sm">
						<dt className="font-medium text-neutral-800">{t(`${key}.now`)}</dt>
						<dd className="font-semibold text-neutral-900">
							{cellText(nowCell)}
							{assignment.jobTitle && ` · ${assignment.jobTitle.name}`}
							{assignment.offReason === "LEAVE" &&
								assignment.leaveTypeName &&
								` · ${assignment.leaveTypeName}`}
						</dd>
						{leaveDay &&
							assignment.offReason === "OFF" &&
							assignment.leaveTypeName && (
								<dd className="text-neutral-800">
									{t(`${key}.leaveCoversDay`, {
										type: assignment.leaveTypeName,
									})}
								</dd>
							)}
						{leaveDay && leaveEditing && requestLink && (
							<dd>
								<Button search={requestLink} to="/leave" variant="textlink">
									{t(`${key}.changeAllDays`, { count: requestDays })}
								</Button>
							</dd>
						)}
						{assignment.lastChange && (
							<dd className="text-neutral-800">
								{assignment.lastChange.appliedBy?.displayName
									? t(`${key}.changedBy`, {
											time: formatDay(
												assignment.lastChange.appliedAt,
												language
											),
											name: assignment.lastChange.appliedBy.displayName,
										})
									: t(`${key}.changedAt`, {
											time: formatDay(
												assignment.lastChange.appliedAt,
												language
											),
										})}
								<span className="block">
									{t(`${key}.was`, {
										cell: cellText(assignment.lastChange.before),
									})}
								</span>
								{leaveTookTheShift(assignment) && (
									<span className="block">{t(`${key}.takenOffForLeave`)}</span>
								)}
								{assignment.lastChange.remark && (
									<q className="block">{assignment.lastChange.remark}</q>
								)}
							</dd>
						)}
					</dl>
				)}
				{needsDecision(assignment) &&
					section(
						<Callout tone="warning">
							{t(
								assignment.flag === "NEEDS_ATTENTION"
									? `${key}.needsAttention`
									: `${key}.needsDecision`,
								{ name }
							)}
						</Callout>
					)}
				{leaveEditing &&
					assignment.flag === "LEAVE_REQUESTED" &&
					assignment.leaveTypeName &&
					requestLink &&
					section(
						<>
							<p className="text-sm text-neutral-800">
								{t(`${key}.leaveRequested`, {
									name,
									type: assignment.leaveTypeName,
								})}
							</p>
							<Button search={requestLink} to="/leave" variant="textlink">
								{t(`${key}.reviewInLeave`)}
							</Button>
						</>
					)}
				{coverOffers &&
					offer.openOffer &&
					!offer.justSent &&
					section(
						<CoverOfferSent
							name={name}
							offer={offer.openOffer}
							refusal={offer.withdrawRefusal}
							timeZone={coverOffers.timeZone}
							withdrawing={offer.withdrawing}
							onWithdraw={offer.withdraw}
						/>
					)}
				{stranded &&
					section(
						<p className="text-sm text-error-700" role="alert">
							{t(
								stranded.flagged
									? `${key}.strandedNeedsDecision`
									: `${key}.strandedDayOff`,
								{ day, reason: stranded.reason }
							)}
						</p>
					)}
				{modes.length === 0
					? section(
							<p className="text-sm text-neutral-800">
								{t(ownDay ? `${key}.ownLeave` : `${key}.leaveReadOnly`)}
							</p>
						)
					: section(
							<>
								<h3
									className="text-sm font-medium text-neutral-800"
									id={choicesId}
								>
									{t(`${key}.changeTo`)}
								</h3>
								<div
									aria-labelledby={choicesId}
									className="flex flex-col gap-2"
									role="radiogroup"
								>
									{modes.map((value) => (
										<RadioCard
											key={value}
											checked={mode === value}
											label={modeLabels[value]}
											name={`${titleId}-mode`}
											value={value}
											onChange={() => {
												setMode(value);
												clearFailures();
											}}
										/>
									))}
								</div>
								{(mode === "leave" || mode === "anotherType") && (
									<Select
										aria-label={t(`${key}.leaveType`)}
										options={leaveOptions}
										placeholder={t(`${key}.chooseLeaveType`)}
										value={leaveType}
										onChange={setLeaveType}
									/>
								)}
								{mode === "shift" &&
									(choices.length === 0 ? (
										<p className="text-sm text-neutral-800">
											{t(`${key}.noShift`, { weekday: day, name })}
										</p>
									) : (
										<Select
											aria-label={t(`${key}.shift`)}
											placeholder={t(`${key}.chooseShift`)}
											value={shiftId}
											options={choices.map((shift) => ({
												value: shift.shiftId,
												label: `${shift.name} · ${formatTimeRange(shift, t)}`,
											}))}
											onChange={setShiftId}
										/>
									))}
								{mode === "swap" && (
									<>
										<Select
											aria-label={t(`${key}.swapWith`)}
											placeholder={t(`${key}.choosePerson`)}
											value={partnerId}
											options={partners.available.map((row) => ({
												value: row.assignmentId,
												label: `${row.member?.displayName ?? ""} · ${cellText({
													kind: row.shift === null ? "OFF" : "WORK",
													shift: row.shift,
													jobTitle: row.jobTitle,
												})}`,
											}))}
											onChange={setPartnerId}
										/>
										{partners.unavailable.length > 0 && (
											<p className="text-sm text-neutral-800">
												{t(`${key}.notAvailable`, {
													count: partners.unavailable.length,
													names: partners.unavailable
														.map(
															(row) =>
																row.member?.displayName ??
																t("scheduling.detail.formerMember")
														)
														.join(", "),
												})}
											</p>
										)}
									</>
								)}
							</>
						)}
				{body &&
					coverOffers &&
					offer.justSent &&
					section(
						<CoverOfferSent
							name={name}
							offer={offer.justSent}
							refusal={offer.withdrawRefusal}
							timeZone={coverOffers.timeZone}
							withdrawing={offer.withdrawing}
							onWithdraw={offer.withdraw}
						/>
					)}
				{body &&
					!offer.justSent &&
					section(
						<>
							<RosterChangeReview
								names={names}
								notifiesMembers={notifiesMembers}
								preview={preview.data}
								remark={remark}
								remarkRequired={leaveMove !== undefined}
								ticked={ticked}
								remarkHint={
									leaveMove ? t(`${key}.leaveRemarkHint`, { name }) : undefined
								}
								onRemarkChange={setRemark}
								onTickedChange={(checked) => {
									setTickedFor(checked ? fingerprint : null);
								}}
							/>
							{previewRefusal && (
								<div className="flex flex-col items-start gap-2" role="alert">
									<p className="text-sm text-error-700">
										{previewRefusal === "revision"
											? t(`${key}.error.revision`)
											: t(`${key}.previewFailed`)}
									</p>
									<Button
										variant="textlink"
										onClick={() => {
											if (previewRefusal === "revision")
												void client.invalidateQueries({
													queryKey: scheduleKey(
														target.companyId,
														target.scheduleId
													),
												});
											else void preview.refetch();
										}}
									>
										{previewRefusal === "revision"
											? t(`${key}.error.reload`)
											: t(`${key}.tryAgain`)}
									</Button>
								</div>
							)}
							{applyRefusal && !stranded && (
								<p className="text-sm text-error-700" role="alert">
									{t(`${key}.error.${applyRefusal}`)}
								</p>
							)}
							{leaveFailure && (
								<p className="text-sm text-error-700" role="alert">
									{t(`${key}.leaveFailed.${rosterLeaveRefusal(leaveFailure)}`, {
										name,
									})}
								</p>
							)}
							{coverOffers && offer.consentKind ? (
								<CoverOfferActions
									name={name}
									pending={offer.createPending}
									refusal={offer.createRefusal}
									rivals={offer.rivals}
									sendBlocked={offer.openOffer !== undefined}
									timeZone={coverOffers.timeZone}
									ready={
										Boolean(preview.data) && canApply(gate, ticked, remark)
									}
									onRecord={offer.record}
									onSend={offer.send}
								/>
							) : (
								<div className="flex justify-end gap-3">
									<Button size="sm" variant="secondary" onClick={onClose}>
										{t(`${key}.cancel`)}
									</Button>
									<Button
										loading={apply.isPending || leavePending}
										size="sm"
										disabled={
											!preview.data ||
											!canApply(gate, ticked, remark) ||
											(leaveMove !== undefined && !remarkGiven)
										}
										onClick={() => {
											if (leaveMove) askOrRunLeaveMove();
											else if (notifiesMembers) setConfirming(true);
											else submit();
										}}
									>
										{t(
											gate.needsRemark ? `${key}.applyAnyway` : `${key}.apply`
										)}
									</Button>
								</div>
							)}
						</>
					)}
				{leaveMove &&
					!body &&
					section(
						<>
							<RosterLeaveReview
								change={leaveChange()}
								name={name}
								notes={leaveNotes()}
								remark={remark}
								onRemarkChange={setRemark}
							/>
							{leaveFailure && (
								<p className="text-sm text-error-700" role="alert">
									{t(`${key}.leaveFailed.${rosterLeaveRefusal(leaveFailure)}`, {
										name,
									})}
								</p>
							)}
							<div className="flex justify-end gap-3">
								<Button size="sm" variant="secondary" onClick={onClose}>
									{t(`${key}.cancel`)}
								</Button>
								<Button
									disabled={!remarkGiven}
									loading={leavePending}
									size="sm"
									onClick={askOrRunLeaveMove}
								>
									{t(`${key}.applyLeave`)}
								</Button>
							</div>
						</>
					)}
			</div>
			{confirming && (leaveMove || preview.data) && (
				<ConfirmDialog
					cancelLabel={t(`${key}.cancel`)}
					confirmLabel={t(`${key}.applyAndNotify`)}
					submitting={apply.isPending || leavePending}
					title={t(`${key}.publishedTitle`)}
					description={t(`${key}.notifyCount`, {
						count: leaveMove ? 1 : peopleTold(preview.data?.cells ?? []),
					})}
					onConfirm={leaveMove ? confirmLeaveMove : submit}
					onClose={() => {
						setConfirming(false);
					}}
				/>
			)}
		</aside>
	);
};
