import type { FunctionComponent } from "@/common/types";
import { mondayOf } from "@/common/weeks";
import { RegenerateMonthDialog } from "@/features/scheduling/months/RegenerateMonthDialog";
import { CheckedPublishDialog } from "@/features/scheduling/rulesCheck/CheckedPublishDialog";
import { DeleteScheduleDialog } from "@/features/scheduling/schedules/DeleteScheduleDialog";
import { RegenerateScheduleDialog } from "@/features/scheduling/schedules/RegenerateScheduleDialog";
import { RejectScheduleDialog } from "@/features/scheduling/schedules/RejectScheduleDialog";
import { offersPublishing } from "@/features/scheduling/timeline/pieceActions";
import type { TimelinePiece } from "@/features/scheduling/timeline/timelineRows";
import type { PieceActions } from "@/features/scheduling/timeline/usePieceActions";

/** The dialogs a piece's menu opens. */
export type PieceDialog = "publish" | "withdraw" | "regenerate" | "delete";

export type PieceDialogsProps = {
	companyId: string;
	piece: TimelinePiece;
	/** The piece's actions (`usePieceActions`), which tell each dialog what it does. */
	actions: PieceActions;
	/** The dialog that is open. */
	dialog: PieceDialog;
	onClose: () => void;
};

/**
 * The open dialog of one piece's menu: the same dialogs, with the same
 * props, the schedule page opens for the same action; publishing runs the
 * rules check first.
 */
export const PieceDialogs = ({
	companyId,
	piece,
	actions,
	dialog,
	onClose,
}: PieceDialogsProps): FunctionComponent => (
	<>
		{dialog === "publish" && (
			// Publish from the header or the needs list waits for the piece's own menu to offer it.
			<CheckedPublishDialog
				companyId={companyId}
				confirmDisabled={!offersPublishing(actions.menu)}
				daysLeftBefore={actions.daysLeftBefore}
				mode={actions.publishMode}
				schedule={piece.schedule}
				onClose={onClose}
			/>
		)}
		{dialog === "withdraw" && (
			<RejectScheduleDialog
				companyId={companyId}
				decision="withdraw"
				schedule={piece.schedule}
				onClose={onClose}
			/>
		)}
		{dialog === "regenerate" &&
			actions.regeneration.path === "monthRun" &&
			piece.month && (
				// A whole week never published is generated again by its month's run, for this week only.
				<RegenerateMonthDialog
					companyId={companyId}
					month={piece.month}
					weeks={[mondayOf(piece.schedule.periodStart)]}
					onClose={onClose}
				/>
			)}
		{dialog === "regenerate" && actions.regeneration.path !== "monthRun" && (
			<RegenerateScheduleDialog
				companyId={companyId}
				regeneration={actions.regeneration}
				schedule={piece.schedule}
				onClose={onClose}
			/>
		)}
		{dialog === "delete" && (
			<DeleteScheduleDialog
				companyId={companyId}
				schedule={piece.schedule}
				weekParts={piece.weekParts}
				onClose={onClose}
				onDeleted={onClose}
			/>
		)}
	</>
);
