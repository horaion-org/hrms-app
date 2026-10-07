import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, problemReply, stubApi } from "@/common/testing/stubApi";
import { authTestI18n } from "@/features/auth/testingI18n";
import type { MemberProfileDetail, SkillValue } from "@/features/people/api";
import { SkillsCard } from "@/features/people/SkillsCard";
import { storyCompany } from "@/features/people/storyCompany";

const kent = {
	membershipId: "m-1",
	displayName: "Kent Chua",
	branchId: "b-1",
	departmentId: "d-1",
} as MemberProfileDetail;

beforeEach(() => {
	configureApiClient({
		accessToken: () => Promise.resolve("test-pass"),
		renew: () => Promise.resolve({ kind: "expired" }),
		onUnauthenticated: () => {},
	});
	stubApi({
		"GET /api/v1/companies/c-1/member-profiles/m-1/skills": {
			status: 200,
			body: envelope([
				{ skillId: "s-1", name: "Baking", proficiency: 8 },
				{ skillId: "s-2", name: "Food safety", proficiency: 7 },
			]),
		},
	});
});
afterEach(() => {
	resetApiClient();
	vi.unstubAllGlobals();
});

const onChange = vi.fn();
/** Holds the draft as the edit page does. */
const Draft = (): ReactElement => {
	const [skills, setSkills] = useState<Array<SkillValue>>([
		{ name: "Baking", proficiency: 8 },
		{ name: "Food safety", proficiency: 7 },
	]);
	return (
		<SkillsCard
			changeable
			companyId="c-1"
			profile={kent}
			draft={{
				skills,
				onChange: (next) => {
					onChange(next);
					setSkills(next);
				},
				changed: true,
			}}
		/>
	);
};
const show = (Story: () => ReactElement): void => {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	render(
		<I18nextProvider i18n={authTestI18n}>
			<QueryClientProvider client={client}>
				{storyCompany(client, "c-1")(Story, {
					parameters: { permissions: [] },
				} as never)}
			</QueryClientProvider>
		</I18nextProvider>
	);
};

describe("SkillsCard", () => {
	it("shows each skill as a read-only meter, with nothing to change for someone who may not", async () => {
		show(() => (
			<SkillsCard changeable={false} companyId="c-1" profile={kent} />
		));

		const card = await screen.findByRole("region", {
			name: "Skills & proficiency (2)",
		});
		expect(
			within(card).getByRole("table", { name: "Skills & proficiency" })
		).toBeVisible();
		expect(
			within(card)
				.getAllByRole("rowheader")
				.map((cell) => cell.textContent)
		).toEqual(["Baking", "Food safety"]);
		expect(
			within(card).getByRole("img", { name: "Food safety: 7 out of 10" })
		).toBeVisible();
		expect(within(card).queryByRole("button")).toBeNull();
	});

	it("offers to add a skill for someone who may change them", async () => {
		show(() => <SkillsCard changeable companyId="c-1" profile={kent} />);

		const card = await screen.findByRole("region", {
			name: "Skills & proficiency (2)",
		});
		await userEvent.click(
			within(card).getByRole("button", { name: "Add skill" })
		);
		expect(
			await screen.findByRole("dialog", { name: "Add skill" })
		).toBeVisible();
	});

	it("is not drawn when the API refuses the skills", async () => {
		const calls = stubApi({
			"GET /api/v1/companies/c-1/member-profiles/m-1/skills": problemReply(
				403,
				"AUTHORIZATION_DENIED"
			),
		});
		show(() => <SkillsCard changeable companyId="c-1" profile={kent} />);

		await vi.waitFor(() => {
			expect(calls.length).toBeGreaterThan(0);
		});
		await vi.waitFor(() => {
			expect(screen.queryByText("Loading skills…")).toBeNull();
		});
		expect(screen.queryByRole("region")).toBeNull();
	});

	it("changes and removes skills in the draft while editing", async () => {
		show(Draft);

		const slider = await screen.findByRole("slider", {
			name: "Proficiency in Baking",
		});
		expect(slider).toHaveAttribute("aria-valuetext", "8 out of 10");
		fireEvent.change(slider, { target: { value: "3" } });
		await userEvent.click(
			screen.getByRole("button", { name: "Remove Food safety" })
		);

		expect(onChange).toHaveBeenLastCalledWith([
			{ name: "Baking", proficiency: 3 },
		]);
		expect(
			screen.getByRole("region", { name: "Skills & proficiency (1)" })
		).toBeVisible();
		expect(screen.getByText("3/10")).toBeVisible();
	});
});
