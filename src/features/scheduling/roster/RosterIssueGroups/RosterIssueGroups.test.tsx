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

	it("folds a group with a real button, leaving a count of what it holds by kind", async () => {
		render(<RosterIssueGroups issues={rosterIssuesFixture()} />);

		const fold = screen.getByRole("button", {
			name: `${copy.groups.notMet}, 1`,
		});
		await userEvent.click(fold);

		expect(fold).toHaveAttribute("aria-expanded", "false");
		expect(fold).toHaveAttribute("aria-controls");
		expect(
			screen.getByText("Asked if possible: 1", { selector: "p" })
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

	it("names every day of a row standing for several, as a run, with one Show", () => {
		render(
			<RosterIssueGroups
				issues={[
					rosterIssueFixture({
						day: "2026-10-12",
						days: ["2026-10-12", "2026-10-13", "2026-10-14"],
					}),
				]}
				onShow={vi.fn()}
			/>
		);

		const row = screen.getByRole("listitem");
		expect(
			within(row).getByText(/^Aisha Rahman · Mon.*12.* – Wed.*14\S*$/)
		).toBeInTheDocument();
		expect(within(row).getAllByRole("button")).toHaveLength(1);
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
		expect(within(row).getByText("Rule: Early front desk")).toHaveClass(
			"text-neutral-700"
		);
		expect(within(row).getAllByRole("button")).toHaveLength(1);
	});

	it("says what to do under a broken rest rule, with the hours its sentence states", () => {
		const issue = rosterIssueFixture({
			rule: "Soren Mbeki: less than 12 hours of rest after the shift on 2026-12-10: 8 hours given. Rule: Rest 12 hours between shifts",
			subject: { kind: "rule", rule: "minimum_rest_between_shifts" },
		});
		render(<RosterIssueGroups issues={[issue]} onShow={vi.fn()} />);

		const row = screen.getByText(issue.rule).closest("li");
		expect(row).toHaveTextContent(
			"What to do: Change one of the two shifts so they are at least 12 hours apart, or give a day off between them."
		);
		// The advice adds a line, not an action: the row keeps its one Show.
		expect(within(row as HTMLElement).getAllByRole("button")).toHaveLength(1);
		expect(
			within(row as HTMLElement).getByRole("button", { name: copy.show })
		).toBeInTheDocument();
	});

	it("adds the neighbouring days when the next shift is in the schedule after this one", () => {
		const issue = rosterIssueFixture({
			rule: "Soren Mbeki: less than 12 hours of rest after the shift on 2026-12-13, before the next shift, which is in the schedule after this one. Rule: Rest between shifts",
			subject: { kind: "rule", rule: "minimum_rest_between_shifts" },
		});
		render(<RosterIssueGroups issues={[issue]} />);

		expect(
			screen.getByText(
				"What to do: Change one of the two shifts so they are at least 12 hours apart, or give a day off between them. You can also change the neighbouring days, in the schedule before or after this one."
			)
		).toBeVisible();
	});

	it("says to press Find cover under a staffing gap, and keeps its Find cover action", () => {
		const gap = rosterIssuesFixture()[0];
		if (!gap) throw new Error("fixture has a gap");
		render(<RosterIssueGroups issues={[gap]} onFindCover={vi.fn()} />);

		const row = screen.getByText(gap.rule).closest("li");
		expect(row).toHaveTextContent(
			"What to do: Press Find cover to see who can take it, or ask the engine for options."
		);
		expect(
			within(row as HTMLElement).getByRole("button", { name: "Find cover" })
		).toBeInTheDocument();
	});

	it("draws no Find cover advice on a roster that offers no Find cover", () => {
		const gap = rosterIssuesFixture()[0];
		if (!gap) throw new Error("fixture has a gap");
		render(<RosterIssueGroups issues={[gap]} />);

		expect(screen.getByText(gap.rule)).toBeVisible();
		expect(screen.queryByRole("button", { name: "Find cover" })).toBeNull();
		expect(screen.queryByText(/What to do:/)).toBeNull();
	});

	it("draws no advice line for an issue with nothing to advise", () => {
		render(
			<RosterIssueGroups
				issues={[
					rosterIssueFixture(),
					rosterIssueFixture({
						key: "unknown",
						subject: { kind: "rule", rule: "a_rule_added_tomorrow" },
					}),
				]}
			/>
		);

		expect(screen.queryByText(/What to do:/)).toBeNull();
	});

	it("orders by person or by day with two small text buttons, the choice pressed", async () => {
		render(<RosterIssueGroups issues={rosterIssuesFixture()} />);

		const byDay = screen.getByRole("button", { name: copy.order.byDay });
		expect(
			screen.getByRole("button", { name: copy.order.byPerson })
		).toHaveAttribute("aria-pressed", "true");
		await userEvent.click(byDay);
		expect(byDay).toHaveAttribute("aria-pressed", "true");
		expect(byDay).toHaveClass("font-medium");
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

	it("draws an item with no day as its name alone, then its reason", () => {
		render(
			<RosterIssueGroups
				issues={[
					rosterIssueFixture({
						who: "Weekends off",
						memberProfileId: null,
						day: null,
						rule: copy.notMetSomewhere,
					}),
				]}
			/>
		);

		const row = screen.getByRole("listitem");
		expect(within(row).getByText("Weekends off")).toHaveClass("font-medium");
		expect(within(row).getByText(copy.notMetSomewhere)).toBeInTheDocument();
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

	it("leads with unvalidated changes in the warning tone, never reading as clean", () => {
		render(
			<IssueSummary
				counts={{ mustFix: 0, notMet: 0, forInformation: 1 }}
				lead="unchecked"
			/>
		);

		expect(screen.getByText(copy.summary.changesUnchecked)).toHaveClass(
			"text-warning-800"
		);
		expect(screen.getByText("1 for information")).toBeInTheDocument();
		expect(screen.queryByText(copy.nothingToFix)).not.toBeInTheDocument();
	});

	it("leads with the check running, in grey, while it runs", () => {
		render(
			<IssueSummary
				counts={{ mustFix: 0, notMet: 0, forInformation: 0 }}
				lead="validating"
			/>
		);

		expect(screen.getByText(en.scheduling.rulesCheck.loading)).toHaveClass(
			"text-neutral-700"
		);
		expect(screen.queryByText(copy.nothingToFix)).not.toBeInTheDocument();
	});
});
