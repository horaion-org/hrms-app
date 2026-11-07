/** The Leave page's search for a day's request. */
export type LeaveLinkSearch = {
	requestId: string;
	memberId?: string;
	view?: "requests";
};

/**
 * Where a day's leave request opens: the viewer's own in My leave, anyone
 * else's as the reviewer sees it in Team requests, read by that member's id.
 * A member who no longer resolves has no request to open.
 */
export const leaveLinkSearch = (
	requestId: string,
	membershipId: string | null,
	viewerMembershipId: string | undefined
): LeaveLinkSearch | undefined => {
	if (membershipId === null) return undefined;
	if (membershipId === viewerMembershipId) return { requestId };
	return { requestId, memberId: membershipId, view: "requests" };
};
