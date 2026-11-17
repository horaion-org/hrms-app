import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import {
	rosterIssueFixture,
	rosterIssuesFixture,
} from "@/features/scheduling/roster/rosterIssueFixtures";
import {
	IssueSummary,
	RosterIssueGroups,
} from "@/features/scheduling/roster/RosterIssueGroups";

const copy = en.scheduling.issues;

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

/** The fixture's one item of a group, which each test reads by its text. */
const itemOf = (group: string): ReturnType<typeof rosterIssueFixture> => {
	const issue = rosterIssuesFixture().find((each) => each.group === group);
	if (!issue) throw new Error(`fixture has a ${group} item`);
	return issue;
};

describe("RosterIssueGroups", () => {
	it("heads each group with its title and count", () => {
		render(<RosterIssueGroups issues={rosterIssuesFixture()} />);

		expect(
			screen.getByRole("button", { name: `${copy.groups.mustFix}, 2` })
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: `${copy.groups.notMet}, 1` })
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: `${copy.groups.forInformation}, 1` })
		).toBeInTheDocument();
	});

	it("leaves out a group with nothing in it", () => {
		render(<RosterIssueGroups issues={[rosterIssueFixture()]} />);

		expect(
			screen.queryByRole("button", { name: `${copy.groups.notMet}, 0` })
		).not.toBeInTheDocument();
		expect(screen.getAllByRole("button", { expanded: true })).toHaveLength(1);
	});

	it("folds a group with a real button, leaving a gist of who it names", async () => {
		render(<RosterIssueGroups issues={rosterIssuesFixture()} />);

		const fold = screen.getByRole("button", {
			name: `${copy.groups.notMet}, 1`,
		});
		await userEvent.click(fold);

		expect(fold).toHaveAttribute("aria-expanded", "false");
		expect(fold).toHaveAttribute("aria-controls");
		expect(
			screen.getByText("Ben Ortiz", { selector: "p" })
		).toBeInTheDocument();
	});

	it("keeps More information folded until its header is clicked", async () => {
		render(<RosterIssueGroups issues={rosterIssuesFixture()} />);

		expect(
			screen.getByText(itemOf("mustFix").rule, { exact: false })
		).toBeVisible();
		expect(screen.getByText(itemOf("notMet").rule)).toBeVisible();
		expect(screen.getByText(itemOf("forInformation").rule)).not.toBeVisible();

		await userEvent.click(
			screen.getByRole("button", { name: `${copy.groups.forInformation}, 1` })
		);

		expect(screen.getByText(itemOf("forInformation").rule)).toBeVisible();
	});

	it("draws a row as who and when, then why and what to do, with one action", () => {
		render(
			<RosterIssueGroups
				issues={[rosterIssuesFixture()[0]!]}
				onFindCover={vi.fn()}
				onShow={vi.fn()}
			/>
		);

		const row = screen.getByRole("listitem");
		expect(
			within(row).getByText(
				/^1 Front Desk Staff short · Sat.*17.* · 09:00–15:00$/
			)
		).toHaveClass("font-medium");
		expect(
			within(row).getByText(
				"Not enough people on this shift. Find someone to cover it. Rule: Early front desk"
			)
		).toHaveClass("text-neutral-700");
		expect(within(row).getAllByRole("button")).toHaveLength(1);
	});

	it("finds cover for a shift short and shows the rest", async () => {
		const onFindCover = vi.fn();
		const onShow = vi.fn();
		render(
			<RosterIssueGroups
				issues={rosterIssuesFixture()}
				onFindCover={onFindCover}
				onShow={onShow}
			/>
		);

		await userEvent.click(
			screen.getByRole("button", { name: en.scheduling.cover.findCover })
		);
		await userEvent.click(
			screen.getAllByRole("button", { name: copy.show })[0]!
		);

		expect(onFindCover).toHaveBeenCalledWith({
			shiftId: "front-desk-am",
			day: "2026-10-17",
		});
		expect(onShow).toHaveBeenCalledOnce();
	});

	it("puts the hint of an item with no person and no day after its reason", () => {
		render(
			<RosterIssueGroups
				issues={[
					rosterIssueFixture({
						who: copy.wholeRoster,
						memberProfileId: null,
						day: null,
						rule: "Rule: Weekends off",
						hint: copy.ruleWithoutPlace,
					}),
				]}
			/>
		);

		expect(
			screen.getByText(`Rule: Weekends off ${copy.ruleWithoutPlace}`)
		).toBeInTheDocument();
	});

	it("shows the validation card and no group when there are no issues", () => {
		render(<RosterIssueGroups issues={[]} validationNote={<p>Validated</p>} />);

		expect(screen.getByText("Validated")).toBeInTheDocument();
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});
});

describe("IssueSummary", () => {
	it("counts each group with items in its tone, leaving out the empty ones", () => {
		render(
			<IssueSummary counts={{ mustFix: 6, notMet: 0, forInformation: 3 }} />
		);

		expect(screen.getByText("6 to fix")).toHaveClass("text-error-700");
		expect(screen.getByText("3 for information")).toHaveClass(
			"text-neutral-700"
		);
		expect(screen.queryByText(/could not be met/)).not.toBeInTheDocument();
	});

	it("says there is nothing to fix when every group is empty", () => {
		render(
			<IssueSummary counts={{ mustFix: 0, notMet: 0, forInformation: 0 }} />
		);

		expect(screen.getByText(copy.nothingToFix)).toBeInTheDocument();
	});
});
