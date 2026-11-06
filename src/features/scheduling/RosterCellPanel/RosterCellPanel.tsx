import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { RadioCard } from "@/components/forms/RadioCard";
import { Select } from "@/components/forms/Select";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CloseIcon } from "@/components/ui/Icon";
import { formatTimeRange } from "@/features/scheduling/formatShift";
import { formatDay } from "@/features/scheduling/periods";
import { RosterChangeReview } from "@/features/scheduling/RosterChangeReview";
import {
	rosterChangePreviewQuery,
	type RosterChange,
	type RosterChangeBody,
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
	useRosterChangeActions,
	type RosterChangeTarget,
} from "@/features/scheduling/rosterChanges/useRosterChangeActions";
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
	/**
	 * The roster is published: applying tells each person whose days change,
	 * with the remark, so Apply asks first how many will be told.
	 */
	notifiesMembers?: boolean;
	className?: string;
};

/** What the person is about to do with the day, before choosing the shift or person. */
type Mode = "shift" | "dayOff" | "swap";

const key = "scheduling.rosterEdit";

/**
 * One roster day beside the grid, for someone who may change the roster: what
 * it holds now (and who changed it last), a choice of another shift, a day
 * off or a same-day swap, a preview with the API's checks, and Apply. Leave
 * is never changed here. Checks that need a tick, or a tick and a remark,
 * hold Apply until given; scheduling rules aren't checked again. On a
 * published roster Apply asks first, saying how many people will be told.
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
	notifiesMembers = false,
	className,
}: RosterCellPanelProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = i18n.resolvedLanguage ?? i18n.language;
	const client = useQueryClient();
	const titleId = useId();
	const heading = useRef<HTMLHeadingElement>(null);
	const choicesId = useId();
	const [mode, setMode] = useState<Mode>();
	const [shiftId, setShiftId] = useState<string>();
	const [partnerId, setPartnerId] = useState<string>();
	const [remark, setRemark] = useState("");
	// The fingerprint of the checks the person ticked: new checks need a new tick.
	const [tickedFor, setTickedFor] = useState<string | null>(null);
	// On a published roster, Apply first asks whether to tell the people whose days change.
	const [confirming, setConfirming] = useState(false);
	const { apply } = useRosterChangeActions(target);

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
	const choice: RosterEditChoice | undefined =
		mode === "dayOff"
			? { kind: "dayOff" }
			: mode === "shift" && shiftId !== undefined
				? { kind: "shift", shiftId }
				: mode === "swap" && partner !== undefined
					? { kind: "swap", partner }
					: undefined;
	const cells = cellsForChoice(assignment, choice);
	const body: RosterChangeBody | undefined =
		cells.length > 0 ? { expectedRevision: revision, cells } : undefined;
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
	const onLeave = assignment.offReason === "LEAVE";
	// Another shift needs the schedule's frozen shifts; until they load only Day off and Swap are offered.
	const modes: Array<{ value: Mode; label: string }> = onLeave
		? []
		: [
				...(shifts.length === 0
					? []
					: [
							{
								value: "shift" as const,
								label: t(
									assignment.shift === null
										? `${key}.aShift`
										: `${key}.anotherShift`
								),
							},
						]),
				...(assignment.shift === null
					? []
					: [{ value: "dayOff" as const, label: t(`${key}.makeDayOff`) }]),
				{ value: "swap", label: t(`${key}.swap`) },
			];

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
				{section(
					<dl className="flex flex-col gap-1 text-sm">
						<dt className="font-medium text-neutral-800">{t(`${key}.now`)}</dt>
						<dd className="font-semibold text-neutral-900">
							{cellText(nowCell)}
							{assignment.jobTitle && ` · ${assignment.jobTitle.name}`}
						</dd>
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
								{assignment.lastChange.remark && (
									<q className="block">{assignment.lastChange.remark}</q>
								)}
							</dd>
						)}
					</dl>
				)}
				{onLeave
					? section(
							<p className="text-sm text-neutral-800">
								{t(`${key}.leaveReadOnly`)}
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
									{modes.map(({ value, label }) => (
										<RadioCard
											key={value}
											checked={mode === value}
											label={label}
											name={`${titleId}-mode`}
											value={value}
											onChange={() => {
												setMode(value);
											}}
										/>
									))}
								</div>
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
					section(
						<>
							<RosterChangeReview
								names={names}
								notifiesMembers={notifiesMembers}
								preview={preview.data}
								remark={remark}
								ticked={ticked}
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
							{applyRefusal && (
								<p className="text-sm text-error-700" role="alert">
									{t(`${key}.error.${applyRefusal}`)}
								</p>
							)}
							<div className="flex justify-end gap-3">
								<Button size="sm" variant="secondary" onClick={onClose}>
									{t(`${key}.cancel`)}
								</Button>
								<Button
									disabled={!preview.data || !canApply(gate, ticked, remark)}
									loading={apply.isPending}
									size="sm"
									onClick={() => {
										if (notifiesMembers) setConfirming(true);
										else submit();
									}}
								>
									{t(gate.needsRemark ? `${key}.applyAnyway` : `${key}.apply`)}
								</Button>
							</div>
						</>
					)}
			</div>
			{confirming && preview.data && (
				<ConfirmDialog
					cancelLabel={t(`${key}.cancel`)}
					confirmLabel={t(`${key}.applyAndNotify`)}
					submitting={apply.isPending}
					title={t(`${key}.publishedTitle`)}
					description={t(`${key}.notifyCount`, {
						count: peopleTold(preview.data.cells),
					})}
					onConfirm={submit}
					onClose={() => {
						setConfirming(false);
					}}
				/>
			)}
		</aside>
	);
};
