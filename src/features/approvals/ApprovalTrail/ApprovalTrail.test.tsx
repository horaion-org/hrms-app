import { render, screen, within } from "@testing-library/react";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { ApprovalTrail } from "@/features/approvals/ApprovalTrail";
import {
	AHMAD,
	approvalInstanceFixture,
	atStepTwoFixture,
	carriedForwardFixture,
	endorseStep,
	publishStep,
	rejectedAtEndorseFixture,
	SITI,
	sitiApproved,
} from "@/features/approvals/fixtures";
import type {
	ApprovalInstance,
	ApprovalParticipant,
} from "@/features/approvals/api";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({
			lng: "en",
			resources: { en: { translation: en } },
			interpolation: { escapeValue: false },
		});
});

const renderTrail = (instance: ApprovalInstance): void => {
	render(
		<ApprovalTrail
			departmentName="Front Office"
			formatMoment={(instant) => `at ${instant.slice(0, 10)}`}
			instance={instance}
		/>
	);
};

/** The trail's steps, first to last; the per-person marks of an "all of them" step are lists of their own. */
const steps = (): [HTMLElement, HTMLElement] => {
	const [first, second] = screen
		.getAllByRole("listitem")
		.filter(
			(item) =>
				item.closest("ol") !== null && item.parentElement?.tagName === "OL"
		);
	if (!first || !second) throw new Error("expected two steps");
	return [first, second];
};

describe("ApprovalTrail", () => {
	it("given_aSubmissionAtStep1_when_rendered_then_saysWhoSubmittedAndWhichStepIsOpen", () => {
		renderTrail(approvalInstanceFixture({ eligibleCount: 3 }));

		expect(
			screen.getByText("Submitted by José Cruz · at 2026-10-09")
		).toBeInTheDocument();
		const [endorse, publish] = steps();
		expect(endorse).toHaveAttribute("aria-current", "step");
		expect(endorse).toHaveTextContent(
			"Step 1 of 2, 1Endorse · Waiting on 3 people"
		);
		// The open step says since when: the submission, for step 1.
		expect(endorse).toHaveTextContent(
			"Anyone who can publish Front Office · since at 2026-10-09"
		);
		expect(publish).not.toHaveAttribute("aria-current");
		expect(publish).toHaveTextContent("Not yet");
	});

	it("given_theViewersTurn_when_rendered_then_readsWaitingOnYou", () => {
		renderTrail(atStepTwoFixture({ canDecide: true }));

		const [endorse, publish] = steps();
		expect(endorse).toHaveTextContent("Approved");
		expect(endorse).toHaveTextContent("Siti Rahman · at 2026-10-10");
		expect(
			within(endorse).getByText("Covered by Ahmad on Sat.")
		).toBeInTheDocument();
		expect(within(endorse).getByText("Comment")).toBeInTheDocument();
		expect(publish).toHaveTextContent("Waiting on you");
		expect(publish).toHaveAttribute("aria-current", "step");
	});

	it("given_aRejection_when_rendered_then_quotesTheReasonAndLaterStepsWereNotReached", () => {
		renderTrail(rejectedAtEndorseFixture());

		const [endorse, publish] = steps();
		expect(endorse).toHaveTextContent("Rejected");
		expect(
			within(endorse).getByText("Reason for rejection")
		).toBeInTheDocument();
		expect(endorse).toHaveTextContent("Two nights have no supervisor.");
		expect(publish).toHaveTextContent("Not reached");
		expect(screen.queryByRole("listitem", { current: "step" })).toBeNull();
	});

	it("given_anAllOfThemStep_when_oneApproved_then_countsApprovalsAndListsEachPersonWithAWord", () => {
		renderTrail(
			approvalInstanceFixture({
				steps: [
					endorseStep({
						rule: "MEMBERS",
						quorum: "ALL",
						members: [AHMAD, SITI],
						decisions: [{ ...sitiApproved, comment: null }],
					}),
					publishStep(),
				],
			})
		);

		const [endorse] = steps();
		expect(endorse).toHaveTextContent("Endorse · 1 of 2 approved");
		const people = within(endorse).getAllByRole("listitem");
		expect(people.map((person) => person.textContent)).toEqual([
			"Ahmad Ali · Waiting",
			"Siti Rahman · Approved at 2026-10-10",
		]);
		expect(endorse).toHaveTextContent("Since at 2026-10-09");
	});

	it("given_manyNamedPeople_when_mostWait_then_foldsTheWaitingOnesIntoOneLine", () => {
		const person = (id: string, name: string): ApprovalParticipant => ({
			membershipId: id,
			displayName: name,
		});
		renderTrail(
			approvalInstanceFixture({
				steps: [
					endorseStep({
						rule: "MEMBERS",
						quorum: "ALL",
						members: [
							AHMAD,
							person("m-5", "Lee Tan"),
							person("m-6", "Mia Ong"),
							person("m-7", "Nur Aziz"),
							SITI,
						],
						decisions: [{ ...sitiApproved, comment: null }],
					}),
					publishStep(),
				],
			})
		);

		const people = within(steps()[0]).getAllByRole("listitem");
		expect(people.map((item) => item.textContent)).toEqual([
			"Siti Rahman · Approved at 2026-10-10",
			"Waiting on 4: Ahmad Ali, Lee Tan and 2 more",
		]);
	});

	it("given_theSecondStepOpen_when_rendered_then_itIsOpenSinceStep1WasDecided", () => {
		renderTrail(atStepTwoFixture());

		expect(steps()[1]).toHaveTextContent(
			"Anyone who can publish Front Office · since at 2026-10-10"
		);
	});

	it("given_namedPeopleNotYetAnswered_when_rendered_then_namesThem", () => {
		renderTrail(
			approvalInstanceFixture({
				steps: [
					endorseStep({ rule: "MEMBERS", members: [AHMAD, SITI] }),
					publishStep(),
				],
			})
		);

		expect(steps()[0]).toHaveTextContent("Waiting on 2 people");
		expect(steps()[0]).toHaveTextContent("Ahmad Ali, Siti Rahman");
	});

	it("given_aWithdrawnSubmission_when_rendered_then_saysWhen", () => {
		renderTrail(
			approvalInstanceFixture({
				status: "CANCELLED",
				currentStepOrder: null,
				decidedAt: "2026-10-11T00:00:00Z",
			})
		);

		expect(screen.getByText(/Withdrawn · at 2026-10-11/)).toBeInTheDocument();
		expect(steps()[0]).toHaveTextContent("Not reached");
	});

	it("given_aStepCarriedForward_when_rendered_then_namesWhoApprovedItWithTheNextStep", () => {
		renderTrail(carriedForwardFixture());

		expect(steps()[0]).toHaveTextContent("Endorse · Skipped");
		expect(steps()[0]).toHaveTextContent(
			"Siti Rahman approved this with the next step · at 2026-10-10"
		);
		expect(steps()[0]).not.toHaveTextContent("Anyone who can publish");
		expect(steps()[1]).toHaveTextContent("Publish · Approved");
	});
});
