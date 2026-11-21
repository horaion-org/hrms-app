import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import type { NotAssignedPerson } from "@/features/scheduling/cover/engineRepairApi";
import { NOT_ASSIGNED_FIXTURE } from "@/features/scheduling/cover/engineRepairFixtures";
import { NotAssignedList } from "@/features/scheduling/cover/NotAssignedList";

const show = (
	people: Array<NotAssignedPerson> | null,
	defaultOpen = false
): void => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<NotAssignedList defaultOpen={defaultOpen} people={people} />
		</I18nextProvider>
	);
};

describe("NotAssignedList", () => {
	it("given_peopleNotAssigned_when_opened_then_listsWhoCouldTakeItFirstWithEachReason", async () => {
		show(NOT_ASSIGNED_FIXTURE);
		const fold = screen.getByRole("button", {
			name: "Why nobody was assigned",
		});
		expect(fold).toHaveAttribute("aria-expanded", "false");
		expect(screen.queryByText("Farid Aziz")).toBeNull();

		await userEvent.click(fold);

		expect(screen.getAllByRole("list")[0]).toHaveTextContent(
			"Farid AzizCould take this shift." +
				"Dana LimOn leave that day." +
				"Ella TanWould break: Rest between shifts"
		);
	});

	it("given_nobodyElseHoldsTheJobTitle_when_opened_then_saysSo", async () => {
		show([]);
		await userEvent.click(
			screen.getByRole("button", { name: "Why nobody was assigned" })
		);

		expect(
			screen.getByText("Nobody else holds this shift’s job title.")
		).toBeVisible();
	});

	it("given_askedToStartOpen_when_shown_then_itsPeopleShowAtOnce", () => {
		show(NOT_ASSIGNED_FIXTURE, true);

		expect(
			screen.getByRole("button", { name: "Why nobody was assigned" })
		).toHaveAttribute("aria-expanded", "true");
		expect(screen.getByText("Dana Lim")).toBeVisible();
	});

	it("given_theEngineCouldNotWorkItOut_when_shown_then_showsNothing", () => {
		show(null);

		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});
});
