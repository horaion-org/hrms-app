import type { TFunction } from "i18next";
import type {
	AccessRole,
	DefaultAccessAppliesTo,
	DefaultAccessRule,
	DefaultAccessRuleBody,
	GiveDefaultAccessResult,
	MemberAccessRoleAssignment,
} from "@/features/organisation/api";
import type {
	AssignmentTarget,
	PlaceRef,
} from "@/features/organisation/assignmentTargets";
import {
	type AssignableScope,
	incompatibleKeys,
} from "@/features/workspace/permissionKeys";
import { COMPANY_SCOPE, type CanAt } from "@/features/workspace/scopes";

const key = "organisation.accessRoles.defaults";

/** Where a person is filed: their Department and its Branch, both null when they have none. */
export type HomePlace = {
	branchId: string | null;
	departmentId: string | null;
};

/** Names a place, as `placeLabels` does; undefined for one the reader can't see. */
type PlaceLabel = (place: PlaceRef) => string | undefined;

/**
 * The defaults that reach a person filed in `home` (API ADR-0118): those
 * set for the whole company, for their Branch and for their Department,
 * which all add up. None without a Department: defaults reach people only
 * through the Department they work in.
 */
export const defaultsReaching = (
	rules: ReadonlyArray<DefaultAccessRule>,
	home: HomePlace
): Array<DefaultAccessRule> =>
	home.departmentId === null
		? []
		: rules.filter(
				(rule) =>
					rule.setAt === "COMPANY" ||
					(rule.setAt === "BRANCH" && rule.branchId === home.branchId) ||
					(rule.setAt === "DEPARTMENT" &&
						rule.departmentId === home.departmentId)
			);

/** The place a default is set for, named; a hidden one reads as such. */
const placeOfRule = (
	rule: DefaultAccessRule,
	placeLabel: PlaceLabel,
	t: TFunction
): string => placeLabel(rule) ?? t(`${key}.hiddenPlace`);

/** Whose people a default covers, in words: "Everyone in the company", "Everyone in Harbour Hotel". */
export const defaultSetFor = (
	rule: DefaultAccessRule,
	placeLabel: PlaceLabel,
	t: TFunction
): string =>
	rule.setAt === "COMPANY"
		? t(`${key}.setFor.COMPANY`)
		: t(`${key}.setFor.unit`, { place: placeOfRule(rule, placeLabel, t) });

/** Where a default was set, as a person's access names it: "company default", "set for Housekeeping". */
const defaultSource = (
	rule: DefaultAccessRule,
	placeLabel: PlaceLabel,
	t: TFunction
): string =>
	rule.setAt === "COMPANY"
		? t(`${key}.source.COMPANY`)
		: t(`${key}.source.unit`, { place: placeOfRule(rule, placeLabel, t) });

/** One default of the list in words: its role, whose people it covers, and where it reaches. */
export type DefaultRuleText = {
	role: string;
	setFor: string;
	appliesTo: string;
};

/** A default for the list; a role the reader's list lacks reads as unknown. */
export const defaultRuleText = (
	rule: DefaultAccessRule,
	roles: ReadonlyArray<AccessRole>,
	placeLabel: PlaceLabel,
	t: TFunction
): DefaultRuleText => ({
	role:
		roles.find((role) => role.accessRoleId === rule.accessRoleId)?.name ??
		t(`${key}.unknownRole`),
	setFor: defaultSetFor(rule, placeLabel, t),
	appliesTo: t(`${key}.appliesTo.${rule.appliesTo}`),
});

/**
 * A person's defaults as assignments, for `accessSummary` beside the roles
 * given by hand: one per default that reaches them, at their own
 * Department or their own Branch. Each comes with a copy of its role named
 * for where it was set, e.g. "Staff (company default)", so the person's
 * Access card says where it came from. A default whose role isn't in
 * `roles` is left out.
 */
export const defaultAccessAssignments = (
	rules: ReadonlyArray<DefaultAccessRule>,
	home: HomePlace,
	roles: ReadonlyArray<AccessRole>,
	placeLabel: PlaceLabel,
	t: TFunction
): {
	assignments: Array<MemberAccessRoleAssignment>;
	roles: Array<AccessRole>;
} => {
	const reaching = defaultsReaching(rules, home).flatMap((rule) => {
		const role = roles.find(
			(candidate) => candidate.accessRoleId === rule.accessRoleId
		);
		return role ? [{ rule, role }] : [];
	});
	return {
		assignments: reaching.map(({ rule }) => ({
			accessRoleAssignmentId: `default:${rule.defaultAccessRuleId}`,
			accessRoleId: `default:${rule.defaultAccessRuleId}`,
			status: "ACTIVE",
			branchId: rule.appliesTo === "OWN_BRANCH" ? home.branchId : null,
			departmentId:
				rule.appliesTo === "OWN_DEPARTMENT" ? home.departmentId : null,
		})),
		roles: reaching.map(({ rule, role }) => ({
			...role,
			accessRoleId: `default:${rule.defaultAccessRuleId}`,
			name: t(`${key}.through`, {
				name: role.name,
				source: defaultSource(rule, placeLabel, t),
			}),
		})),
	};
};

/** The assignment level a reach must suit: a person's own Department, or their own Branch. */
const LEVEL_OF_REACH: Record<DefaultAccessAppliesTo, AssignableScope> = {
	OWN_DEPARTMENT: "DEPARTMENT",
	OWN_BRANCH: "BRANCH",
};

/**
 * Whether a role can be default access reaching `appliesTo`, as the API
 * rules: an active, local, custom role whose every key works at that
 * level. Keys this app doesn't know are left to the API.
 */
export const roleFitsDefault = (
	role: AccessRole,
	appliesTo: DefaultAccessAppliesTo
): boolean =>
	role.status === "ACTIVE" &&
	role.kind === "LOCAL" &&
	!role.protectedRole &&
	incompatibleKeys(role.permissions, LEVEL_OF_REACH[appliesTo]).length === 0;

/**
 * A new default's body for a chosen place: the whole company names no
 * unit, a Branch its id, a Department only its own id (the API resolves
 * it anywhere in the company).
 */
export const defaultAccessBodyOf = (
	accessRoleId: string,
	appliesTo: DefaultAccessAppliesTo,
	place: AssignmentTarget
): DefaultAccessRuleBody => {
	if (place.departmentId)
		return { accessRoleId, appliesTo, departmentId: place.departmentId };
	if (place.branchId)
		return { accessRoleId, appliesTo, branchId: place.branchId };
	return { accessRoleId, appliesTo };
};

/** What giving default access did, in a sentence: "Gave default access to 38 people. 2 already had it." */
export const giveDefaultAccessSummary = (
	{ given, alreadyReceiving }: GiveDefaultAccessResult,
	t: TFunction
): string =>
	[
		t(`${key}.giveDialog.given`, { count: given }),
		...(alreadyReceiving > 0
			? [t(`${key}.giveDialog.alreadyReceiving`, { count: alreadyReceiving })]
			: []),
	].join(" ");

/** How a role's Delete is offered: disabled when it can't succeed, its label naming why when people hold it or a default gives it. */
export type DeleteRoleOffer = {
	disabled: boolean;
	label:
		| "organisation.list.deleteItem"
		| `${typeof key}.usedAsDefaultDeleteItem`
		| "organisation.accessRoles.delete.heldDeleteItem";
};

/** The label naming what keeps a role from being deleted, or plain Delete. */
const deleteLabel = (
	held: boolean,
	givenByDefault: boolean
): DeleteRoleOffer["label"] => {
	if (held) return "organisation.accessRoles.delete.heldDeleteItem";
	if (givenByDefault) return `${key}.usedAsDefaultDeleteItem`;
	return "organisation.list.deleteItem";
};

/**
 * Delete for one role. Only a custom role nobody holds can be deleted, and
 * not while a default still gives it (API ADR-0118): then the item says to
 * remove it from the people who hold it, or from Default access, first,
 * rather than offer a refused delete.
 * `rules` is undefined while the defaults are unread or unreadable; the
 * API's refusal then says the same. Deleting needs `access_role:delete` at
 * the company.
 */
export const deleteRoleOffer = (
	role: Pick<AccessRole, "accessRoleId" | "protectedRole" | "holderCount">,
	rules: ReadonlyArray<DefaultAccessRule> | undefined,
	access: { can: CanAt }
): DeleteRoleOffer => {
	const mayDelete = access.can("access_role:delete", COMPANY_SCOPE);
	const givenByDefault = (rules ?? []).some(
		(rule) => rule.accessRoleId === role.accessRoleId
	);
	const held = role.holderCount > 0;
	return {
		disabled: !mayDelete || role.protectedRole || held || givenByDefault,
		label: deleteLabel(held, givenByDefault),
	};
};
