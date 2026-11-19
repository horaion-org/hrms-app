/** The `tab` search value that opens a role on who has it. */
export const PEOPLE_TAB = "people";

/** The `tab` search value of a role's first tab, What it allows; old links still send it. */
export const PERMISSIONS_TAB = "permissions";

/** A role page's search: no `tab` opens What it allows. */
export type RoleTabSearch = {
	tab?: typeof PEOPLE_TAB | typeof PERMISSIONS_TAB;
};
