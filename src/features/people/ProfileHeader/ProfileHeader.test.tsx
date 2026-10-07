import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	ProfileHeader,
	type ProfileHeaderProps,
} from "@/features/people/ProfileHeader";

const kent: ProfileHeaderProps["profile"] = {
	displayName: "Kent Chua",
	employeeCode: "EMP-10392",
	jobTitleName: "Pastry chef",
	status: "ACTIVE",
	invitationPending: false,
};

const show = (
	props: Partial<ProfileHeaderProps["profile"]> = {},
	actions?: string
): void => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<ProfileHeader
				actions={actions && <button type="button">{actions}</button>}
				profile={{ ...kent, ...props }}
			/>
		</I18nextProvider>
	);
};

describe("ProfileHeader", () => {
	it("names the person as the page's heading, with their status, employee ID and job title", () => {
		show({}, "Edit profile");

		expect(
			screen.getByRole("heading", { level: 1, name: "Kent Chua" })
		).toBeVisible();
		expect(screen.getByText("Active")).toHaveClass("bg-success-100");
		expect(screen.getByText("EMP-10392")).toBeVisible();
		expect(screen.getByText("Pastry chef")).toBeVisible();
		expect(screen.getByText("KC")).toBeVisible();
		expect(screen.queryByText("Invited")).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Edit profile" })).toBeVisible();
	});

	it("shows an inactive person with the neutral tone, and a pending invitation", () => {
		show({ status: "INACTIVE", invitationPending: true, jobTitleName: null });

		expect(screen.getByText("Inactive")).toHaveClass("bg-neutral-400");
		expect(screen.getByText("Invited")).toBeVisible();
		expect(screen.queryByText("•")).not.toBeInTheDocument();
	});

	it("keeps the avatar out of the accessible name, since the heading is beside it", () => {
		show();

		expect(screen.queryByRole("img")).not.toBeInTheDocument();
	});
});
