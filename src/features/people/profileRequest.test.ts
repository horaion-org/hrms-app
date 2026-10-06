import { describe, expect, it } from "vitest";
import { EMPTY_PROFILE } from "@/features/people/profileFormSchema";
import { profileRequest } from "@/features/people/profileRequest";

describe("profile request", () => {
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
