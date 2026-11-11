import type { TFunction } from "i18next";
import {
	branchScope,
	COMPANY_SCOPE,
	departmentScope,
	type ScopeRef,
} from "@/features/workspace/scopes";

/**
 * A place by id, as assignments name it: a Department, else a Branch, else
 * (neither) the whole company. The API sends a missing id as null.
 */
export type PlaceRef = {
	branchId?: string | null;
	departmentId?: string | null;
};

/** Identifies a place: its Department, else its Branch, else the whole company. */
export const placeKey = (place: PlaceRef): string =>
	place.departmentId ?? place.branchId ?? "";

/** A place in words: the whole company, a Branch, or a Branch and its Department. */
export const placeOf = (
	place: { branchName?: string; departmentName?: string },
	t: TFunction
): string => {
	if (!place.branchName)
		return t("organisation.accessRoles.assignments.wholeCompany");
	if (!place.departmentName) return place.branchName;
	return t("organisation.accessRoles.assignments.department", {
		branch: place.branchName,
		department: place.departmentName,
	});
};

/** The target a place stands for: its Department, else its Branch, else the company. */
export const scopeOfPlace = (place: PlaceRef): ScopeRef => {
	if (place.departmentId) return departmentScope(place.departmentId);
	if (place.branchId) return branchScope(place.branchId);
	return COMPANY_SCOPE;
};
