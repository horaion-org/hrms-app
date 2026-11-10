import { render, screen, within } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import type { PlaceAccessText } from "@/features/accessRoles/accessSummary";
import type { MemberProfileDetail } from "@/features/people/api";
import { ProfileDetails } from "@/features/people/ProfileDetails";

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

const show = (
	profile: MemberProfileDetail,
	systemRoles?: string,
	access?: Array<PlaceAccessText> | string
): void => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<ProfileDetails
				access={access}
				profile={profile}
				systemRoles={systemRoles}
			/>
		</I18nextProvider>
	);
};

/** Each card's rows as "label: value". */
const rows = (card: string): Array<string> =>
	within(screen.getByRole("region", { name: card }))
		.getAllByRole("term")
		.map(
			(term) => `${term.textContent}: ${term.nextElementSibling?.textContent}`
		);

describe("ProfileDetails", () => {
	it("shows every field in its card, dates day first and set values in words", () => {
		show(kent, "Supervisor");

		expect(rows("Personal information")).toEqual([
			"Full name: Kent Chua",
			"Date of birth: 22 Mar 1987",
			"Employee ID: EMP-10392",
		]);
		expect(rows("Contact information")).toEqual([
			"Phone number: +6583247931",
			"Email address: kent.chua@company.com",
		]);
		expect(rows("Employment information")).toEqual([
			"Employment type: Full-time",
			"Hire date: 15 Jan 2024",
			"Probation end date: —",
			"Employment status: Active",
		]);
		expect(rows("Department & role information")).toEqual([
			"Job title: Pastry chef",
			"Department: Food & Beverage",
			"Manager: Faris Ahmad",
			"Access role: Supervisor",
		]);
	});

	it("calls the phone number and writes to the email address when tapped", () => {
		show(kent);

		expect(screen.getByRole("link", { name: "+6583247931" })).toHaveAttribute(
			"href",
			"tel:+6583247931"
		);
		expect(
			screen.getByRole("link", { name: "kent.chua@company.com" })
		).toHaveAttribute("href", "mailto:kent.chua@company.com");
	});

	it("offers to copy the phone number and email address", () => {
		show(kent);

		expect(
			screen.getByRole("button", { name: "Copy phone number" })
		).toBeVisible();
		expect(
			screen.getByRole("button", { name: "Copy email address" })
		).toBeVisible();
	});

	it("reads anything not set as a dash, and leaves out the access role when not given", () => {
		show({
			...kent,
			phone: null,
			dateOfBirth: null,
			employmentType: null,
			hireDate: null,
			jobTitleName: null,
			departmentName: null,
			reportsTo: null,
			status: "INACTIVE",
		});

		expect(rows("Personal information")[1]).toBe("Date of birth: —");
		expect(rows("Contact information")[0]).toBe("Phone number: —");
		expect(rows("Employment information")).toEqual([
			"Employment type: —",
			"Hire date: —",
			"Probation end date: —",
			"Employment status: Inactive",
		]);
		expect(rows("Department & role information")).toEqual([
			"Job title: —",
			"Department: —",
			"Manager: —",
		]);
		expect(
			screen.queryByRole("button", { name: "Copy phone number" })
		).not.toBeInTheDocument();
		expect(screen.queryByRole("link", { name: /^\+/ })).not.toBeInTheDocument();
	});

	it("shows where their roles give them permissions, one row per place, noting only visible places count", () => {
		show(kent, "Supervisor", [
			{ place: "Whole company", lines: ["Departments: View"] },
			{
				place: "Orchard",
				lines: ["Branches: View", "Leave: View, Approve or reject"],
			},
		]);

		const access = screen.getByRole("region", { name: "Access" });
		expect(access).toHaveTextContent("Only places you can see are shown.");
		expect(
			within(access)
				.getAllByRole("term")
				.map(
					(term) =>
						`${term.textContent}: ${[
							...(term.nextElementSibling?.children ?? []),
						]
							.map((line) => line.textContent)
							.join(" / ")}`
				)
		).toEqual([
			"Whole company: Departments: View",
			"Orchard: Branches: View / Leave: View, Approve or reject",
		]);
	});

	it("says when their roles give nothing at the places the reader can see", () => {
		show(kent, "Supervisor", []);
		expect(screen.getByRole("region", { name: "Access" })).toHaveTextContent(
			"No permissions at the places you can see."
		);
	});

	it("shows why access isn't listed in place of the rows", () => {
		show(kent, "Supervisor", "We couldn’t load their access roles.");
		const access = screen.getByRole("region", { name: "Access" });
		expect(access).toHaveTextContent("We couldn’t load their access roles.");
		expect(within(access).queryByRole("term")).not.toBeInTheDocument();
	});

	it("leaves out the Access card when not given", () => {
		show(kent, "Supervisor");
		expect(
			screen.queryByRole("region", { name: "Access" })
		).not.toBeInTheDocument();
	});
});
