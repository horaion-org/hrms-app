import type { TFunction } from "i18next";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import type { DataTableColumn } from "@/components/ui/DataTable";
import { ArrowDownIcon, ArrowUpIcon } from "@/components/ui/Icon";
import { LockIcon } from "@/components/ui/LockIcon";
import { OverflowMenuItem } from "@/components/ui/OverflowMenu";
import type { ManagedLeaveType } from "@/features/leaveTypes/api";
import { actionsColumn } from "@/features/organisation/listColumns";
import { reachLabel } from "@/features/workspace/unitReach";

const key = "settings.leave.types";

type MoveDirection = "up" | "down";

/** The three tables of the catalogue, each with its own columns. */
export type LeaveTypeTableColumns = {
	system: Array<DataTableColumn<ManagedLeaveType>>;
	active: Array<DataTableColumn<ManagedLeaveType>>;
	inactive: Array<DataTableColumn<ManagedLeaveType>>;
};

export type LeaveTypeColumnsOptions = {
	/** Whether the reader may change types (`leave_type:update`); without it the tables only list. */
	canUpdate: boolean;
	/** Only a type whose kind and status this app knows can be edited or have its status changed. */
	isEditable: (type: ManagedLeaveType) => boolean;
	/** Whether a move this way is possible now: not at an end and no move saving. */
	canMove: (type: ManagedLeaveType, direction: MoveDirection) => boolean;
	onMove: (type: ManagedLeaveType, direction: MoveDirection) => void;
	onEdit: (type: ManagedLeaveType) => void;
	onToggleStatus: (type: ManagedLeaveType) => void;
};

/** "Paid · Reason required": what a type is, in the words of its two flags. */
const detailsOf = (type: ManagedLeaveType, t: TFunction): string =>
	[
		t(type.paid ? `${key}.paid` : `${key}.unpaid`),
		...(type.requiresReason ? [t(`${key}.reasonRequired`)] : []),
	].join(" · ");

/** The columns every table shares: the type, its flags and how many requests use it. */
const baseColumns = (
	t: TFunction
): Array<DataTableColumn<ManagedLeaveType>> => [
	{
		id: "name",
		header: t(`${key}.name`),
		cell: (type) => type.name,
		cellClassName: "font-semibold",
		pin: "start",
	},
	{
		id: "details",
		header: t(`${key}.details`),
		cell: (type) => detailsOf(type, t),
	},
	{
		id: "appliesTo",
		header: t(`${key}.appliesTo`),
		cell: (type) => reachLabel(type, t),
		// A phone keeps the name, the count and the actions; where a type applies is in its dialog.
		hideBelow: "md",
	},
	{
		id: "requests",
		header: t(`${key}.requests`),
		headerClassName: "w-30",
		cell: (type) => t(`${key}.requestCount`, { count: type.requestCount }),
	},
];

/**
 * The leave type catalogue's columns. The system type (the scheduler's day
 * off) shows a lock where the actions would be. Active types add up and down
 * arrows and the row actions (Edit, and Activate or Deactivate in the menu);
 * inactive types add only the row actions. Without `canUpdate` every table
 * shows the shared columns alone.
 */
export const leaveTypeColumns = (
	t: TFunction,
	{
		canUpdate,
		isEditable,
		canMove,
		onMove,
		onEdit,
		onToggleStatus,
	}: LeaveTypeColumnsOptions
): LeaveTypeTableColumns => {
	const base = baseColumns(t);
	// Arrows stay focusable at either end and while a move is saving (aria-disabled, not disabled), so a
	// keyboard user keeps their place; the move itself is announced through the Toast's live region.
	const arrow = (
		type: ManagedLeaveType,
		direction: MoveDirection
	): ReactNode => (
		<Button
			aria-disabled={!canMove(type, direction) || undefined}
			className="aria-disabled:cursor-not-allowed aria-disabled:text-neutral-400"
			data-move={`${type.leaveTypeId}:${direction}`}
			variant="icon"
			aria-label={t(direction === "up" ? `${key}.moveUp` : `${key}.moveDown`, {
				name: type.name,
			})}
			onClick={() => {
				onMove(type, direction);
			}}
		>
			{direction === "up" ? <ArrowUpIcon /> : <ArrowDownIcon />}
		</Button>
	);
	const orderColumn: DataTableColumn<ManagedLeaveType> = {
		id: "order",
		header: t(`${key}.order`),
		headerClassName: "w-30",
		cell: (type) => (
			<div className="flex justify-center gap-2">
				{arrow(type, "up")}
				{arrow(type, "down")}
			</div>
		),
	};
	const rowActions = actionsColumn<ManagedLeaveType>(
		t,
		(type) => (
			<OverflowMenuItem
				disabled={!isEditable(type)}
				onClick={() => {
					onToggleStatus(type);
				}}
			>
				{t(
					type.status === "ACTIVE"
						? "organisation.list.deactivateItem"
						: "organisation.list.activateItem"
				)}
			</OverflowMenuItem>
		),
		isEditable,
		onEdit
	);
	const lockColumn: DataTableColumn<ManagedLeaveType> = {
		id: "actions",
		header: t("organisation.list.actions"),
		headerClassName: "w-35",
		pin: "end",
		cell: () => (
			<span className="flex justify-center text-neutral-700">
				<LockIcon className="size-5" title={t(`${key}.systemLock`)} />
			</span>
		),
	};
	return {
		system: [...base, lockColumn],
		active: canUpdate ? [...base, orderColumn, rowActions] : base,
		inactive: canUpdate ? [...base, rowActions] : base,
	};
};
