import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { effectiveWorkspace } from "@/common/testing/effectiveWorkspace";
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
const TITLES = "/api/v1/companies/c-1/branches/b-1/departments/d-1/job-titles";
const CREATE = `POST ${TITLES}`;
const UPDATE = `PUT ${TITLES}/j-1`;
const permissions = ["job_title:read", "job_title:create", "job_title:update"];
const jobTitle = {
	jobTitleId: "j-1",
	companyId: "c-1",
	branchId: "b-1",
	branchName: "Orchard",
	departmentId: "d-1",
	departmentName: "Kitchen",
	name: "Shift supervisor",
	description: null,
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
		body: envelope(
			effectiveWorkspace({
				companies: [
					{
						uuid: "c-1",
						name: "Company c-1",
						permissions: grants,
						branches: [
							{
								uuid: "b-1",
								name: "Orchard",
								status: "ACTIVE",
								country: "SG",
								permissions: [],
								departments: [
									{
										uuid: "d-1",
										name: "Kitchen",
										status: "ACTIVE",
										permissions: [],
									},
									{
										uuid: "d-2",
										name: "Front of house",
										status: "ACTIVE",
										permissions: [],
									},
								],
							},
						],
					},
				],
			})
		),
	},
	[JOB_TITLES]: page([]),
	[CREATE]: { status: 201, body: envelope(jobTitle) },
	[UPDATE]: { status: 200, body: envelope(jobTitle) },
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
const descriptionField = (dialog: HTMLElement): HTMLElement =>
	within(dialog).getByLabelText("Description (optional)");
const chooseDepartment = async (
	dialog: HTMLElement,
	label = "Orchard › Kitchen"
): Promise<void> => {
	await userEvent.click(
		await within(dialog).findByRole("button", { name: "Department" })
	);
	await userEvent.click(await screen.findByRole("option", { name: label }));
};
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
		await chooseDepartment(dialog);
		await userEvent.type(nameField(dialog), "  Shift supervisor  ");
		await submit(dialog);
		await waitFor(() => {
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});
		expect(await screen.findByText("Shift supervisor")).toBeVisible();
		expect(
			calls
				.filter(
					(call) => call.method === "POST" && call.path.endsWith("/job-titles")
				)
				.map((call) => [call.path, call.body])
		).toEqual([[TITLES, { name: "Shift supervisor", description: null }]]);
	});

	it("offers an optional description after the name, counts it and sends it trimmed", async () => {
		const calls = stubApi(routes());
		await open();
		const dialog = await openDialog();
		const fields = within(dialog)
			.getAllByRole("textbox")
			.map((field) => field.getAttribute("id"));
		expect(fields.indexOf(descriptionField(dialog).id)).toBe(
			fields.indexOf(nameField(dialog).id) + 1
		);
		expect(descriptionField(dialog)).toHaveAttribute("maxLength", "300");
		expect(descriptionField(dialog)).not.toBeRequired();
		expect(within(dialog).getByText("0/300")).toBeVisible();

		await chooseDepartment(dialog);
		await userEvent.type(nameField(dialog), "Chef");
		await userEvent.type(descriptionField(dialog), " Runs the pass. ");
		expect(within(dialog).getByText("16/300")).toBeVisible();
		await submit(dialog);

		await waitFor(() => {
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});
		expect(
			calls
				.filter((call) => call.method === "POST" && call.path === TITLES)
				.map((call) => call.body)
		).toEqual([{ name: "Chef", description: "Runs the pass." }]);
	});

	it("puts a refused description under its field", async () => {
		stubApi({
			...routes(),
			[CREATE]: {
				status: 400,
				body: {
					status: 400,
					detail: "API says no",
					errors: [{ field: "description", message: "API says too long" }],
				},
			},
		});
		await open();
		const dialog = await openDialog();
		await chooseDepartment(dialog);
		await userEvent.type(nameField(dialog), "Chef");
		await userEvent.type(descriptionField(dialog), "Runs the pass.");
		await submit(dialog);

		expect(
			await within(dialog).findByText(
				"Keep the description to 300 characters or fewer."
			)
		).toBeVisible();
		expect(screen.queryByText(/API says/)).not.toBeInTheDocument();
	});

	it("needs a department, offering only the ones the person may add to", async () => {
		stubApi(routes());
		await open();
		const dialog = await openDialog();

		await userEvent.type(nameField(dialog), "Chef");
		await submit(dialog);
		expect(
			await within(dialog).findByText("Choose a department.")
		).toBeVisible();

		await userEvent.click(
			within(dialog).getByRole("button", { name: "Department" })
		);
		expect(
			screen.getAllByRole("option").map((option) => option.textContent)
		).toEqual(["Orchard › Front of house", "Orchard › Kitchen"]);
	});

	it("puts a department refusal on the department field", async () => {
		stubApi({
			...routes(),
			[CREATE]: problemReply(409, "DEPARTMENT_INACTIVE"),
		});
		await open();
		const dialog = await openDialog();
		await chooseDepartment(dialog);
		await userEvent.type(nameField(dialog), "Chef");
		await submit(dialog);

		expect(
			await within(dialog).findByText(
				"This department is inactive. Activate it first, or choose another department."
			)
		).toBeVisible();
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
			await chooseDepartment(dialog);
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
			await chooseDepartment(dialog);
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
		await chooseDepartment(dialog);
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

describe("edit job title through the Job titles page", () => {
	it("edits the name and description from the pencil, keeping the department fixed", async () => {
		const calls = stubApi({
			...routes(),
			[JOB_TITLES]: page([{ ...jobTitle, description: "Runs the floor." }]),
		});
		await open();

		await userEvent.click(
			await screen.findByRole("button", { name: "Edit Shift supervisor" })
		);
		const dialog = await screen.findByRole("dialog", {
			name: "Edit job title",
		});
		expect(dialog).toHaveTextContent("It stays in Orchard › Kitchen.");
		expect(
			within(dialog).getByRole("button", { name: "Department" })
		).toBeDisabled();
		expect(nameField(dialog)).toHaveValue("Shift supervisor");
		expect(descriptionField(dialog)).toHaveValue("Runs the floor.");

		await userEvent.clear(nameField(dialog));
		await userEvent.type(nameField(dialog), " Senior supervisor ");
		await userEvent.clear(descriptionField(dialog));
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Save changes" })
		);

		await waitFor(() => {
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});
		expect(
			calls
				.filter((call) => call.method === "PUT")
				.map((call) => [call.path, call.body])
		).toEqual([
			[
				`${TITLES}/j-1`,
				{ name: "Senior supervisor", description: null, status: "ACTIVE" },
			],
		]);
	});

	it("offers no pencil or status change without job_title:update", async () => {
		stubApi({
			...routes(["job_title:read"]),
			[JOB_TITLES]: page([jobTitle]),
		});
		await open();

		expect(
			await screen.findByRole("button", { name: "Edit Shift supervisor" })
		).toBeDisabled();
	});
});
