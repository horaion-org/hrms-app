/**
 * Settings' sections, in tab order; `scheduling`, `leave` and `data` are
 * offered only to people who may use them.
 */
export const SETTINGS_SECTIONS = [
	"general",
	"notifications",
	"scheduling",
	"leave",
	"plan",
	"data",
] as const;

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

/** The section in the URL; General, the first, is left out. */
export type SettingsSearch = { section?: SettingsSection };

const isSettingsSection = (value: unknown): value is SettingsSection =>
	(SETTINGS_SECTIONS as ReadonlyArray<unknown>).includes(value);

/** Reads `?section=`; an unknown section, or General, is no section. */
export const parseSettingsSearch = (
	search: Record<string, unknown>
): SettingsSearch => {
	const section = search["section"];
	return isSettingsSection(section) && section !== "general" ? { section } : {};
};

/** The search that opens a section, keeping General's address bare. */
export const searchForSection = (section: SettingsSection): SettingsSearch =>
	section === "general" ? {} : { section };

/** Which of the sections offered only to some people to show. */
export type OptionalSections = {
	scheduling: boolean;
	leave: boolean;
	data: boolean;
};

/** The sections shown, in order: Scheduling, Leave and Data only when offered. */
export const visibleSections = (
	shown: OptionalSections
): Array<SettingsSection> =>
	SETTINGS_SECTIONS.filter(
		(section) =>
			(section !== "scheduling" || shown.scheduling) &&
			(section !== "leave" || shown.leave) &&
			(section !== "data" || shown.data)
	);

/** The tab to select: the asked-for section when shown, otherwise General. */
export const selectedSectionIndex = (
	visible: ReadonlyArray<SettingsSection>,
	section: SettingsSection | undefined
): number => Math.max(0, visible.indexOf(section ?? "general"));
