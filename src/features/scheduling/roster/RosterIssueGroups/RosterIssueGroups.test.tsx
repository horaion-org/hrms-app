import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { rosterIssuesFixture } from "@/features/scheduling/roster/rosterIssueFixtures";
import { RosterIssueGroups } from "@/features/scheduling/roster/RosterIssueGroups";

const copy = en.scheduling.issues;

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

describe("RosterIssueGroups", () => {
	it("heads the list with each group's count", () => {
		render(
			<RosterIssueGroups
				issues={rosterIssuesFixture()}
				onFindCover={vi.fn()}
				onShow={vi.fn()}
			/>
		);

		expect(screen.getByText("2 to fix")).toBeInTheDocument();
		expect(screen.getByText("1 could not be met")).toBeInTheDocument();
		expect(screen.getByText("1 for information")).toBeInTheDocument();
	});

	it("folds a group with a real button, leaving a gist of who it names", async () => {
		render(
			<RosterIssueGroups
				issues={rosterIssuesFixture()}
				onFindCover={vi.fn()}
				onShow={vi.fn()}
			/>
		);
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

	it("keeps More information closed until its header is clicked", async () => {
		const issues = rosterIssuesFixture();
		const textOf = (group: string): string => {
			const issue = issues.find((each) => each.group === group);
			if (!issue) throw new Error(`fixture has a ${group} item`);
			return issue.rule;
		};
		render(
			<RosterIssueGroups
				issues={issues}
				onFindCover={vi.fn()}
				onShow={vi.fn()}
			/>
		);

		expect(screen.getByText(textOf("mustFix"))).toBeVisible();
		expect(screen.getByText(textOf("notMet"))).toBeVisible();
		expect(screen.getByText(textOf("forInformation"))).not.toBeVisible();

		await userEvent.click(
			screen.getByRole("button", { name: `${copy.groups.forInformation}, 1` })
		);

		expect(screen.getByText(textOf("forInformation"))).toBeVisible();
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

	it("says nothing is wrong when there are no issues", () => {
		render(
			<RosterIssueGroups issues={[]} onFindCover={vi.fn()} onShow={vi.fn()} />
		);

		expect(screen.getByText(copy.nothingWrong)).toBeInTheDocument();
	});
});
