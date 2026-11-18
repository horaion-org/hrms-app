import { useState } from "react";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { formatPeriod } from "@/features/scheduling/periods";
import { offersPublishing } from "@/features/scheduling/timeline/pieceActions";
import { PieceDialogs } from "@/features/scheduling/timeline/StatusStrip";
import type { TimelinePiece } from "@/features/scheduling/timeline/timelineRows";
import { usePieceActions } from "@/features/scheduling/timeline/usePieceActions";

export type PublishDaysDialogProps = {
	companyId: string;
	/** The pieces to review in the days shown, in day order. One opens its publish dialog at once; several are listed. */
	pieces: ReadonlyArray<TimelinePiece>;
	onClose: () => void;
};

const key = "scheduling.timeline.publishDays";

type PieceProps = Pick<PublishDaysDialogProps, "companyId"> & {
	piece: TimelinePiece;
};

/** One piece's publish dialog, told what it confirms by the same facts its strip menu uses. */
const PiecePublish = ({
	companyId,
	piece,
	onClose,
}: PieceProps & { onClose: () => void }): FunctionComponent => (
	<PieceDialogs
		actions={usePieceActions(companyId, piece)}
		companyId={companyId}
		dialog="publish"
		piece={piece}
		onClose={onClose}
	/>
);

/** One listed piece: its days, and Publish where its strip menu would offer to put it forward. */
const PieceRow = ({
	companyId,
	piece,
	onChoose,
}: PieceProps & { onChoose: () => void }): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const { menu } = usePieceActions(companyId, piece);
	const days = formatPeriod(
		{ start: piece.schedule.coveredFrom, end: piece.schedule.coveredTo },
		formattingLocale(i18n)
	);
	return (
		<li className="flex flex-wrap items-center justify-between gap-2">
			<span>{days}</span>
			<Button
				aria-label={t(`${key}.publishNamed`, { days })}
				disabled={!offersPublishing(menu)}
				size="sm"
				variant="secondary"
				onClick={onChoose}
			>
				{t("scheduling.timeline.publish")}
			</Button>
		</li>
	);
};

/**
 * Publish from the roster's header or its needs list. One piece to review
 * opens its publish dialog at once; several are listed by their days, each
 * with its own Publish, since each piece is published on its own.
 */
export const PublishDaysDialog = ({
	companyId,
	pieces,
	onClose,
}: PublishDaysDialogProps): FunctionComponent => {
	const { t } = useTranslation();
	const [onlyPiece] = pieces;
	const [chosenId, setChosenId] = useState(
		pieces.length === 1 ? onlyPiece?.schedule.scheduleId : undefined
	);
	const chosen = pieces.find((piece) => piece.schedule.scheduleId === chosenId);
	if (chosen)
		return (
			<PiecePublish companyId={companyId} piece={chosen} onClose={onClose} />
		);
	return (
		<Dialog
			open
			description={pieces.length > 0 ? t(`${key}.intro`) : undefined}
			title={t(`${key}.title`)}
			footer={
				<div className="flex justify-end">
					<Button variant="cancel" onClick={onClose}>
						{t(`${key}.close`)}
					</Button>
				</div>
			}
			onClose={onClose}
		>
			{pieces.length === 0 ? (
				<p className="text-sm text-neutral-800">{t(`${key}.none`)}</p>
			) : (
				<ul className="flex flex-col gap-3 text-sm text-neutral-800">
					{pieces.map((piece) => (
						<PieceRow
							key={piece.schedule.scheduleId}
							companyId={companyId}
							piece={piece}
							onChoose={() => {
								setChosenId(piece.schedule.scheduleId);
							}}
						/>
					))}
				</ul>
			)}
		</Dialog>
	);
};
