import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { ApiProblemError } from "@/common/problem";
import { envelope, stubApi } from "@/common/testing/stubApi";
import { authTestI18n } from "@/features/auth/testingI18n";
import type { MemberSkill, SkillValue } from "@/features/people/api";
import { SkillDialog } from "@/features/people/SkillDialog";
import {
	heldLicenceFixture,
	heldSkillFixture,
	licenceFixture,
	skillFixture,
} from "@/features/skills/fixtures";

const baking = heldSkillFixture({ skillId: "s-baking", name: "Baking" });
let calls: Array<{ path: string; search: string }> = [];

beforeEach(() => {
	configureApiClient({
		accessToken: () => Promise.resolve("test-pass"),
		renew: () => Promise.resolve({ kind: "expired" }),
		onUnauthenticated: () => {},
	});
	calls = stubApi({
		"GET /api/v1/companies/c-1/skills": {
			status: 200,
			body: envelope({
				content: [
					skillFixture({ skillId: "s-baking", name: "Baking" }),
					skillFixture({ skillId: "s-pastry", name: "Pastry art" }),
					licenceFixture(),
				],
				page: { totalElements: 3 },
			}),
		},
	});
});
afterEach(() => {
	resetApiClient();
	vi.unstubAllGlobals();
});

const show = (
	onSubmit: (skill: SkillValue) => Promise<void>,
	{ editing }: { editing?: MemberSkill } = {}
): void => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<QueryClientProvider client={new QueryClient()}>
				<SkillDialog
					canCreateSkills={false}
					companyId="c-1"
					editing={editing}
					held={[baking, ...(editing ? [editing] : [])]}
					name="Kent Chua"
					onClose={vi.fn()}
					onSubmit={onSubmit}
				/>
			</QueryClientProvider>
		</I18nextProvider>
	);
};
const choose = async (
	user: ReturnType<typeof userEvent.setup>,
	option: string
): Promise<void> => {
	await user.click(screen.getByRole("button", { name: /^Skill/ }));
	await user.click(await screen.findByRole("option", { name: option }));
};

describe("SkillDialog", () => {
	it("offers only active catalogue skills they don't hold", async () => {
		const user = userEvent.setup();
		show(vi.fn());

		await user.click(screen.getByRole("button", { name: /^Skill/ }));
		expect(
			await screen.findByRole("option", { name: "Pastry art" })
		).toBeVisible();
		expect(screen.queryByRole("option", { name: "Baking" })).toBeNull();
		expect(
			new URLSearchParams(
				calls.find((call) => call.path.endsWith("/skills"))?.search
			).get("status")
		).toBe("ACTIVE");
		// The catalogue link needs skill:create and a router (see PersonNotesAndSkills).
		expect(screen.queryByRole("link")).toBeNull();
	});

	it("rates a rated skill and keeps notes", async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn(() => Promise.resolve());
		show(onSubmit);

		await choose(user, "Pastry art");
		fireEvent.change(screen.getByRole("slider", { name: "Proficiency" }), {
			target: { value: "7" },
		});
		await user.type(
			screen.getByRole("textbox", { name: "Notes" }),
			"Trains new starters"
		);
		await user.click(screen.getByRole("button", { name: "Add skill" }));

		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledWith({
				name: "Pastry art",
				proficiency: 7,
				notes: "Trains new starters",
				issuedOn: null,
				expiresOn: null,
			});
		});
		expect(screen.queryByLabelText("Valid until")).toBeNull();
	});

	it("asks a licence for its dates instead of a rating, and needs the expiry", async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn(() => Promise.resolve());
		show(onSubmit);

		await choose(user, "Security Officer Licence");
		expect(screen.queryByRole("slider")).toBeNull();
		await user.click(screen.getByRole("button", { name: "Add skill" }));

		expect(
			await screen.findByText("Enter the last day it is valid.")
		).toBeVisible();
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it("changes a held licence, keeping the skill itself", async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn(() => Promise.resolve());
		show(onSubmit, { editing: heldLicenceFixture() });

		const dialog = screen.getByRole("dialog", { name: "Edit skill" });
		expect(
			within(dialog).getByDisplayValue("Security Officer Licence")
		).toBeDisabled();
		await user.click(within(dialog).getByRole("button", { name: "Save" }));

		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledWith({
				name: "Security Officer Licence",
				proficiency: null,
				notes: null,
				issuedOn: "2026-03-01",
				expiresOn: "2027-02-28",
			});
		});
	});

	it("explains a refusal of the edited holding on its field", async () => {
		const user = userEvent.setup();
		show(
			() =>
				Promise.reject(
					new ApiProblemError({
						message: "API says no",
						status: 400,
						errorCode: "MEMBER_SKILL_DATES_INVALID",
						fieldErrors: [{ field: "skills[1].expiresOn", message: "no" }],
						reason: "http",
					})
				),
			{ editing: heldLicenceFixture() }
		);

		await user.click(screen.getByRole("button", { name: "Save" }));

		expect(
			await screen.findByText("It can’t stop being valid before it was issued.")
		).toBeVisible();
	});
});
