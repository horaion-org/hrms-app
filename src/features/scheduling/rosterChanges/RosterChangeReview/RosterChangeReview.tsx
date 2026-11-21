import { useId, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Textarea } from "@/components/forms/Textarea";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Checkbox } from "@/components/ui/Checkbox";
import { Skeleton } from "@/components/ui/Skeleton";
import { RosterChangeChecks } from "@/features/scheduling/rosterChanges/RosterChangeChecks";
import {
	ROSTER_CHANGE_REMARK_MAX_LENGTH,
	type RosterChangePreview,
} from "@/features/scheduling/rosterChanges/api";
import { rosterCellText } from "@/features/scheduling/rosterChanges/cellText";
import type { CheckNames } from "@/features/scheduling/rosterChanges/checkSentence";
import { applyGate } from "@/features/scheduling/rosterChanges/rosterEdit";
import {
	refusalNextStep,
	type RefusalNextStep,
	type RosterChangeRefusal,
} from "@/features/scheduling/rosterChanges/rosterChangeRefusal";

export type RosterChangeReviewProps = {
	/** The API's preview; undefined while it loads. */
	preview: RosterChangePreview | undefined;
	names: CheckNames;
	remark: string;
	onRemarkChange: (remark: string) => void;
	/** Whether the person ticked these very checks. */
	ticked: boolean;
	onTickedChange: (ticked: boolean) => void;
	/** The roster is published: the people whose days change are told, and see the remark. */
	notifiesMembers?: boolean;
	/** The remark is asked for whatever the checks say, as every leave move is. */
	remarkRequired?: boolean;
	/** Who reads the remark, where it isn't the roster's own readers: a leave move's remark reaches the employee. */
	remarkHint?: string;
	/** Says rules aren't re-checked; off where the panel already says so in its own words (Find cover). */
	showsRulesNote?: boolean;
	/** Shows the checks' heading and "No issues found." when the preview has none; off in the Issues panel, which keeps to what matters. */
	showsEmptyChecks?: boolean;
	/** Keeps the remark behind "Add a remark" until pressed, unless a check or `remarkRequired` asks for one or it already holds words. */
	remarkFolded?: boolean;
	/** Why the preview couldn't be read, in the refusal's own words; a retry only where one can work (refusalNextStep). */
	previewRefusal?: RosterChangeRefusal;
	/** Reads the preview again, or reloads the roster after a "revision" refusal. */
	onRetryPreview?: () => void;
	/** The change drawn, in place of its before → after lines, under its own title (the Issues panel's tiles). */
	beforeAfter?: { title: string; content: ReactNode };
};

const key = "scheduling.rosterEdit";

/** The button under a refused preview, for each next step. */
const NEXT_STEP_LABELS = {
	reload: `${key}.error.reload`,
	tryAgain: `${key}.tryAgain`,
} as const satisfies Record<RefusalNextStep, string>;

/**
 * What a change, or the undo of one, would do before it is applied: each day
 * before → after, the checks with what each asks, the line saying rules are
 * not re-checked (unless the panel says it itself), and the remark and tick
 * the checks ask for, and why the preview couldn't be read with its retry.
 * Shared by the editor beside the grid, Find cover and the undo question, so
 * all ask the same way.
 */
export const RosterChangeReview = ({
	preview,
	names,
	remark,
	onRemarkChange,
	ticked,
	onTickedChange,
	notifiesMembers = false,
	remarkRequired = false,
	remarkHint,
	showsRulesNote = true,
	showsEmptyChecks = true,
	remarkFolded = false,
	previewRefusal,
	onRetryPreview,
	beforeAfter,
}: RosterChangeReviewProps): FunctionComponent => {
	const { t } = useTranslation();
	const remarkId = useId();
	const remarkIds = formRowIds(remarkId);
	const gate = applyGate(preview?.checks ?? []);
	const nextStep = previewRefusal && refusalNextStep(previewRefusal);
	const needsRemark = gate.needsRemark || remarkRequired;
	const [remarkOpened, setRemarkOpened] = useState(false);
	const remarkShown =
		!remarkFolded || needsRemark || remarkOpened || remark !== "";
	const checksShown =
		showsEmptyChecks || (preview !== undefined && preview.checks.length > 0);
	return (
		<div className="flex flex-col gap-3">
			<h3 className="text-sm font-semibold text-neutral-800">
				{beforeAfter?.title ?? t(`${key}.beforeAfter`)}
			</h3>
			{preview && beforeAfter?.content}
			{preview && !beforeAfter && (
				<ul className="flex flex-col gap-1 text-sm text-neutral-900">
					{preview.cells.map((cell) => (
						<li key={`${cell.membershipId ?? ""}-${cell.day}`}>
							<span className="font-semibold">
								{cell.displayName ?? t("scheduling.detail.formerMember")}
							</span>{" "}
							{rosterCellText(cell.before, t)} → {rosterCellText(cell.after, t)}
						</li>
					))}
				</ul>
			)}
			{!preview && (
				<span className="flex flex-col gap-2" role="status">
					<span className="sr-only">{t(`${key}.checking`)}</span>
					<Skeleton className="h-3 w-3/4" />
					<Skeleton className="h-3 w-1/2" />
				</span>
			)}
			{checksShown && (
				<h3 className="text-sm font-semibold text-neutral-800">
					{t(`${key}.checks`)}
				</h3>
			)}
			{preview && checksShown && (
				<>
					<RosterChangeChecks checks={preview.checks} names={names} />
					{showsRulesNote && <Callout>{t(`${key}.rulesNotChecked`)}</Callout>}
				</>
			)}
			{preview && !gate.refused && !remarkShown && (
				<Button
					className="self-start"
					variant="textlink"
					onClick={(): void => {
						setRemarkOpened(true);
					}}
				>
					{t(`${key}.addRemark`)}
				</Button>
			)}
			{preview && !gate.refused && remarkShown && (
				<FormRow
					counter={`${remark.length}/${ROSTER_CHANGE_REMARK_MAX_LENGTH}`}
					htmlFor={remarkId}
					label={t(needsRemark ? `${key}.remarkRequired` : `${key}.remark`)}
					layout="stacked"
					required={needsRemark}
					hint={
						remarkHint ??
						t(
							notifiesMembers
								? `${key}.remarkHintPublished`
								: `${key}.remarkHint`
						)
					}
				>
					<Textarea
						// Opened by "Add a remark": the box takes focus, as the decline reason does.
						autoFocus={remarkOpened}
						aria-describedby={remarkIds.hintId}
						aria-required={needsRemark}
						className="w-full"
						id={remarkId}
						maxLength={ROSTER_CHANGE_REMARK_MAX_LENGTH}
						rows={2}
						value={remark}
						onChange={(event) => {
							onRemarkChange(event.target.value);
						}}
					/>
				</FormRow>
			)}
			{preview && gate.needsTick && !gate.refused && (
				<Checkbox
					checked={ticked}
					label={t(`${key}.tick`)}
					onChange={(event) => {
						onTickedChange(event.target.checked);
					}}
				/>
			)}
			{previewRefusal && (
				<div className="flex flex-col items-start gap-2" role="alert">
					<p className="text-sm text-error-700">
						{previewRefusal === "failed"
							? t(`${key}.previewFailed`)
							: t(`${key}.error.${previewRefusal}`)}
					</p>
					{onRetryPreview && nextStep && (
						<Button variant="textlink" onClick={onRetryPreview}>
							{t(NEXT_STEP_LABELS[nextStep])}
						</Button>
					)}
				</div>
			)}
		</div>
	);
};
