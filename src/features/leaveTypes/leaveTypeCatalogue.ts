import {
	LEAVE_GRANT_KINDS,
	type LeaveGrantKind,
	type LeaveTypeOrderBody,
	type ManagedLeaveType,
	type UpdateLeaveTypeBody,
} from "@/features/leaveTypes/api";
import { reachValueOf, unitReachBody } from "@/features/workspace/unitReach";

/** The catalogue as the Settings page lays it out. */
export type CatalogueSections = {
	/** The scheduler's day off: shown, never changed. */
	system: Array<ManagedLeaveType>;
	/** Each kind's active types in the company's order; a kind with none is left out. */
	groups: Array<{ grantKind: LeaveGrantKind; types: Array<ManagedLeaveType> }>;
	/** Types no longer offered, and any of a kind or status this app does not know. */
	inactive: Array<ManagedLeaveType>;
};

const isKnownKind = (kind: string): kind is LeaveGrantKind =>
	(LEAVE_GRANT_KINDS as ReadonlyArray<string>).includes(kind);

const byDisplayOrder = (
	first: ManagedLeaveType,
	second: ManagedLeaveType
): number =>
	first.displayOrder - second.displayOrder ||
	first.name.localeCompare(second.name);

/** Splits the catalogue into the day off, one group per kind of active types, and the rest. */
export const catalogueSections = (
	types: ReadonlyArray<ManagedLeaveType>
): CatalogueSections => {
	const companyTypes = types.filter((type) => !type.system);
	const isListedActive = (type: ManagedLeaveType): boolean =>
		type.status === "ACTIVE" && isKnownKind(type.grantKind);
	return {
		system: types.filter((type) => type.system),
		groups: LEAVE_GRANT_KINDS.map((grantKind) => ({
			grantKind,
			types: companyTypes
				.filter((type) => isListedActive(type) && type.grantKind === grantKind)
				.sort(byDisplayOrder),
		})).filter((group) => group.types.length > 0),
		inactive: companyTypes
			.filter((type) => !isListedActive(type))
			.sort((first, second) => first.name.localeCompare(second.name)),
	};
};

/**
 * The order to send when one active type moves up or down within its kind:
 * the kind's active types in their new order, then its inactive ones in the
 * order they had, because the API takes the kind's whole set. Null when the
 * type cannot move that way (it is first or last, or not an active type).
 */
export const movedOrder = (
	types: ReadonlyArray<ManagedLeaveType>,
	leaveTypeId: string,
	direction: "up" | "down"
): LeaveTypeOrderBody | null => {
	const moving = types.find((type) => type.leaveTypeId === leaveTypeId);
	if (!moving || moving.system || !isKnownKind(moving.grantKind)) return null;
	const { grantKind } = moving;
	const ofKind = types
		.filter((type) => !type.system && type.grantKind === grantKind)
		.sort(byDisplayOrder);
	const active = ofKind.filter((type) => type.status === "ACTIVE");
	const others = ofKind.filter((type) => type.status !== "ACTIVE");
	const from = active.findIndex((type) => type.leaveTypeId === leaveTypeId);
	const to = direction === "up" ? from - 1 : from + 1;
	if (from < 0 || to < 0 || to >= active.length) return null;
	const activeIds = active.map((type) => type.leaveTypeId);
	activeIds.splice(to, 0, ...activeIds.splice(from, 1));
	return {
		grantKind,
		leaveTypeIds: [...activeIds, ...others.map((type) => type.leaveTypeId)],
	};
};

/**
 * The full replacement that only flips a type between active and inactive. It
 * sends the type's reach and part-day switch back as they are, since the API
 * replaces both.
 */
export const statusToggleBody = (
	type: ManagedLeaveType & { grantKind: LeaveGrantKind }
): UpdateLeaveTypeBody => ({
	name: type.name,
	grantKind: type.grantKind,
	paid: type.paid,
	requiresReason: type.requiresReason,
	allowsPartDays: type.allowsPartDays,
	...unitReachBody(reachValueOf(type)),
	status: type.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
});

/** Narrows a type to one whose kind this app can send back. */
export const hasKnownKind = (
	type: ManagedLeaveType
): type is ManagedLeaveType & { grantKind: LeaveGrantKind } =>
	isKnownKind(type.grantKind);
