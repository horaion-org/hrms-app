import { useId } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Textarea } from "@/components/forms/Textarea";
import { Callout } from "@/components/ui/Callout";
import { Checkbox } from "@/components/ui/Checkbox";
import { Skeleton } from "@/components/ui/Skeleton";
import { RosterChangeChecks } from "@/features/scheduling/RosterChangeChecks";
import {
	ROSTER_CHANGE_REMARK_MAX_LENGTH,
	type RosterChangePreview,
} from "@/features/scheduling/rosterChanges/api";
import { rosterCellText } from "@/features/scheduling/rosterChanges/cellText";
import type { CheckNames } from "@/features/scheduling/rosterChanges/checkSentence";
import { applyGate } from "@/features/scheduling/rosterChanges/rosterEdit";

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
};

const key = "scheduling.rosterEdit";

/**
 * What a change, or the undo of one, would do before it is applied: each day
 * before → after, the checks with what each asks, the line saying rules are
 * not re-checked, and the remark and tick the checks ask for. Shared by the
 * editor beside the grid and the undo question, so both ask the same way.
 */
export const RosterChangeReview = ({
	preview,
	names,
	remark,
	onRemarkChange,
	ticked,
	onTickedChange,
	notifiesMembers = false,
}: RosterChangeReviewProps): FunctionComponent => {
	const { t } = useTranslation();
	const remarkId = useId();
	const remarkIds = formRowIds(remarkId);
	const gate = applyGate(preview?.checks ?? []);
	return (
		<div className="flex flex-col gap-3">
			<h3 className="text-sm font-semibold text-neutral-800">
				{t(`${key}.beforeAfter`)}
			</h3>
			{preview ? (
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
			) : (
				<span className="flex flex-col gap-2" role="status">
					<span className="sr-only">{t(`${key}.checking`)}</span>
					<Skeleton className="h-3 w-3/4" />
					<Skeleton className="h-3 w-1/2" />
				</span>
			)}
			<h3 className="text-sm font-semibold text-neutral-800">
				{t(`${key}.checks`)}
			</h3>
			{preview && (
				<>
					<RosterChangeChecks checks={preview.checks} names={names} />
					<Callout>{t(`${key}.rulesNotChecked`)}</Callout>
				</>
			)}
			{preview && !gate.refused && (
				<FormRow
					counter={`${remark.length}/${ROSTER_CHANGE_REMARK_MAX_LENGTH}`}
					htmlFor={remarkId}
					layout="stacked"
					required={gate.needsRemark}
					hint={t(
						notifiesMembers ? `${key}.remarkHintPublished` : `${key}.remarkHint`
					)}
					label={t(
						gate.needsRemark ? `${key}.remarkRequired` : `${key}.remark`
					)}
				>
					<Textarea
						aria-describedby={remarkIds.hintId}
						aria-required={gate.needsRemark}
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
		</div>
	);
};
