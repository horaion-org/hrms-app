/** Settings' sections, in tab order; `data` is offered only to people who may use one of its items. */
export const SETTINGS_SECTIONS = [
	"general",
	"notifications",
	"scheduling",
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

/** The sections shown, in order: Data only when one of its items is offered. */
export const visibleSections = (showData: boolean): Array<SettingsSection> =>
	SETTINGS_SECTIONS.filter((section) => section !== "data" || showData);

/** The tab to select: the asked-for section when shown, otherwise General. */
export const selectedSectionIndex = (
	visible: ReadonlyArray<SettingsSection>,
	section: SettingsSection | undefined
): number => Math.max(0, visible.indexOf(section ?? "general"));
