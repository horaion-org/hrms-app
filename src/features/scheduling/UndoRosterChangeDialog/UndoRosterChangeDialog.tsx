import { useState } from "react";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { dayTypeInSentence } from "@/features/scheduling/dayTypes";
import { formatDay } from "@/features/scheduling/periods";
import { RosterChangeReview } from "@/features/scheduling/RosterChangeReview";
import type {
	RosterChangePreview,
	RosterUndoBody,
} from "@/features/scheduling/rosterChanges/api";
import type { CheckNames } from "@/features/scheduling/rosterChanges/checkSentence";
import {
	applyGate,
	canApply,
	peopleTold,
} from "@/features/scheduling/rosterChanges/rosterEdit";

export type UndoRosterChangeDialogProps = {
	/** The undo's preview, whose checks ask for something or refuse it. */
	preview: RosterChangePreview;
	/** True while the undo is being carried out. */
	submitting: boolean;
	/** Why the last attempt failed. */
	error?: string;
	onConfirm: (body: RosterUndoBody) => void;
	onClose: () => void;
	/** The roster is published: the people whose days the undo changes back are told. */
	notifiesMembers?: boolean;
};

const key = "scheduling.rosterEdit";

/**
 * Asks before undoing the latest change when the undo itself needs a tick, or
 * a tick and a remark, or can't be done: an undo is an edit back, and leave
 * or availability may have changed since. On a published roster it always
 * asks, and says how many people will be told. Otherwise an undo nothing
 * stands against is applied without this question.
 */
export const UndoRosterChangeDialog = ({
	preview,
	submitting,
	error,
	onConfirm,
	onClose,
	notifiesMembers = false,
}: UndoRosterChangeDialogProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	const [remark, setRemark] = useState("");
	const [ticked, setTicked] = useState(false);
	const gate = applyGate(preview.checks);
	// The undo's own cells name the people and shifts its checks are about.
	const names: CheckNames = {
		member: (id) =>
			preview.cells.find((cell) => cell.membershipId === id)?.displayName ??
			t("scheduling.detail.formerMember"),
		shift: (id) =>
			preview.cells
				.flatMap((cell) => [cell.before.shift, cell.after.shift])
				.find((shift) => shift?.shiftId === id)?.name ?? "",
		day: (date) => formatDay(date, language),
		dayType: (code) => dayTypeInSentence(code, t),
	};
	return (
		<ConfirmDialog
			cancelLabel={t(`${key}.cancel`)}
			confirmDisabled={!canApply(gate, ticked, remark)}
			error={error}
			submitting={submitting}
			title={t(`${key}.undoTitle`)}
			confirmLabel={t(
				gate.needsRemark ? `${key}.undoAnyway` : `${key}.undoChange`
			)}
			description={
				notifiesMembers
					? `${t(`${key}.undoDescription`)} ${t(`${key}.notifyCount`, {
							count: peopleTold(preview.cells),
						})}`
					: t(`${key}.undoDescription`)
			}
			onClose={onClose}
			onConfirm={() => {
				onConfirm({
					expectedRevision: preview.expectedRevision,
					remark: remark.trim() === "" ? undefined : remark.trim(),
					checksFingerprint: preview.checksFingerprint ?? undefined,
				});
			}}
		>
			<RosterChangeReview
				names={names}
				notifiesMembers={notifiesMembers}
				preview={preview}
				remark={remark}
				ticked={ticked}
				onRemarkChange={setRemark}
				onTickedChange={setTicked}
			/>
		</ConfirmDialog>
	);
};
