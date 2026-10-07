import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { ApiProblemError } from "@/common/problem";
import { envelope, stubApi } from "@/common/testing/stubApi";
import { authTestI18n } from "@/features/auth/testingI18n";
import type { SkillValue } from "@/features/people/api";
import { SkillDialog } from "@/features/people/SkillDialog";

beforeEach(() => {
	configureApiClient({
		accessToken: () => Promise.resolve("test-pass"),
		renew: () => Promise.resolve({ kind: "expired" }),
		onUnauthenticated: () => {},
	});
	stubApi({
		"GET /api/v1/companies/c-1/skills": {
			status: 200,
			body: envelope({
				content: [
					{ skillId: "s-1", name: "Baking" },
					{ skillId: "s-3", name: "Pastry art" },
				],
				page: { totalElements: 2 },
			}),
		},
	});
});
afterEach(() => {
	resetApiClient();
	vi.unstubAllGlobals();
});

const show = (onSubmit: (skill: SkillValue) => Promise<void>): (() => void) => {
	const onClose = vi.fn();
	render(
		<I18nextProvider i18n={authTestI18n}>
			<QueryClientProvider client={new QueryClient()}>
				<SkillDialog
					companyId="c-1"
					name="Kent Chua"
					skills={[{ name: "Baking", proficiency: 8 }]}
					onClose={onClose}
					onSubmit={onSubmit}
				/>
			</QueryClientProvider>
		</I18nextProvider>
	);
	return onClose;
};
const choose = async (
	user: ReturnType<typeof userEvent.setup>,
	typed: string,
	option: string
): Promise<void> => {
	await user.click(screen.getByRole("button", { name: /^Skill/ }));
	await user.type(
		await screen.findByRole("combobox", { name: "Search or type a skill" }),
		typed
	);
	await user.click(await screen.findByRole("option", { name: option }));
};

describe("SkillDialog", () => {
	it("adds a name as typed with the chosen proficiency, and closes", async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn(() => Promise.resolve());
		const onClose = show(onSubmit);

		expect(screen.getByRole("button", { name: "Add skill" })).toBeDisabled();
		await choose(user, "Latte art", "Add “Latte art”");
		const slider = screen.getByRole("slider", { name: "Proficiency" });
		expect(slider).toHaveValue("5");
		fireEvent.change(slider, { target: { value: "9" } });
		await user.click(screen.getByRole("button", { name: "Add skill" }));

		await waitFor(() => {
			expect(onClose).toHaveBeenCalledOnce();
		});
		expect(onSubmit).toHaveBeenCalledWith({
			name: "Latte art",
			proficiency: 9,
		});
	});

	it("offers the company's names and refuses one they already have", async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn(() => Promise.resolve());
		show(onSubmit);

		await user.click(screen.getByRole("button", { name: /^Skill/ }));
		expect(
			(await screen.findAllByRole("option")).map((option) => option.textContent)
		).toEqual(["Baking", "Pastry art"]);
		await user.click(screen.getByRole("option", { name: "Baking" }));
		await user.click(screen.getByRole("button", { name: "Add skill" }));

		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: /^Skill/ })
			).toHaveAccessibleDescription("They already have this skill.");
		});
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it("reads a refusal as one of the whole set, with the new skill last", async () => {
		const user = userEvent.setup();
		show(() =>
			Promise.reject(
				new ApiProblemError({
					message: "API says no",
					status: 400,
					fieldErrors: [{ field: "skills[1].proficiency", message: "no" }],
					reason: "http",
				})
			)
		);

		await choose(user, "past", "Pastry art");
		await user.click(screen.getByRole("button", { name: "Add skill" }));

		expect(
			await screen.findByText("Choose a proficiency from 1 to 10.")
		).toBeVisible();
		expect(screen.getByRole("slider")).toHaveAccessibleDescription(
			"Choose a proficiency from 1 to 10."
		);
	});
});
