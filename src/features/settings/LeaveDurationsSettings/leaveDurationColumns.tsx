import type { TFunction } from "i18next";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { DataTableColumn } from "@/components/ui/DataTable";
import { ArrowDownIcon, ArrowUpIcon } from "@/components/ui/Icon";
import { LockIcon } from "@/components/ui/LockIcon";
import { OverflowMenuItem } from "@/components/ui/OverflowMenu";
import { durationText } from "@/features/leave/leaveLength";
import type { ManagedLeaveDuration } from "@/features/leaveDurations/api";
import { actionsColumn } from "@/features/organisation/listColumns";
import { reachLabel } from "@/features/workspace/unitReach";

const key = "settings.leave.durations";

type MoveDirection = "up" | "down";

export type LeaveDurationColumnsOptions = {
	/** Whether the reader holds `leave_duration:update` anywhere; without it the table only lists. */
	canUpdate: boolean;
	/** Whether the reader may reorder the company list (`leave_duration:update` company-wide). */
	canReorder: boolean;
	/** Whether a move this way is possible now: not at an end and no move saving. */
	canMove: (
		duration: ManagedLeaveDuration,
		direction: MoveDirection
	) => boolean;
	onMove: (duration: ManagedLeaveDuration, direction: MoveDirection) => void;
	onEdit: (duration: ManagedLeaveDuration) => void;
	onToggleStatus: (duration: ManagedLeaveDuration) => void;
	onDelete: (duration: ManagedLeaveDuration) => void;
};

/** "09:00–13:00", or "22:00–02:00 next day" when it runs past midnight. */
export const timeRangeOf = (
	duration: ManagedLeaveDuration,
	t: TFunction
): string =>
	t(
		duration.endTime < duration.startTime
			? `${key}.timeRangeNextDay`
			: `${key}.timeRange`,
		{ start: duration.startTime, end: duration.endTime }
	);

/** Only a duration whose status this app knows can be sent back whole. */
const isEditable = (duration: ManagedLeaveDuration): boolean =>
	duration.canEdit && duration.status !== "UNKNOWN";

/**
 * The leave durations table's columns: name, time, length, where it applies
 * and status; then up and down arrows for a reader who may reorder; then the
 * row actions (Edit, and Activate or Deactivate and Delete in the menu) on a
 * row the reader may change, or a lock on one that covers departments they
 * don't manage, as the system leave type shows. Without `canUpdate` the
 * table only lists.
 */
export const leaveDurationColumns = (
	t: TFunction,
	{
		canUpdate,
		canReorder,
		canMove,
		onMove,
		onEdit,
		onToggleStatus,
		onDelete,
	}: LeaveDurationColumnsOptions
): Array<DataTableColumn<ManagedLeaveDuration>> => {
	// Arrows stay focusable at either end and while a move is saving (aria-disabled, not disabled), so a
	// keyboard user keeps their place; the move itself is announced through the Toast's live region.
	const arrow = (
		duration: ManagedLeaveDuration,
		direction: MoveDirection
	): ReactNode => (
		<Button
			aria-disabled={!canMove(duration, direction) || undefined}
			className="aria-disabled:cursor-not-allowed aria-disabled:text-neutral-400"
			data-move={`${duration.leaveDurationId}:${direction}`}
			variant="icon"
			aria-label={t(direction === "up" ? `${key}.moveUp` : `${key}.moveDown`, {
				name: duration.name,
			})}
			onClick={() => {
				onMove(duration, direction);
			}}
		>
			{direction === "up" ? <ArrowUpIcon /> : <ArrowDownIcon />}
		</Button>
	);
	const rowActions = actionsColumn<ManagedLeaveDuration>(
		t,
		(duration) => (
			<>
				<OverflowMenuItem
					disabled={!isEditable(duration)}
					onClick={() => {
						onToggleStatus(duration);
					}}
				>
					{t(
						duration.status === "ACTIVE"
							? "organisation.list.deactivateItem"
							: "organisation.list.activateItem"
					)}
				</OverflowMenuItem>
				<OverflowMenuItem
					tone="danger"
					onClick={() => {
						onDelete(duration);
					}}
				>
					{t("organisation.list.deleteItem")}
				</OverflowMenuItem>
			</>
		),
		isEditable,
		onEdit
	);
	const columns: Array<DataTableColumn<ManagedLeaveDuration>> = [
		{
			id: "name",
			header: t(`${key}.name`),
			cell: (duration) => duration.name,
			cellClassName: "font-semibold",
			pin: "start",
		},
		{
			id: "time",
			header: t(`${key}.time`),
			cell: (duration) => timeRangeOf(duration, t),
		},
		{
			id: "length",
			header: t(`${key}.length`),
			headerClassName: "w-30",
			cell: (duration) => durationText(duration.minutes, t),
		},
		{
			id: "appliesTo",
			header: t(`${key}.appliesTo`),
			cell: (duration) => reachLabel(duration, t),
			// A phone keeps the name, the time and the actions; where it applies is in its dialog.
			hideBelow: "md",
		},
		{
			id: "status",
			header: t("organisation.list.status"),
			headerClassName: "w-30",
			cell: (duration) => (
				<Badge tone={duration.status === "ACTIVE" ? "success" : "neutral"}>
					{t(
						duration.status === "ACTIVE"
							? "organisation.status.ACTIVE"
							: "organisation.status.INACTIVE"
					)}
				</Badge>
			),
		},
	];
	const orderColumn: DataTableColumn<ManagedLeaveDuration> = {
		id: "order",
		header: t(`${key}.order`),
		headerClassName: "w-30",
		cell: (duration) => (
			<div className="flex justify-center gap-2">
				{arrow(duration, "up")}
				{arrow(duration, "down")}
			</div>
		),
	};
	const actions: DataTableColumn<ManagedLeaveDuration> = {
		...rowActions,
		cell: (duration) =>
			duration.canEdit ? (
				rowActions.cell(duration)
			) : (
				<span className="flex justify-center text-neutral-700">
					<LockIcon className="size-5" title={t(`${key}.lock`)} />
				</span>
			),
	};
	if (!canUpdate) return columns;
	return [...columns, ...(canReorder ? [orderColumn] : []), actions];
};
