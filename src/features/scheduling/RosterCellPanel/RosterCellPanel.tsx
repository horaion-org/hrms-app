import { useId, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { CoverOffer } from "@/features/scheduling/coverOffers/api";
import { CoverOfferSent } from "@/features/scheduling/coverOffers/CoverOfferActions/CoverOfferSent";
import { CellChoices } from "@/features/scheduling/RosterCellPanel/CellChoices";
import { CellNow } from "@/features/scheduling/RosterCellPanel/CellNow";
import { CellPanelAlert } from "@/features/scheduling/RosterCellPanel/CellPanelAlert";
import { CellPanelFooter } from "@/features/scheduling/RosterCellPanel/CellPanelFooter";
import { CellPanelHeader } from "@/features/scheduling/RosterCellPanel/CellPanelHeader";
import { useRosterCellPanel } from "@/features/scheduling/RosterCellPanel/useRosterCellPanel";
import { RosterChangeReview } from "@/features/scheduling/RosterChangeReview";
import { RosterLeaveReview } from "@/features/scheduling/RosterLeaveReview";
import type { RosterChange } from "@/features/scheduling/rosterChanges/api";
import {
	cellPanelSections,
	type CellPanelSectionId,
} from "@/features/scheduling/rosterChanges/cellPanelSections";
import {
	needsDecision,
	type RosterLeaveRefusal,
} from "@/features/scheduling/rosterChanges/rosterLeave";
import type { RosterChangeTarget } from "@/features/scheduling/rosterChanges/useRosterChangeActions";
import type {
	ScheduleAssignment,
	ScheduleShift,
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
 *
 * `useRosterCellPanel` holds the state and calls; `cellPanelSections` decides
 * which parts show, in order; this component only maps each part to its content.
 */
export const RosterCellPanel = ({
	onClose,
	notifiesMembers = false,
	issues,
	className,
	...input
}: RosterCellPanelProps): FunctionComponent => {
	const { t } = useTranslation();
	const titleId = useId();
	const panel = useRosterCellPanel({
		...input,
		notifiesMembers,
		hasIssues: Boolean(issues),
	});
	const { assignment } = input;
	const {
		name,
		day,
		stranded,
		changeReview,
		leaveReview,
		coverOffer,
		confirmation,
	} = panel;

	const leaveFailureAlert = (
		failure: RosterLeaveRefusal | undefined
	): ReactNode =>
		failure && (
			<CellPanelAlert>
				{t(`${key}.leaveFailed.${failure}`, { name })}
			</CellPanelAlert>
		);

	/** An offer out for the member's day, with Withdraw. */
	const offerOut = (offer: CoverOffer | undefined): ReactNode =>
		coverOffer &&
		offer && (
			<CoverOfferSent
				name={name}
				offer={offer}
				refusal={coverOffer.withdrawRefusal}
				timeZone={coverOffer.timeZone}
				withdrawing={coverOffer.withdrawing}
				onWithdraw={coverOffer.withdraw}
			/>
		);

	/** Each part's content; `cellPanelSections` decides which show, in order. */
	const sections: Record<CellPanelSectionId, () => ReactNode> = {
		issues: () => issues,
		current: () => (
			<CellNow
				assignment={assignment}
				language={panel.language}
				leaveDay={panel.leaveDay}
				requestDays={panel.requestDays}
				requestLink={panel.requestLink}
			/>
		),
		needsDecision: () => (
			<Callout tone="warning">
				{t(
					assignment.flag === "NEEDS_ATTENTION"
						? `${key}.needsAttention`
						: `${key}.needsDecision`,
					{ name }
				)}
			</Callout>
		),
		leaveRequested: () => (
			<>
				<p className="text-sm text-neutral-800">
					{t(`${key}.leaveRequested`, {
						name,
						type: assignment.leaveTypeName,
					})}
				</p>
				<Button search={panel.requestLink} to="/leave" variant="textlink">
					{t(`${key}.reviewInLeave`)}
				</Button>
			</>
		),
		offerOpen: () => offerOut(coverOffer?.openOffer),
		stranded: () =>
			stranded && (
				<CellPanelAlert>
					{t(
						stranded.flagged
							? `${key}.strandedNeedsDecision`
							: `${key}.strandedDayOff`,
						{ day, reason: t(`${key}.error.${stranded.refusal}`) }
					)}
				</CellPanelAlert>
			),
		readOnly: () => (
			<p className="text-sm text-neutral-800">
				{t(panel.ownDay ? `${key}.ownLeave` : `${key}.leaveReadOnly`)}
			</p>
		),
		choices: () => (
			<CellChoices
				choices={panel.choices}
				day={day}
				dayHasShift={assignment.shift !== null}
				dayNeedsDecision={needsDecision(assignment)}
				name={name}
				radioName={`${titleId}-mode`}
			/>
		),
		offerSent: () => offerOut(coverOffer?.justSent),
		changeReview: () => (
			<>
				<RosterChangeReview
					names={changeReview.names}
					notifiesMembers={notifiesMembers}
					preview={changeReview.preview}
					remark={changeReview.remark}
					remarkRequired={changeReview.remarkRequired}
					ticked={changeReview.ticked}
					remarkHint={
						changeReview.remarkRequired
							? t(`${key}.leaveRemarkHint`, { name })
							: undefined
					}
					onRemarkChange={changeReview.setRemark}
					onTickedChange={changeReview.setTicked}
				/>
				{changeReview.previewRefusal && (
					<div className="flex flex-col items-start gap-2" role="alert">
						<p className="text-sm text-error-700">
							{changeReview.previewRefusal === "revision"
								? t(`${key}.error.revision`)
								: t(`${key}.previewFailed`)}
						</p>
						<Button variant="textlink" onClick={changeReview.retryPreview}>
							{changeReview.previewRefusal === "revision"
								? t(`${key}.error.reload`)
								: t(`${key}.tryAgain`)}
						</Button>
					</div>
				)}
				{changeReview.applyRefusal && !stranded && (
					<CellPanelAlert>
						{t(`${key}.error.${changeReview.applyRefusal}`)}
					</CellPanelAlert>
				)}
				{leaveFailureAlert(changeReview.leaveFailure)}
				<CellPanelFooter
					applyDisabled={changeReview.applyBlocked}
					busy={changeReview.busy}
					applyLabel={t(
						changeReview.applyAnyway ? `${key}.applyAnyway` : `${key}.apply`
					)}
					offerActions={
						coverOffer?.consentKind
							? {
									name,
									pending: coverOffer.createPending,
									ready: coverOffer.ready,
									refusal: coverOffer.createRefusal,
									rivals: coverOffer.rivals,
									sendBlocked: coverOffer.openOffer !== undefined,
									timeZone: coverOffer.timeZone,
									onRecord: coverOffer.record,
									onSend: coverOffer.send,
								}
							: undefined
					}
					onApply={changeReview.applyChange}
					onCancel={onClose}
				/>
			</>
		),
		leaveReview: () => (
			<>
				<RosterLeaveReview
					change={leaveReview.change}
					name={name}
					notes={leaveReview.notes}
					remark={leaveReview.remark}
					onRemarkChange={leaveReview.setRemark}
				/>
				{leaveFailureAlert(leaveReview.leaveFailure)}
				<CellPanelFooter
					applyDisabled={leaveReview.applyBlocked}
					applyLabel={t(`${key}.applyLeave`)}
					busy={leaveReview.busy}
					onApply={leaveReview.applyLeaveMove}
					onCancel={onClose}
				/>
			</>
		),
	};

	return (
		<aside
			aria-labelledby={titleId}
			className={joinClassNames("w-full shrink-0 lg:w-96", className)}
			onKeyDown={(event) => {
				if (event.key === "Escape") onClose();
			}}
		>
			<div className="divide-y divide-neutral-400 overflow-hidden rounded-lg border border-neutral-400">
				<CellPanelHeader
					focusKey={assignment.assignmentId}
					title={t(`${key}.title`, { name, date: day })}
					titleId={titleId}
					onClose={onClose}
				/>
				{cellPanelSections(panel.facts).map((id) => (
					<div key={id} className="flex flex-col gap-3 px-4 py-4">
						{sections[id]()}
					</div>
				))}
			</div>
			{confirmation && (
				<ConfirmDialog
					cancelLabel={t(`${key}.cancel`)}
					confirmLabel={t(`${key}.applyAndNotify`)}
					description={t(`${key}.notifyCount`, { count: confirmation.count })}
					submitting={confirmation.submitting}
					title={t(`${key}.publishedTitle`)}
					onClose={confirmation.close}
					onConfirm={confirmation.confirm}
				/>
			)}
		</aside>
	);
};
