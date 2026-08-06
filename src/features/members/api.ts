import { apiRequest } from "@/common/api-client";
import type { Member, MembershipImport } from "@/common/api";

export async function fetchMembers(companyId: string): Promise<Array<Member>> {
	return apiRequest<Array<Member>>(`/api/v1/companies/${companyId}/members`);
}

/**
 * Invites a member. The API creates the Cognito identity with an emailed
 * temporary password, so there is no password to collect here.
 */
export async function inviteMember(
	companyId: string,
	email: string
): Promise<Member> {
	return apiRequest<Member>(`/api/v1/companies/${companyId}/members`, {
		method: "POST",
		body: { email },
	});
}

export async function deactivateMember(
	companyId: string,
	memberId: string
): Promise<void> {
	return apiRequest<void>(
		`/api/v1/companies/${companyId}/members/${memberId}`,
		{ method: "DELETE" }
	);
}

/**
 * Reactivating preserves the member's existing Role Assignments, which is why
 * the API gates it on member:deactivate rather than member:create.
 */
export async function reactivateMember(
	companyId: string,
	memberId: string
): Promise<Member> {
	return apiRequest<Member>(
		`/api/v1/companies/${companyId}/members/${memberId}`,
		{ method: "PUT" }
	);
}

/** Bounded, idempotent bulk creation. Rows naming a known email are skipped. */
export async function importMembers(
	companyId: string,
	file: File
): Promise<MembershipImport> {
	const formData = new FormData();
	formData.append("file", file);

	return apiRequest<MembershipImport>(
		`/api/v1/companies/${companyId}/members/imports`,
		{ method: "POST", formData }
	);
}

export async function grantRole(
	companyId: string,
	memberId: string,
	roleId: string
): Promise<void> {
	return apiRequest<void>(
		`/api/v1/companies/${companyId}/members/${memberId}/role-assignments`,
		{ method: "POST", body: { role_id: roleId } }
	);
}

export async function revokeRole(
	companyId: string,
	memberId: string,
	roleId: string
): Promise<void> {
	return apiRequest<void>(
		`/api/v1/companies/${companyId}/members/${memberId}/role-assignments/${roleId}`,
		{ method: "DELETE" }
	);
}
