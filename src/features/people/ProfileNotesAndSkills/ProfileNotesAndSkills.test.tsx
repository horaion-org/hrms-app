import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import { authTestI18n } from "@/features/auth/testingI18n";
import type { MemberProfileDetail } from "@/features/people/api";
import { ProfileNotesAndSkills } from "@/features/people/ProfileNotesAndSkills";
import { storyCompany } from "@/features/people/storyCompany";

const PROFILE = "/api/v1/companies/c-1/member-profiles/m-1";
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
		[`GET ${PROFILE}/notes`]: {
			status: 200,
			body: envelope({ content: [], page: { totalElements: 0 } }),
		},
		[`GET ${PROFILE}/skills`]: { status: 200, body: envelope([]) },
	});
});
afterEach(() => {
	resetApiClient();
	vi.unstubAllGlobals();
});

const show = (permissions: Array<string>): void => {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	render(
		<I18nextProvider i18n={authTestI18n}>
			<QueryClientProvider client={client}>
				{storyCompany(client, "c-1")(
					() => (
						<ProfileNotesAndSkills
							companyId="c-1"
							noteActions="menu"
							profile={kent}
							skillsChangeable={false}
						/>
					),
					{ parameters: { permissions } } as never
				)}
			</QueryClientProvider>
		</I18nextProvider>
	);
};
const headings = (): Array<string | null> =>
	screen
		.getAllByRole("heading", { level: 2 })
		.map((heading) => heading.textContent);

describe("ProfileNotesAndSkills", () => {
	it("puts the notes beside the skills for someone who may read notes", async () => {
		show(["member_note:read"]);

		await screen.findByRole("region", { name: "Notes (0)" });
		await screen.findByRole("region", { name: "Skills & proficiency (0)" });
		expect(headings()).toEqual(["Notes (0)", "Skills & proficiency (0)"]);
	});

	it("shows only the skills otherwise", async () => {
		show([]);

		await screen.findByRole("region", { name: "Skills & proficiency (0)" });
		expect(headings()).toEqual(["Skills & proficiency (0)"]);
	});
});
