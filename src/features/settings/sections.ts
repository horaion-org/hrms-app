import {
	SUBJECT_SLUGS,
	type ApprovalSubjectSlug,
} from "@/features/approvals/approvalSubjects";

/**
 * Settings' sections, in tab order; `employment`, `scheduling`, `leave`,
 * `approvals`, `access` and `data` are offered only to people who may use them.
 */
export const SETTINGS_SECTIONS = [
	"general",
	"notifications",
	"employment",
	"scheduling",
	"leave",
	"approvals",
	"access",
	"plan",
	"data",
] as const;

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

/**
 * The section in the URL; General, the first, is left out. `terms` opens
 * one employment terms in Settings › Employment (a deep link from a profile);
 * `subject` brings one subject's group of Settings › Approvals into view
 * (a deep link from an approval that needs its flow fixed).
 */
export type SettingsSearch = {
	section?: SettingsSection;
	terms?: string;
	subject?: ApprovalSubjectSlug;
};

const isSubjectSlug = (value: unknown): value is ApprovalSubjectSlug =>
	(Object.values(SUBJECT_SLUGS) as ReadonlyArray<unknown>).includes(value);

const isSettingsSection = (value: unknown): value is SettingsSection =>
	(SETTINGS_SECTIONS as ReadonlyArray<unknown>).includes(value);

/**
 * Reads `?section=` (an unknown section, or General, is no section) and,
 * with Employment, `terms`; with Approvals, a known `subject`.
 */
export const parseSettingsSearch = (
	search: Record<string, unknown>
): SettingsSearch => {
	const section = search["section"];
	if (!isSettingsSection(section) || section === "general") return {};
	const terms = search["terms"];
	if (section === "employment" && typeof terms === "string" && terms !== "")
		return { section, terms };
	const subject = search["subject"];
	if (section === "approvals" && isSubjectSlug(subject))
		return { section, subject };
	return { section };
};

/** The search that opens a section, keeping General's address bare. */
export const searchForSection = (section: SettingsSection): SettingsSearch =>
	section === "general" ? {} : { section };

/** Which of the sections offered only to some people to show. */
export type OptionalSections = {
	employment: boolean;
	scheduling: boolean;
	leave: boolean;
	approvals: boolean;
	access: boolean;
	data: boolean;
};

/** The sections shown, in order: Employment, Scheduling, Leave, Approvals, Access roles and Data only when offered. */
export const visibleSections = (
	shown: OptionalSections
): Array<SettingsSection> =>
	SETTINGS_SECTIONS.filter(
		(section) =>
			(section !== "employment" || shown.employment) &&
			(section !== "scheduling" || shown.scheduling) &&
			(section !== "leave" || shown.leave) &&
			(section !== "approvals" || shown.approvals) &&
			(section !== "access" || shown.access) &&
			(section !== "data" || shown.data)
	);

/** The tab to select: the asked-for section when shown, otherwise General. */
export const selectedSectionIndex = (
	visible: ReadonlyArray<SettingsSection>,
	section: SettingsSection | undefined
): number => Math.max(0, visible.indexOf(section ?? "general"));
