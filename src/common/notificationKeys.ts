/**
 * Every notification query's key, shaped like `approvalKeys`. It lives in
 * common, not in `features/notifications`, because leave and approvals
 * invalidate notifications after a decision while notifications imports
 * both: a factory there would make them import each other.
 */
export const notificationKeys = {
	all: (companyId: string) => ["notifications", companyId] as const,
	/** One member's notifications in the company, every audience and page. */
	member: (companyId: string, membershipId: string) =>
		[...notificationKeys.all(companyId), membershipId] as const,
	page: (
		companyId: string,
		membershipId: string,
		audience: string,
		page: number,
		unreadOnly: boolean,
		size: number
	) =>
		[
			...notificationKeys.member(companyId, membershipId),
			audience,
			"page",
			page,
			unreadOnly,
			size,
		] as const,
	count: (companyId: string, membershipId: string, audience: string) =>
		[
			...notificationKeys.member(companyId, membershipId),
			audience,
			"count",
		] as const,
};
