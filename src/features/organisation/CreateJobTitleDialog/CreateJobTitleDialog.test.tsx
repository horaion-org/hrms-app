import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetApiClient } from "@/common/api-client";
import {
	currentUserReply,
	openApp,
	type OpenedApp,
} from "@/common/testing/openApp";
import {
	accessPassReply,
	envelope,
	problemReply,
	stubApi,
	type StubReply,
} from "@/common/testing/stubApi";
import { endSession } from "@/features/auth/session";
import { renderAuthApp } from "@/features/auth/testing";

const JOB_TITLES = "GET /api/v1/companies/c-1/job-titles";
const CREATE = "POST /api/v1/companies/c-1/job-titles";
const permissions = ["job_title:read", "job_title:create"];
const jobTitle = {
	jobTitleId: "j-1",
	companyId: "c-1",
	name: "Shift supervisor",
	status: "ACTIVE",
};
const page = (content: Array<unknown>): StubReply => ({
	status: 200,
	body: envelope({ content, page: { totalElements: content.length } }),
});
const routes = (grants = permissions): Record<string, StubReply> => ({
	"POST /api/v1/public/sessions/refreshes": accessPassReply(),
	"GET /api/v1/me": currentUserReply(),
	"GET /api/v1/me/workspace": {
		status: 200,
		body: envelope({
			companies: [
				{ uuid: "c-1", name: "Company c-1", permissions: grants, branches: [] },
			],
		}),
	},
	[JOB_TITLES]: page([]),
	[CREATE]: { status: 201, body: envelope(jobTitle) },
});
let app: OpenedApp | undefined;
beforeEach(() => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(() => {
	app?.disconnect();
	app?.queryClient.clear();
	app = undefined;
	endSession("expired");
	resetApiClient();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	localStorage.clear();
});
const open = async (): Promise<void> => {
	app = await openApp("/organisation/job-titles");
	renderAuthApp(app);
	await screen.findByRole("heading", { name: "Job titles", level: 1 });
};
const openDialog = async (): Promise<HTMLElement> => {
	await userEvent.click(
		await screen.findByRole("button", { name: "Create job title" })
	);
	return screen.findByRole("dialog", { name: "Create job title" });
};
const nameField = (dialog: HTMLElement): HTMLElement =>
	within(dialog).getByLabelText("Job title name");
const submit = (dialog: HTMLElement): Promise<void> =>
	userEvent.click(
		within(dialog).getByRole("button", { name: "Create job title" })
	);

describe("create job title through the Job titles page", () => {
	it("hides create without job_title:create", async () => {
		stubApi(routes(["job_title:read"]));
		await open();
		expect(
			await screen.findByRole("table", { name: "Job titles" })
		).toBeVisible();
		expect(
			screen.queryByRole("button", { name: "Create job title" })
		).not.toBeInTheDocument();
	});

	it("starts empty with submit disabled, focuses the name and counts characters", async () => {
		stubApi(routes());
		await open();
		const dialog = await openDialog();
		expect(
			within(dialog).getByRole("button", { name: "Create job title" })
		).toBeDisabled();
		await waitFor(() => {
			expect(nameField(dialog)).toHaveFocus();
		});
		expect(nameField(dialog)).toHaveAttribute("maxLength", "100");
		await userEvent.type(nameField(dialog), "Chef");
		expect(within(dialog).getByText("4/100")).toBeVisible();
	});

	it("validates the name on submit, then again as it changes", async () => {
		stubApi(routes());
		await open();
		const dialog = await openDialog();
		await userEvent.type(nameField(dialog), "Chef_1");
		await submit(dialog);
		expect(
			await within(dialog).findByText(
				"Use only letters, numbers, spaces and . ' & - in the name."
			)
		).toBeVisible();
		await userEvent.clear(nameField(dialog));
		await userEvent.type(nameField(dialog), "Chef 1");
		await waitFor(() => {
			expect(
				within(dialog).queryByText(
					"Use only letters, numbers, spaces and . ' & - in the name."
				)
			).not.toBeInTheDocument();
		});
	});

	it("creates a trimmed job title, closes, and refetches the list", async () => {
		const calls = stubApi({
			...routes(),
			[JOB_TITLES]: [page([]), page([jobTitle])],
		});
		await open();
		const dialog = await openDialog();
		await userEvent.type(nameField(dialog), "  Shift supervisor  ");
		await submit(dialog);
		await waitFor(() => {
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});
		expect(await screen.findByText("Shift supervisor")).toBeVisible();
		expect(
			calls.find(
				(call) => call.method === "POST" && call.path.endsWith("/job-titles")
			)?.body
		).toEqual({ name: "Shift supervisor" });
	});

	it.each([
		[
			409,
			"JOB_TITLE_NAME_CONFLICT",
			'A job title named "Manager" already exists. Choose a different name.',
		],
		[400, "INVALID_JOB_TITLE_NAME", "Check the job title name and try again."],
	])(
		"places a %s %s refusal under the name and focuses it",
		async (status, code, message) => {
			stubApi({
				...routes(),
				[CREATE]: problemReply(Number(status), String(code)),
			});
			await open();
			const dialog = await openDialog();
			await userEvent.type(nameField(dialog), "Manager");
			await submit(dialog);
			expect(await within(dialog).findByText(String(message))).toBeVisible();
			await waitFor(() => {
				expect(nameField(dialog)).toHaveFocus();
			});
			expect(nameField(dialog)).toHaveValue("Manager");
		}
	);

	it.each([
		[
			403,
			"AUTHORIZATION_DENIED",
			"You no longer have permission to create job titles.",
		],
		[
			503,
			"DECISION_ENGINE_STALE",
			"We couldn’t create the job title. Try again.",
		],
	])(
		"shows a translated form alert for %s and never server prose",
		async (status, code, message) => {
			stubApi({
				...routes(),
				[CREATE]: problemReply(Number(status), String(code)),
			});
			await open();
			const dialog = await openDialog();
			await userEvent.type(nameField(dialog), "Manager");
			await submit(dialog);
			expect(await within(dialog).findByRole("alert")).toHaveTextContent(
				String(message)
			);
			expect(screen.queryByText(/API says/)).not.toBeInTheDocument();
		}
	);

	it("locks the field and close paths while submitting", async () => {
		stubApi(routes());
		const fetchBefore = globalThis.fetch;
		let finish: (response: Response) => void = () => {};
		vi.stubGlobal(
			"fetch",
			(url: string, init?: RequestInit): Promise<Response> => {
				if (url.endsWith("/job-titles") && init?.method === "POST")
					return new Promise<Response>((resolve) => {
						finish = resolve;
					});
				return fetchBefore(url, init);
			}
		);
		await open();
		const dialog = await openDialog();
		await userEvent.type(nameField(dialog), "Manager");
		await submit(dialog);
		expect(
			await within(dialog).findByRole("button", { name: "Create job title" })
		).toHaveAttribute("aria-busy", "true");
		expect(nameField(dialog)).toBeDisabled();
		expect(
			within(dialog).getByRole("button", { name: "Close" })
		).toBeDisabled();
		await userEvent.keyboard("{Escape}");
		expect(dialog).toBeVisible();
		finish(
			new Response(JSON.stringify(envelope(jobTitle)), {
				status: 201,
				headers: { "Content-Type": "application/json" },
			})
		);
		await waitFor(() => {
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});
	});
});
