import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { placeLabels } from "@/features/organisation/accessSummary";
import { defaultAccessAssignments } from "@/features/organisation/defaultAccess";
import {
	defaultAccessRecipientQuery,
	defaultAccessRulesQuery,
} from "@/features/organisation/useDefaultAccess";
import { useAccessRoles } from "@/features/organisation/useOrganisationList";
import type { MemberProfile } from "@/features/people/api";
import type { MemberDefaultAccess } from "@/features/people/memberRoles";
import { workspaceQuery } from "@/features/workspace/api";
import { retry } from "@/features/workspace/retry";
import { COMPANY_SCOPE } from "@/features/workspace/scopes";
import { useAccess } from "@/features/workspace/useAccess";

/** The same list `useMemberRoles` reads, so both share one request. */
const BY_NAME = { sort: { field: "name", desc: false } } as const;

/**
 * The default access that reaches a person (API ADR-0118), as assignments
 * for their Access card, at their own Department or Branch and named for
 * where each was set. Undefined while it loads, when they don't receive
 * default access, or when the reader can't read access roles at the whole
 * company (the API answers only then).
 */
export const useMemberDefaultAccess = (
	companyId: string,
	profile: Pick<MemberProfile, "membershipId" | "branchId" | "departmentId">
): MemberDefaultAccess | undefined => {
	const { t } = useTranslation();
	const allowed = useAccess().can("access_role:read", COMPANY_SCOPE);
	const rules = useQuery(defaultAccessRulesQuery(companyId, allowed));
	const recipient = useQuery(
		defaultAccessRecipientQuery(companyId, profile.membershipId, allowed)
	);
	const roles = useAccessRoles(companyId, BY_NAME);
	const { data: workspace } = useQuery({ ...workspaceQuery, retry });

	if (
		!rules.data ||
		recipient.data?.receivesDefaultAccess !== true ||
		roles.status !== "ready"
	)
		return undefined;
	return defaultAccessAssignments(
		rules.data,
		{ branchId: profile.branchId, departmentId: profile.departmentId },
		roles.items,
		placeLabels(workspace, companyId, t),
		t
	);
};
