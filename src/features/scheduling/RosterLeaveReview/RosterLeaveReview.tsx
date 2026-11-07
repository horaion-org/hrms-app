import { useId } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Textarea } from "@/components/forms/Textarea";
import { Callout } from "@/components/ui/Callout";
import { LEAVE_REMARK_MAX_LENGTH } from "@/features/leave/api";

export type RosterLeaveReviewProps = {
	/** What the day holds now → what it will hold. */
	change: { before: string; after: string };
	/** Who the leave is for, as the remark's hint names them. */
	name: string;
	/** What the person should know before applying. */
	notes: ReadonlyArray<string>;
	remark: string;
	onRemarkChange: (remark: string) => void;
};

const key = "scheduling.rosterEdit";

/**
 * What a leave move does to the day before it is applied: before → after,
 * what to know, and the required remark, which the member reads. The sibling
 * of `RosterChangeReview` for moves with no roster preview to show.
 */
export const RosterLeaveReview = ({
	change,
	name,
	notes,
	remark,
	onRemarkChange,
}: RosterLeaveReviewProps): FunctionComponent => {
	const { t } = useTranslation();
	const remarkId = useId();
	const remarkIds = formRowIds(remarkId);
	return (
		<div className="flex flex-col gap-3">
			<h3 className="text-sm font-semibold text-neutral-800">
				{t(`${key}.beforeAfter`)}
			</h3>
			<p className="text-sm text-neutral-900">
				{change.before} → {change.after}
			</p>
			{notes.map((note) => (
				<Callout key={note}>{note}</Callout>
			))}
			<FormRow
				required
				counter={`${remark.length}/${LEAVE_REMARK_MAX_LENGTH}`}
				hint={t(`${key}.leaveRemarkHint`, { name })}
				htmlFor={remarkId}
				label={t(`${key}.remarkRequired`)}
				layout="stacked"
			>
				<Textarea
					aria-required
					aria-describedby={remarkIds.hintId}
					className="w-full"
					id={remarkId}
					maxLength={LEAVE_REMARK_MAX_LENGTH}
					rows={2}
					value={remark}
					onChange={(event) => {
						onRemarkChange(event.target.value);
					}}
				/>
			</FormRow>
		</div>
	);
};
