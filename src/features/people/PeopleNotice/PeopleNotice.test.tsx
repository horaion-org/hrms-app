import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import { PeopleNotice } from "@/features/people/PeopleNotice";
import type { PeopleNotice as Notice } from "@/features/people/peopleNoticeState";

const show = (notice: Notice): HTMLElement => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<PeopleNotice notice={notice} />
		</I18nextProvider>
	);
	return screen.getByRole("status");
};

describe("PeopleNotice", () => {
	it.each([
		[
			"added",
			false,
			"Priya Nair was added. We’ve emailed them an invitation to log in.",
		],
		[
			"added",
			true,
			"Priya Nair was added, but their system role wasn’t assigned. Assign it from Organisation, under System roles.",
		],
		["saved", false, "Changes to Priya Nair were saved."],
		[
			"saved",
			true,
			"Changes to Priya Nair were saved, but their system role wasn’t changed. Change it from Organisation, under System roles.",
		],
		[
			"deactivated",
			false,
			"Priya Nair was deactivated and can no longer log in.",
		],
		["reactivated", false, "Priya Nair was reactivated and can log in again."],
		["invited", false, "We’ve emailed Priya Nair a new invitation to log in."],
	] as const)(
		"confirms %s (role not changed: %s)",
		(kind, roleNotAssigned, text) => {
			const line = show({ kind, name: "Priya Nair", roleNotAssigned });

			expect(line).toHaveTextContent(text);
			if (roleNotAssigned) expect(line).toHaveAttribute("data-warning");
			else expect(line).not.toHaveAttribute("data-warning");
		}
	);

	it.each([
		[
			false,
			"Changes to Priya Nair were saved, but their skills weren’t. Edit their profile to try again.",
		],
		[
			true,
			"Changes to Priya Nair were saved, but their system role and skills weren’t. Change the role from Organisation, under System roles, and edit their profile to try the skills again.",
		],
	])(
		"warns when the skills weren't saved (role not changed: %s)",
		(roleNotAssigned, text) => {
			const line = show({
				kind: "saved",
				name: "Priya Nair",
				roleNotAssigned,
				skillsNotSaved: true,
			});

			expect(line).toHaveTextContent(text);
			expect(line).toHaveAttribute("data-warning");
		}
	);
});
