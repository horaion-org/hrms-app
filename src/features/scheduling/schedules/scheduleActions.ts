import type { Schedule } from "@/features/scheduling/schedules/api";

/** The roster page's own actions; Export and Delete stay with `ScheduleMenu`. */
export type ScheduleActionId =
	"publish" | "reject" | "regenerate" | "viewSetup" | "details";

/** What decides which actions a person is offered on one schedule. */
export type ScheduleActionFacts = {
	status: Schedule["status"];
	/** Holds `schedule:publish`, the roster is decidable and its week is not published elsewhere. */
	mayPublish: boolean;
	/** Holds `schedule:publish` and the roster is decidable. */
	mayReject: boolean;
	/** Holds `schedule:generate`, it is regenerable and its week is not published elsewhere. */
	mayRegenerate: boolean;
	/** Has a roster, so its history has something to tell. */
	hasRoster: boolean;
};

export type ScheduleAction = {
	id: ScheduleActionId;
	labelKey:
		| "scheduling.decision.publish"
		| "scheduling.decision.reject"
		| "scheduling.regenerate.button"
		| "scheduling.detail.viewSetup"
		| "scheduling.detail.details.title";
	/** The status where this is the page's one primary button; otherwise it is in the menu. */
	primaryWhen?: Schedule["status"];
	offered: (facts: ScheduleActionFacts) => boolean;
};

/**
 * Every action the roster page offers, in menu order. Each is the one
 * primary button in the status `primaryWhen` names (the first offered one
 * wins) and a "More actions" item otherwise, and is offered only where
 * `offered` says.
 */
export const SCHEDULE_ACTIONS: ReadonlyArray<ScheduleAction> = [
	{
		id: "publish",
		labelKey: "scheduling.decision.publish",
		primaryWhen: "GENERATED",
		offered: ({ mayPublish }) => mayPublish,
	},
	{
		id: "reject",
		labelKey: "scheduling.decision.reject",
		offered: ({ mayReject }) => mayReject,
	},
	{
		id: "regenerate",
		labelKey: "scheduling.regenerate.button",
		primaryWhen: "REJECTED",
		offered: ({ mayRegenerate }) => mayRegenerate,
	},
	{
		id: "viewSetup",
		labelKey: "scheduling.detail.viewSetup",
		primaryWhen: "DRAFT",
		offered: () => true,
	},
	{
		id: "details",
		labelKey: "scheduling.detail.details.title",
		offered: ({ hasRoster }) => hasRoster,
	},
];

/** The page's one primary action, if any, and the rest for its menu. */
export const scheduleActions = (
	facts: ScheduleActionFacts
): { primary?: ScheduleAction; menu: Array<ScheduleAction> } => {
	const offered = SCHEDULE_ACTIONS.filter((action) => action.offered(facts));
	const primary = offered.find((action) => action.primaryWhen === facts.status);
	return {
		...(primary ? { primary } : {}),
		menu: offered.filter((action) => action !== primary),
	};
};
