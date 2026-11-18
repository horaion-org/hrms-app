import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import type { FunctionComponent } from "@/common/types";
import { authTestI18n } from "@/features/auth/testingI18n";
import { usePeopleChoice } from "@/features/scheduling/createSchedule/PeopleChoiceDialog";
import type { DatesPlan } from "@/features/scheduling/dates/api";
import {
	datesPlanFixture,
	datesPlanRedoingFixture,
} from "@/features/scheduling/dates/fixtures";
import type { Schedule } from "@/features/scheduling/schedules/api";
import { scheduleFixture } from "@/features/scheduling/schedules/fixtures";

const KITCHEN = { departmentId: "d-1", name: "Kitchen" };

/** Shows the People line and, as text, what the page would send and why Next would wait. */
const Page = ({
	plan,
	savedDraft,
}: {
	plan: DatesPlan;
	savedDraft?: Schedule;
}): FunctionComponent => {
	const people = usePeopleChoice(KITCHEN, plan, savedDraft);
	return (
		<>
			{people.line}
			<output aria-label="Sent">
				{people.idsToSend?.join(",") ?? "everyone"}
			</output>
			<output aria-label="Problem">{people.problem ?? "none"}</output>
		</>
	);
};

/** Renders the line over `plan`, Kitchen's three people listed. */
const show = (plan = datesPlanFixture(), savedDraft?: Schedule): void => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<Page plan={plan} savedDraft={savedDraft} />
		</I18nextProvider>
	);
};

/** Opens Choose people, unticks Casey and applies: two of three chosen. */
const chooseTwoOfThree = async (): Promise<void> => {
	const user = userEvent.setup();
	await user.click(screen.getByRole("button", { name: "Choose people" }));
	await user.click(
		screen.getByRole("checkbox", { name: "Select Casey Example" })
	);
	await user.click(screen.getByRole("button", { name: "Use these people" }));
};

describe("usePeopleChoice", () => {
	it("given_nothingChosen_when_shown_then_everyoneAndNothingSent", () => {
		show();

		expect(
			screen.getByText("Everyone in Kitchen, 3 people")
		).toBeInTheDocument();
		expect(screen.getByRole("status", { name: "Sent" })).toHaveTextContent(
			"everyone"
		);
	});

	it("given_twoOfThreeChosen_when_applied_then_theLineCountsThemAndTheirIdsAreSent", async () => {
		show();

		await chooseTwoOfThree();

		expect(screen.getByText("2 of 3 people")).toBeInTheDocument();
		expect(screen.getByRole("status", { name: "Sent" })).toHaveTextContent(
			"m-1,m-2"
		);
	});

	it("given_peopleChosenOverScheduledDays_when_applied_then_nextWaitsWithTheReason", async () => {
		show(datesPlanRedoingFixture());

		await chooseTwoOfThree();

		expect(screen.getByRole("status", { name: "Problem" })).toHaveTextContent(
			"daysTaken"
		);
		expect(screen.getByRole("alert")).toHaveTextContent(
			"These days already have a schedule. Choose days with no schedule, or roster everyone."
		);
	});

	it("given_aSavedFirstDraft_when_shown_then_itsPeopleAreShownAndCannotBeChanged", () => {
		show(datesPlanFixture(), scheduleFixture({ memberProfileIds: ["m-2"] }));

		expect(screen.getByText("1 of 3 people")).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Choose people" })).toBeNull();
		expect(screen.getByRole("status", { name: "Sent" })).toHaveTextContent(
			"m-2"
		);
	});

	it("given_aPlanFromAnOlderApi_when_shown_then_noPeopleLine", () => {
		show(datesPlanFixture({ people: [] }));

		expect(screen.queryByRole("button", { name: "Choose people" })).toBeNull();
		expect(screen.queryByText(/people$/)).toBeNull();
	});
});
