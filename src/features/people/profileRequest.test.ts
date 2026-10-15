import { describe, expect, it } from "vitest";
import type { MemberProfileDetail } from "@/features/people/api";
import { EMPTY_PROFILE } from "@/features/people/profileFormSchema";
import {
	profileEditValues,
	profileRequest,
	profileUpdateRequest,
} from "@/features/people/profileRequest";

describe("profile request", () => {
	it("does not send a stale job title when no department is selected", () => {
		expect(
			profileRequest({
				...EMPTY_PROFILE,
				displayName: "Priya Nair",
				email: "priya@company.com",
				jobTitleId: "j-1",
			})
		).toStrictEqual({ displayName: "Priya Nair", email: "priya@company.com" });
	});
	it("leaves out every optional field left empty, and the department and role", () => {
		expect(
			profileRequest({
				...EMPTY_PROFILE,
				displayName: " Priya Nair ",
				email: " priya@company.com ",
				departmentId: "d-1",
			})
		).toStrictEqual({ displayName: "Priya Nair", email: "priya@company.com" });
	});

	it("sends every field filled in, the manager by membership", () => {
		expect(
			profileRequest({
				displayName: "Priya Nair",
				dateOfBirth: "1990-03-22",
				phone: "+6581234567",
				email: "priya@company.com",
				employmentType: "PART_TIME",
				hireDate: "2026-10-01",
				probationEndDate: "2027-01-01",
				jobTitleId: "j-1",
				departmentId: "d-1",
				reportsTo: {
					membershipId: "m-9",
					displayName: "Marcus Lim",
					status: "ACTIVE",
				},
				accessRoleId: "r-1",
			})
		).toStrictEqual({
			displayName: "Priya Nair",
			email: "priya@company.com",
			jobTitleId: "j-1",
			reportsToMembershipId: "m-9",
			dateOfBirth: "1990-03-22",
			phone: "+6581234567",
			employmentType: "PART_TIME",
			hireDate: "2026-10-01",
			probationEndDate: "2027-01-01",
		});
	});
});

const kent: MemberProfileDetail = {
	membershipId: "m-1",
	employeeCode: "EMP-10392",
	displayName: "Kent Chua",
	email: "kent.chua@company.com",
	phone: "+6583247931",
	branchId: "b-1",
	branchName: "Orchard",
	departmentId: "d-1",
	departmentName: "Food & Beverage",
	jobTitleId: "j-1",
	jobTitleName: "Pastry chef",
	status: "ACTIVE",
	dateOfBirth: "1987-03-22",
	employmentType: "FULL_TIME",
	hireDate: "2024-01-15",
	probationEndDate: null,
	endDate: null,
	reportsTo: { membershipId: "m-9", displayName: "Faris Ahmad" },
	invitationPending: false,
};

describe("profile update request", () => {
	it("sends no department or dependent job title when the department is cleared", () => {
		expect(
			profileUpdateRequest({
				...profileEditValues(kent),
				departmentId: "",
			})
		).toMatchObject({ departmentId: null, jobTitleId: null });
	});

	it("starts the form from the saved profile, empties as empty", () => {
		expect(profileEditValues(kent, "r-1")).toStrictEqual({
			displayName: "Kent Chua",
			dateOfBirth: "1987-03-22",
			phone: "+6583247931",
			email: "kent.chua@company.com",
			employmentType: "FULL_TIME",
			hireDate: "2024-01-15",
			probationEndDate: "",
			jobTitleId: "j-1",
			departmentId: "d-1",
			reportsTo: {
				membershipId: "m-9",
				displayName: "Faris Ahmad",
				status: "ACTIVE",
			},
			accessRoleId: "r-1",
			status: "ACTIVE",
		});
	});

	it("sends every field, an empty one as null, and never the employee ID or role", () => {
		expect(
			profileUpdateRequest({
				...profileEditValues(kent),
				displayName: " Kent Chua ",
				probationEndDate: "",
				reportsTo: null,
				status: "INACTIVE",
			})
		).toStrictEqual({
			displayName: "Kent Chua",
			email: "kent.chua@company.com",
			status: "INACTIVE",
			departmentId: "d-1",
			jobTitleId: "j-1",
			reportsToMembershipId: null,
			dateOfBirth: "1987-03-22",
			phone: "+6583247931",
			employmentType: "FULL_TIME",
			hireDate: "2024-01-15",
			probationEndDate: null,
		});
	});
});
