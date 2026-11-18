import {
	Menu,
	MenuButton,
	MenuHeading,
	MenuItems,
	MenuSection,
} from "@headlessui/react";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import {
	compactMenuPanelClasses,
	OverflowMenuItem,
} from "@/components/ui/OverflowMenu";
import { formatPeriod } from "@/features/scheduling/periods";
import {
	PIECE_MENU_LABELS,
	type PieceMenuItem,
} from "@/features/scheduling/timeline/pieceActions";
import {
	type StripRun,
	stripRunsOf,
} from "@/features/scheduling/timeline/rosterStrip";
import {
	type PieceDialog,
	PieceDialogs,
} from "@/features/scheduling/timeline/StatusStrip/PieceDialogs";
import {
	timelineScheduleLink,
	type TimelineSchedule,
	type TimelineView,
} from "@/features/scheduling/timeline/timeline";
import {
	showsStripWord,
	staffCellClasses,
	stripBandLooks,
	stripToneOf,
} from "@/features/scheduling/timeline/timelineLooks";
import type { TimelinePiece } from "@/features/scheduling/timeline/timelineRows";
import { usePieceActions } from "@/features/scheduling/timeline/usePieceActions";

export type StatusStripProps = {
	companyId: string;
	/** The Department shown, which a draft's setup link names. */
	departmentId: string;
	schedules: ReadonlyArray<TimelineSchedule>;
	/** The ISO dates shown, one column each. */
	days: ReadonlyArray<string>;
	view: TimelineView;
	/** Every schedule read so far (`useDepartmentTimeline`); a piece still being read has no menu yet. */
	pieces: Record<string, TimelinePiece>;
};

const key = "scheduling.timeline";

/** A band: one rounded run of days in one state, its pieces side by side. */
const bandClasses =
	"flex h-7 w-full min-w-0 items-stretch overflow-hidden rounded-md text-xs font-semibold whitespace-nowrap";

/** One piece's part of its band, or a band with nothing to press. */
const segmentClasses = "flex h-full w-full min-w-0 items-center px-2 text-left";

/** The dialog each menu item opens; the two that open the piece's own page open none. */
const DIALOG_OF_ITEM: Record<PieceMenuItem, PieceDialog | undefined> = {
	open: undefined,
	setup: undefined,
	approve: "publish",
	approveAndPublish: "publish",
	publish: "publish",
	submit: "publish",
	withdraw: "withdraw",
	regenerate: "regenerate",
	delete: "delete",
};

/**
 * One piece of a band: a button named by its days and state that opens the
 * actions for those days, each through the dialog the schedule page opens
 * for the same action.
 */
const PieceMenu = ({
	companyId,
	departmentId,
	schedule,
	piece,
	days,
	label,
	word,
}: Pick<StatusStripProps, "companyId" | "departmentId"> & {
	schedule: TimelineSchedule;
	piece: TimelinePiece;
	/** The piece's days in words, which its menu names. */
	days: string;
	/** The button's full name: its days and its state. */
	label: string;
	/** The state word shown on the button; empty on all but a band's first piece. */
	word: string;
}): FunctionComponent => {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [openDialog, setOpenDialog] = useState<PieceDialog>();
	const actions = usePieceActions(companyId, piece);
	/** Opens the item's dialog, or the piece's own page for the items without one. */
	const choose = (item: PieceMenuItem): void => {
		const dialog = DIALOG_OF_ITEM[item];
		if (dialog) setOpenDialog(dialog);
		else void navigate(timelineScheduleLink(schedule, departmentId));
	};
	return (
		<Menu as="div" className="h-full min-w-0">
			<MenuButton
				aria-label={label}
				title={label}
				className={joinClassNames(
					segmentClasses,
					"cursor-pointer data-hover:bg-black/5 data-open:bg-black/10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink-blue-500"
				)}
			>
				<span className="truncate">{word}</span>
			</MenuButton>
			<MenuItems
				anchor="bottom start"
				className={joinClassNames(compactMenuPanelClasses, "min-w-56")}
			>
				{/* The heading says which days the items act on: a band of several pieces shows its word once. */}
				<MenuSection className="divide-y divide-neutral-400">
					<MenuHeading className="px-4 py-2 text-xs font-normal text-neutral-800">
						{t(`${key}.piece.menuLabel`, { days })}
					</MenuHeading>
					{actions.menu.map((item) => (
						<OverflowMenuItem
							key={item}
							tone={item === "delete" ? "danger" : "default"}
							onClick={() => {
								choose(item);
							}}
						>
							{t(PIECE_MENU_LABELS[item])}
						</OverflowMenuItem>
					))}
				</MenuSection>
			</MenuItems>
			{openDialog && (
				<PieceDialogs
					actions={actions}
					companyId={companyId}
					dialog={openDialog}
					piece={piece}
					onClose={() => {
						setOpenDialog(undefined);
					}}
				/>
			)}
		</Menu>
	);
};

/** One run of the strip: a toned band with a menu per piece, or plain words where there is no roster. */
const Band = ({
	run,
	companyId,
	departmentId,
	view,
	pieces,
}: Omit<StatusStripProps, "schedules" | "days"> & {
	run: StripRun;
}): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	const state = t(`${key}.strip.states.${run.state}`);
	const word = showsStripWord(view, run.span) ? state : "";
	const looks = joinClassNames(
		bandClasses,
		stripBandLooks[stripToneOf(run.state)]
	);
	if (run.pieces.length === 0) {
		const days = formatPeriod(
			{ start: run.firstDay, end: run.lastDay },
			language
		);
		return (
			<span
				className={looks}
				title={t(`${key}.strip.segment`, { days, state })}
			>
				<span className={segmentClasses}>
					<span className="truncate">{word}</span>
				</span>
			</span>
		);
	}
	return (
		<div className={looks}>
			{run.pieces.map(({ schedule, firstDay, span }, index) => {
				// A piece is named by all its schedule's days, which its actions act on, not only those shown.
				const days = formatPeriod(
					{ start: schedule.firstDay, end: schedule.lastDay },
					language
				);
				const label = t(`${key}.strip.segment`, { days, state });
				const piece = pieces[schedule.id];
				const pieceWord = index === 0 ? word : "";
				return (
					<div
						key={`${schedule.id}-${firstDay}`}
						className="min-w-0 not-first:border-l not-first:border-white"
						style={{ flex: `${span} 1 0%` }}
					>
						{piece ? (
							<PieceMenu
								companyId={companyId}
								days={days}
								departmentId={departmentId}
								label={label}
								piece={piece}
								schedule={schedule}
								word={pieceWord}
							/>
						) : (
							<span className={segmentClasses} title={label}>
								<span className="truncate">{pieceWord}</span>
							</span>
						)}
					</div>
				);
			})}
		</div>
	);
};

/**
 * The status strip, one table row under the dates: each run of days in one
 * state is a band (Published, To review, Generating, failed, No roster), and
 * pressing a piece of a band gives the actions for its days.
 */
export const StatusStrip = ({
	schedules,
	days,
	...shared
}: StatusStripProps): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<tr className="border-t border-neutral-400">
			<th
				className={joinClassNames(staffCellClasses, "text-sm font-normal")}
				scope="row"
			>
				{t(`${key}.strip.label`)}
			</th>
			{stripRunsOf(schedules, days).map((run) => (
				<td key={run.firstDay} className="px-1 py-1" colSpan={run.span}>
					<Band run={run} {...shared} />
				</td>
			))}
		</tr>
	);
};
