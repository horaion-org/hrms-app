/**
 * Settings' navigation: its groups, each with its sections, in the order the
 * list shows them. Sections other than General, Notifications and Plan and
 * billing are offered only to people who may use them (`settingsAccess.ts`).
 */
export const SETTINGS_GROUPS = [
	{ group: "workspace", sections: ["general", "notifications"] },
	{
		group: "rostering",
		sections: ["employment", "scheduling", "roster-approvals"],
	},
	{
		group: "leave",
		sections: ["leave-types", "leave-durations", "leave-approvals"],
	},
	{ group: "accessAndData", sections: ["access", "data"] },
	{ group: "account", sections: ["plan"] },
] as const;

export type SettingsGroup = (typeof SETTINGS_GROUPS)[number]["group"];

export type SettingsSection =
	(typeof SETTINGS_GROUPS)[number]["sections"][number];

/** Every section, in list order. */
export const SETTINGS_SECTIONS: ReadonlyArray<SettingsSection> =
	SETTINGS_GROUPS.flatMap((entry) => entry.sections);

/**
 * The section in the URL. No section shows the list on a phone and General
 * from `md`. `terms` opens one employment terms in Settings › Employment
 * terms (a deep link from a profile).
 */
export type SettingsSearch = {
	section?: SettingsSection;
	terms?: string;
};

const isSettingsSection = (value: unknown): value is SettingsSection =>
	(SETTINGS_SECTIONS as ReadonlyArray<unknown>).includes(value);

/** The section an old address names: `leave`, and `approvals` with or without `subject`. */
const sectionOfOldAddress = (
	section: unknown,
	subject: unknown
): SettingsSection | undefined => {
	if (section === "leave") return "leave-types";
	if (section !== "approvals") return undefined;
	return subject === "leave" ? "leave-approvals" : "roster-approvals";
};

/**
 * Reads `?section=` (an unknown section is no section) and, with Employment
 * terms, `terms`. Old addresses keep working: `leave` opens Leave types,
 * `approvals&subject=leave` Leave approvals and any other `approvals` Roster
 * approvals.
 */
export const parseSettingsSearch = (
	search: Record<string, unknown>
): SettingsSearch => {
	const asked = search["section"];
	const section = isSettingsSection(asked)
		? asked
		: sectionOfOldAddress(asked, search["subject"]);
	if (section === undefined) return {};
	const terms = search["terms"];
	if (section === "employment" && typeof terms === "string" && terms !== "")
		return { section, terms };
	return { section };
};

/** Which sections offered only to some people to show. */
export type OptionalSections = Record<
	Exclude<SettingsSection, "general" | "notifications" | "plan">,
	boolean
>;

/** One group of the list, holding only the sections shown. */
export type SettingsNavGroup = {
	group: SettingsGroup;
	sections: Array<SettingsSection>;
};

/** Whether a section is shown: General, Notifications and Plan always, the rest when offered. */
const isShown = (section: SettingsSection, shown: OptionalSections): boolean =>
	section === "general" ||
	section === "notifications" ||
	section === "plan" ||
	shown[section];

/** The groups shown, in order, each with its shown sections; a group with none is left out. */
export const visibleGroups = (
	shown: OptionalSections
): Array<SettingsNavGroup> =>
	SETTINGS_GROUPS.map((entry) => ({
		group: entry.group,
		sections: entry.sections.filter((section) => isShown(section, shown)),
	})).filter((entry) => entry.sections.length > 0);

/** The section whose panel shows: the asked-for one when shown, otherwise General. */
export const selectedSection = (
	groups: ReadonlyArray<SettingsNavGroup>,
	section: SettingsSection | undefined
): SettingsSection =>
	section !== undefined &&
	groups.some((entry) => entry.sections.includes(section))
		? section
		: "general";
