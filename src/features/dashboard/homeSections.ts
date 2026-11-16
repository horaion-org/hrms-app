import { APPROVAL_READ_KEYS } from "@/features/dashboard/api";
import type { PermissionKey } from "@/features/workspace/permissionContract.generated";
import {
	LEAVE_READ_KEYS,
	MEMBER_EVENT_READ_KEYS,
	SCHEDULE_READ_KEYS,
} from "@/features/workspace/permissionKeys";

/*
 * Home's sections, by the key a member's saved choice names them with
 * (ADR-0096: the API stores the hidden keys and knows nothing of their
 * meaning). The order is the order Home shows them in.
 */

/** Every section Home can show, top to bottom. */
export const HOME_SECTIONS = [
	"short-shifts",
	"leave-to-decide",
	"waiting-approvals",
	"next-roster",
	"cover-offers",
	"off-today",
	"people-events",
] as const;

export type HomeSection = (typeof HOME_SECTIONS)[number];

/**
 * The grants that bring each section into reach, any one of them anywhere;
 * none means every member has it (their own cover offers).
 */
const SECTION_KEYS: Record<HomeSection, ReadonlyArray<PermissionKey>> = {
	"short-shifts": SCHEDULE_READ_KEYS,
	"leave-to-decide": LEAVE_READ_KEYS,
	"waiting-approvals": APPROVAL_READ_KEYS,
	"next-roster": SCHEDULE_READ_KEYS,
	"cover-offers": [],
	"off-today": [...SCHEDULE_READ_KEYS, ...LEAVE_READ_KEYS],
	"people-events": MEMBER_EVENT_READ_KEYS,
};

/** The sections a person's grants reach, in Home's order: the ones they may choose to hide. */
export const sectionsInReach = (
	canAny: (keys: ReadonlyArray<PermissionKey>) => boolean
): Array<HomeSection> =>
	HOME_SECTIONS.filter(
		(section) =>
			SECTION_KEYS[section].length === 0 || canAny(SECTION_KEYS[section])
	);

/** Whether Home shows a section, given the keys the member hid; an unknown key hides nothing. */
export const isShown = (
	section: HomeSection,
	hiddenSections: ReadonlyArray<string>
): boolean => !hiddenSections.includes(section);

/**
 * The hidden keys after one section is shown or hidden, sorted as the API
 * keeps them. Keys this app does not know are kept, so a choice made in a
 * newer version survives.
 */
export const withSectionShown = (
	hiddenSections: ReadonlyArray<string>,
	section: HomeSection,
	shown: boolean
): Array<string> => {
	const others = hiddenSections.filter((hidden) => hidden !== section);
	return (shown ? others : [...others, section]).sort();
};
