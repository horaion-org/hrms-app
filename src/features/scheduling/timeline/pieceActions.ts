import {
	scheduleActions,
	type ScheduleActionFacts,
	type ScheduleActionId,
} from "@/features/scheduling/schedules/scheduleActions";

/*
 * What the status strip's menu offers on one piece of the roster (one
 * schedule's days), pure. The rule is the roster page's own
 * (`scheduleActions`); the menu only leaves out what stays on that page.
 */

/** The roster page's actions the menu keeps; Reject, withdrawing a submission, View setup and Details stay on that page. */
const KEPT_ACTIONS = [
	"approve",
	"approveAndPublish",
	"publish",
	"submit",
	"withdraw",
	"regenerate",
] as const satisfies ReadonlyArray<ScheduleActionId>;

type KeptAction = (typeof KEPT_ACTIONS)[number];

/** One item of a piece's menu: opening it (a draft opens its setup), an action the roster page offers, or Delete. */
export type PieceMenuItem = "open" | "setup" | KeptAction | "delete";

/** What decides a piece's menu: the roster page's facts, and whether Delete is offered (`mayDeleteSchedule`). */
export type PieceFacts = ScheduleActionFacts & { mayDelete: boolean };

/** Whether the menu keeps one of the roster page's actions. */
const isKept = (id: ScheduleActionId): id is KeptAction =>
	KEPT_ACTIONS.some((kept) => kept === id);

/**
 * A piece's menu, in order: open it first (a draft: finish its setup), then
 * the actions the roster page would offer on it, then Delete where allowed.
 */
export const pieceMenuOf = (facts: PieceFacts): Array<PieceMenuItem> => {
	const { primary, menu } = scheduleActions(facts);
	const offered = [...(primary ? [primary] : []), ...menu]
		.map((action) => action.id)
		.filter(isKept);
	return [
		facts.status === "DRAFT" ? "setup" : "open",
		...offered,
		...(facts.mayDelete ? (["delete"] as const) : []),
	];
};

/** The items that put a roster forward: publishing it, sending it for approval, or approving its open step. */
const PUBLISHING_ITEMS: ReadonlyArray<PieceMenuItem> = [
	"publish",
	"submit",
	"approve",
	"approveAndPublish",
];

/** Whether a piece's menu offers to put its roster forward, so Publish outside the menu may offer it too. */
export const offersPublishing = (menu: ReadonlyArray<PieceMenuItem>): boolean =>
	menu.some((item) => PUBLISHING_ITEMS.includes(item));

/** The words of each menu item: "these days" on the roster, the approval's own words for a step's decision. */
export const PIECE_MENU_LABELS = {
	open: "scheduling.timeline.piece.open",
	setup: "scheduling.timeline.piece.setup",
	approve: "approvals.actions.approve",
	approveAndPublish: "approvals.actions.approveAndPublish",
	publish: "scheduling.timeline.piece.publish",
	submit: "scheduling.timeline.piece.submit",
	withdraw: "scheduling.timeline.piece.withdraw",
	regenerate: "scheduling.timeline.piece.regenerate",
	delete: "scheduling.timeline.piece.delete",
} as const satisfies Record<PieceMenuItem, string>;
