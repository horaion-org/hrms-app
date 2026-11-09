import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { CrossIcon, TickIcon } from "@/components/ui/Icon";
import { Quote } from "@/components/ui/Quote";
import type {
	ApprovalDecision,
	ApprovalInstance,
	ApprovalInstanceStep,
	ApprovalParticipant,
} from "@/features/approvals/api";

export type ApprovalTrailProps = {
	instance: ApprovalInstance;
	/** The department its "anyone who can publish" steps name. */
	departmentName: string;
	/** Says an instant as the subject shows its times, e.g. in the branch's time zone. */
	formatMoment: (instant: string) => string;
	className?: string;
};

const key = "approvals.trail";

/** Above this many named people, an "all of them" step folds its waiting people into one line. */
const LISTED_PEOPLE = 4;

/**
 * A 16 px mark; the word beside it carries the meaning, so the mark is
 * hidden. Shape tells the states apart as well as colour: a tick, a cross,
 * a ring with a filled centre for the open step, an empty ring otherwise.
 */
const StatusMark = ({
	status,
}: {
	status: ApprovalInstanceStep["status"];
}): FunctionComponent => {
	if (status === "APPROVED")
		return <TickIcon aria-hidden="true" className="size-4 text-success-700" />;
	if (status === "REJECTED")
		return <CrossIcon aria-hidden="true" className="size-4 text-error-700" />;
	const open = status === "OPEN";
	return (
		<span
			aria-hidden="true"
			className={joinClassNames(
				"flex size-4 items-center justify-center rounded-full border-2",
				open ? "border-ink-blue-700" : "border-neutral-400"
			)}
		>
			{open && <span className="size-1.5 rounded-full bg-ink-blue-700" />}
		</span>
	);
};

/** When the open step started: the previous step's last decision, or the submission for step 1. */
const openSince = (
	instance: ApprovalInstance,
	step: ApprovalInstanceStep
): string => {
	const previous = instance.steps.find(
		(each) => each.stepOrder === step.stepOrder - 1
	);
	// ISO instants sort as text; the latest decision closed the previous step.
	const latest = (previous?.decisions ?? [])
		.map((decision) => decision.decidedAt)
		.sort()
		.reverse()[0];
	return latest ?? instance.submittedAt;
};

/**
 * A submission's steps, first to last, with the open one after the decided
 * ones: each step's number, name and status in words, who decided and when,
 * and their comment; a skipped step names who approved it with the next one. The open step says whose turn it is and since when; an "all of
 * them" step counts its approvals and lists each named person.
 */
export const ApprovalTrail = ({
	instance,
	departmentName,
	formatMoment,
	className,
}: ApprovalTrailProps): FunctionComponent => {
	const { t } = useTranslation();
	const ended = instance.status !== "PENDING";
	const count = instance.steps.length;
	const nameOf = (person: ApprovalParticipant | null): string =>
		person?.displayName ?? t(`${key}.formerMember`);
	const decisionOf = (
		step: ApprovalInstanceStep,
		member: ApprovalParticipant
	): ApprovalDecision | undefined =>
		step.decisions.find(
			(decision) => decision.decidedBy?.membershipId === member.membershipId
		);
	const waitingOn = (step: ApprovalInstanceStep): Array<ApprovalParticipant> =>
		step.members.filter((member) => !decisionOf(step, member));
	const eachPerson = (step: ApprovalInstanceStep): boolean =>
		step.rule === "MEMBERS" && step.quorum === "ALL" && step.members.length > 1;

	/** The open step's word: whose turn, or for "all of them", how many approved. */
	const openWord = (step: ApprovalInstanceStep): string => {
		if (instance.canDecide === true) return t(`${key}.waitingOnYou`);
		if (eachPerson(step))
			return t(`${key}.approvedOf`, {
				count: step.members.length - waitingOn(step).length,
				total: step.members.length,
			});
		if (step.rule === "MEMBERS") {
			const left = waitingOn(step);
			const only = left.length === 1 ? left[0] : undefined;
			return only
				? t(`${key}.waitingOnName`, { name: nameOf(only) })
				: t(`${key}.waitingOnPeople`, { count: left.length });
		}
		return instance.eligibleCount === null
			? t(`${key}.waiting`)
			: t(`${key}.waitingOnPeople`, { count: instance.eligibleCount });
	};
	const statusWord = (step: ApprovalInstanceStep): string => {
		switch (step.status) {
			case "APPROVED":
				return t(`${key}.approved`);
			case "REJECTED":
				return t(`${key}.rejected`);
			case "SKIPPED":
				return t(`${key}.skipped`);
			case "OPEN":
				return ended ? t(`${key}.notReached`) : openWord(step);
			case "WAITING":
				return t(ended ? `${key}.notReached` : `${key}.notYet`);
			case "UNKNOWN":
				return t(`${key}.unknown`);
		}
	};
	/** Who may decide a step nobody has decided yet, and, while it is open, since when. */
	const whoDecides = (step: ApprovalInstanceStep, open: boolean): string => {
		const who =
			step.rule === "KEY_HOLDERS"
				? t(`${key}.anyoneWhoCanPublish`, { department: departmentName })
				: step.members.map(nameOf).join(", ");
		return open
			? t(`${key}.since`, {
					who,
					at: formatMoment(openSince(instance, step)),
				})
			: who;
	};
	/** The line under a step nobody decided: who approved it with the next step, or who may decide it. */
	const stepNote = (step: ApprovalInstanceStep, open: boolean): string =>
		step.status === "SKIPPED" && step.skippedBy && step.skippedAt
			? t(`${key}.skippedBy`, {
					name: nameOf(step.skippedBy),
					at: formatMoment(step.skippedAt),
				})
			: whoDecides(step, open);
	/** An "all of them" step's people: decided ones each on a row, the waiting ones folded once there are many. */
	const people = (step: ApprovalInstanceStep): FunctionComponent => {
		const waiting = waitingOn(step);
		const decided = step.members.filter((member) => decisionOf(step, member));
		const folds = step.members.length > LISTED_PEOPLE && waiting.length > 2;
		const shown = folds ? decided : step.members;
		return (
			<ul className="flex flex-col gap-1 text-neutral-700">
				{shown.map((member) => {
					const decision = decisionOf(step, member);
					return (
						<li key={member.membershipId}>
							{decision
								? t(
										decision.decision === "REJECT"
											? `${key}.personRejected`
											: `${key}.personApproved`,
										{
											name: nameOf(member),
											at: formatMoment(decision.decidedAt),
										}
									)
								: t(`${key}.personWaiting`, { name: nameOf(member) })}
						</li>
					);
				})}
				{folds && (
					<li>
						{t(`${key}.waitingFolded`, {
							count: waiting.length,
							names: waiting.slice(0, 2).map(nameOf).join(", "),
							more: waiting.length - 2,
						})}
					</li>
				)}
			</ul>
		);
	};

	return (
		<div className={joinClassNames("flex flex-col gap-4 text-sm", className)}>
			<p className="text-neutral-700">
				{instance.requestedBy
					? t(`${key}.submittedBy`, {
							name: nameOf(instance.requestedBy),
							at: formatMoment(instance.submittedAt),
						})
					: t(`${key}.submittedAt`, { at: formatMoment(instance.submittedAt) })}
				{instance.status === "CANCELLED" && instance.decidedAt && (
					<>
						<br />
						{t(`${key}.withdrawn`, { at: formatMoment(instance.decidedAt) })}
					</>
				)}
			</p>
			<ol className="flex flex-col gap-4">
				{instance.steps.map((step) => {
					const open = !ended && step.stepOrder === instance.currentStepOrder;
					const listsPeople = eachPerson(step);
					return (
						<li
							key={step.stepOrder}
							aria-current={open ? "step" : undefined}
							className="flex gap-3"
						>
							<span className="mt-0.5 shrink-0">
								<StatusMark status={ended && open ? "WAITING" : step.status} />
							</span>
							<div className="flex min-w-0 flex-1 flex-col gap-1">
								<p className="text-neutral-900">
									<span className="sr-only">
										{t(`${key}.stepOf`, { step: step.stepOrder, total: count })}
									</span>
									<span aria-hidden="true" className="mr-2 text-neutral-700">
										{step.stepOrder}
									</span>
									<span className="font-semibold">{step.label}</span>
									{" · "}
									<span className={open ? "font-medium" : undefined}>
										{statusWord(step)}
									</span>
								</p>
								{listsPeople && people(step)}
								{!listsPeople && step.decisions.length === 0 && (
									<p className="text-neutral-700">{stepNote(step, open)}</p>
								)}
								{listsPeople && open && (
									<p className="text-neutral-700">
										{t(`${key}.sinceOnly`, {
											at: formatMoment(openSince(instance, step)),
										})}
									</p>
								)}
								{step.decisions.map((decision) => (
									<div
										key={`${decision.decidedBy?.membershipId ?? ""}|${decision.decidedAt}`}
										className="flex flex-col gap-2"
									>
										{!listsPeople && (
											<p className="text-neutral-700">
												{t(`${key}.decidedBy`, {
													name: nameOf(decision.decidedBy),
													at: formatMoment(decision.decidedAt),
												})}
											</p>
										)}
										{decision.comment && (
											<Quote
												caption={
													listsPeople
														? nameOf(decision.decidedBy)
														: t(
																decision.decision === "REJECT"
																	? `${key}.reason`
																	: `${key}.comment`
															)
												}
											>
												{decision.comment}
											</Quote>
										)}
									</div>
								))}
							</div>
						</li>
					);
				})}
			</ol>
		</div>
	);
};
