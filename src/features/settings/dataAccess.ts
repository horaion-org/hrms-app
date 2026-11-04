import type { Access } from "@/features/workspace/useAccess";
import { COMPANY_SCOPE } from "@/features/workspace/scopes";

/** Which Settings › Data items the person is offered; each has its own key. */
export type DataItems = {
	/** Creating branches needs `branch:create` company-wide, as the API checks. */
	importOrganisation: boolean;
	importPeople: boolean;
	exportPeople: boolean;
	/** The history lists imports, so it needs one of the import keys (the API's list routes do). */
	importHistory: boolean;
};

export const dataItemsFor = (
	access: Pick<Access, "can" | "canAnywhere">
): DataItems => {
	const importOrganisation = access.can("branch:create", COMPANY_SCOPE);
	const importPeople = access.canAnywhere("member_profile:create");
	return {
		importOrganisation,
		importPeople,
		exportPeople: access.canAnywhere("member_profile:read"),
		importHistory: importOrganisation || importPeople,
	};
};

/** Whether the Data section has anything to offer at all. */
export const offersData = (items: DataItems): boolean =>
	Object.values(items).some(Boolean);
