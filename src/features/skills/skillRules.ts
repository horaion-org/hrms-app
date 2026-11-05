import dayjs from "dayjs";
import type { TFunction } from "i18next";
import type { IsoDate } from "@/components/forms/Calendar";
import type { BadgeTone } from "@/components/ui/Badge";
import type { BulkAssignResult } from "@/features/skills/api";

/** A credential expiring within this many days reads as expiring soon, as the API counts it. */
export const EXPIRING_WINDOW_DAYS = 30;

/**
 * Where a held credential stands on a day: still valid, expiring within
 * the window (with the days left), already expired, or held without the
 * expiry date its skill asks for.
 */
export type ExpiryStatus =
	| { kind: "VALID" }
	| { kind: "EXPIRING"; daysLeft: number }
	| { kind: "EXPIRED" }
	| { kind: "MISSING" };

const ISO_DATE = "YYYY-MM-DD";

/**
 * Where a holding stands on `today`; undefined for a skill that does not
 * track expiry. `expiresOn` is the last day it is valid, so it expires the
 * day after.
 */
export const expiryStatusOn = (
	holding: { tracksExpiry: boolean; expiresOn: string | null },
	today: IsoDate
): ExpiryStatus | undefined => {
	if (!holding.tracksExpiry) return undefined;
	if (!holding.expiresOn) return { kind: "MISSING" };
	const daysLeft = dayjs(holding.expiresOn).diff(dayjs(today), "day");
	if (daysLeft < 0) return { kind: "EXPIRED" };
	if (daysLeft <= EXPIRING_WINDOW_DAYS) return { kind: "EXPIRING", daysLeft };
	return { kind: "VALID" };
};

/** How an expiry status reads as a Badge. */
export const expiryBadge = (
	status: ExpiryStatus,
	t: TFunction
): { tone: BadgeTone; label: string } => {
	const key = "people.skills.expiry";
	switch (status.kind) {
		case "VALID":
			return { tone: "success", label: t(`${key}.valid`) };
		case "EXPIRING":
			return {
				tone: "warning",
				label: t(`${key}.expiring`, { count: status.daysLeft }),
			};
		case "EXPIRED":
			return { tone: "error", label: t(`${key}.expired`) };
		case "MISSING":
			return { tone: "error", label: t(`${key}.missing`) };
		default: {
			const exhaustive: never = status;
			return exhaustive;
		}
	}
};

/**
 * The last day a credential issued on `issuedOn` stays valid for `months`
 * months: the day before the same date that many months later.
 */
export const prefillExpiry = (issuedOn: IsoDate, months: number): IsoDate =>
	dayjs(issuedOn).add(months, "month").subtract(1, "day").format(ISO_DATE);

/**
 * A person's skills best first: highest proficiency, then unrated skills
 * (held, such as a licence), each in name order.
 */
export const sortHeldSkills = <
	T extends { name: string; proficiency: number | null },
>(
	skills: ReadonlyArray<T>
): Array<T> =>
	[...skills].sort((a, b) => {
		const rank = (b.proficiency ?? 0) - (a.proficiency ?? 0);
		return rank !== 0
			? rank
			: a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
	});

/**
 * What a bulk assignment did, in one sentence of the parts that happened,
 * e.g. "Assigned to 9 people, updated 1, skipped 2 who already had it."
 */
export const bulkAssignSummary = (
	{ assigned, updated, skipped, full }: BulkAssignResult,
	t: TFunction
): string => {
	const key = "organisation.skills.assign.result";
	const parts = [
		t(`${key}.assigned`, { count: assigned }),
		...(updated > 0 ? [t(`${key}.updated`, { count: updated })] : []),
		...(skipped > 0 ? [t(`${key}.skipped`, { count: skipped })] : []),
		...(full > 0 ? [t(`${key}.full`, { count: full })] : []),
	];
	return t(`${key}.sentence`, { parts: parts.join(t(`${key}.separator`)) });
};
