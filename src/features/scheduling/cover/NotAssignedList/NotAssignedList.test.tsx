import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import type { NotAssignedPerson } from "@/features/scheduling/cover/engineRepairApi";
import { NOT_ASSIGNED_FIXTURE } from "@/features/scheduling/cover/engineRepairFixtures";
import { NotAssignedList } from "@/features/scheduling/cover/NotAssignedList";

const show = (people: Array<NotAssignedPerson> | null): void => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<NotAssignedList people={people} />
		</I18nextProvider>
	);
};

describe("NotAssignedList", () => {
	it("given_peopleNotAssigned_when_shown_then_listsWhoCouldTakeItFirstWithEachReason", () => {
		show(NOT_ASSIGNED_FIXTURE);

		const list = screen.getByRole("region", {
			name: "Why nobody was assigned",
		});
		expect(list).toHaveTextContent(
			"Farid AzizCould take this shift" +
				"Dana LimOn leave that day." +
				"Ella TanWould break: Rest between shifts"
		);
	});

	it("given_nobodyElseHoldsTheJobTitle_when_shown_then_saysSo", () => {
		show([]);

		expect(
			screen.getByText("Nobody else holds this shift’s job title.")
		).toBeVisible();
	});

	it("given_theEngineCouldNotWorkItOut_when_shown_then_showsNothing", () => {
		show(null);

		expect(screen.queryByRole("region")).not.toBeInTheDocument();
	});
});
