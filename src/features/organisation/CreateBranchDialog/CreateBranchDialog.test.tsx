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

const BRANCHES = "GET /api/v1/companies/c-1/branches";
const CREATE = "POST /api/v1/companies/c-1/branches";
const MEMBERS = "GET /api/v1/companies/c-1/members";
const permissions = ["branch:read", "branch:create", "company_member:read"];
const member = {
	membershipId: "m-1",
	displayName: "Marcus Lim",
	status: "ACTIVE",
};
const branch = {
	branchId: "b-1",
	name: "Orchard Road",
	code: "ORC",
	city: "São Paulo",
	status: "ACTIVE",
};
const page = (
	content: Array<unknown>,
	totalElements = content.length
): StubReply => ({
	status: 200,
	body: envelope({ content, page: { totalElements } }),
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
	[BRANCHES]: page([]),
	[MEMBERS]: page([member]),
	[CREATE]: { status: 201, body: envelope(branch) },
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
	app = await openApp("/organisation/branches");
	renderAuthApp(app);
	await screen.findByRole("heading", { name: "Branches", level: 1 });
};
const openDialog = async (): Promise<HTMLElement> => {
	await userEvent.click(
		await screen.findByRole("button", { name: "Create branch" })
	);
	return screen.findByRole("dialog", { name: "Create branch" });
};
const fill = async (
	dialog: HTMLElement,
	name = "Orchard Road"
): Promise<void> => {
	const user = userEvent.setup();
	await user.type(within(dialog).getByLabelText("Branch name"), name);
	await user.type(within(dialog).getByLabelText("Branch code"), "  orc  ");
	await user.type(within(dialog).getByLabelText("City"), "  São  Paulo  ");
	await user.click(within(dialog).getByLabelText("Branch heads"));
	await user.click(await screen.findByRole("option", { name: "Marcus Lim" }));
	await user.keyboard("{Escape}");
};

describe("create branch through the Branches page", () => {
	it.each([
		["branch:read", "branch:create"],
		["branch:read", "company_member:read"],
		["branch:read"],
	])(
		"hides create when one required grant is missing: %j",
		async (...grants) => {
			const calls = stubApi(routes(grants));
			await open();
			expect(
				screen.queryByRole("button", { name: "Create branch" })
			).not.toBeInTheDocument();
			expect(calls.some((call) => call.path.endsWith("/members"))).toBe(false);
		}
	);
	it("starts empty, focuses name and disables submit; cancel discards and restores focus", async () => {
		stubApi(routes());
		await open();
		const dialog = await openDialog();
		expect(
			within(dialog).getByRole("button", { name: "Create branch" })
		).toBeDisabled();
		await waitFor(() => {
			expect(within(dialog).getByLabelText("Branch name")).toHaveFocus();
		});
		await userEvent.type(within(dialog).getByLabelText("Branch name"), "Draft");
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Cancel" })
		);
		await waitFor(() => {
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});
		expect(screen.getByRole("button", { name: "Create branch" })).toHaveFocus();
		const fresh = await openDialog();
		expect(within(fresh).getByLabelText("Branch name")).toHaveValue("");
		expect(within(fresh).getByLabelText("Branch code")).toHaveValue("");
	});
	it("validates missing heads only on submit and clears the error after choosing one", async () => {
		stubApi(routes());
		await open();
		const dialog = await openDialog();
		await userEvent.type(
			within(dialog).getByLabelText("Branch name"),
			"Orchard"
		);
		expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Create branch" })
		);
		expect(
			await within(dialog).findByText("Choose at least one branch head.")
		).toBeVisible();
		await userEvent.click(within(dialog).getByLabelText("Branch heads"));
		await userEvent.click(
			await screen.findByRole("option", { name: "Marcus Lim" })
		);
		await waitFor(() => {
			expect(
				within(dialog).queryByText("Choose at least one branch head.")
			).not.toBeInTheDocument();
		});
	});
	it.each([
		["", "Enter a branch code."],
		["abcdefghijk", "Use 1 to 10 characters."],
		["or c", "Use only letters A–Z, numbers and hyphens in the code."],
		["or_c", "Use only letters A–Z, numbers and hyphens in the code."],
	])(
		"validates code %j on submit then revalidates on change",
		async (value, message) => {
			const calls = stubApi(routes());
			await open();
			const dialog = await openDialog();
			await fill(dialog);
			const code = within(dialog).getByLabelText("Branch code");
			await userEvent.clear(code);
			if (value) await userEvent.type(code, value);
			expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
			await userEvent.click(
				within(dialog).getByRole("button", { name: "Create branch" })
			);
			expect(await within(dialog).findByText(message)).toBeVisible();
			expect(code).toHaveFocus();
			expect(
				calls.some(
					(call) => call.method === "POST" && call.path.endsWith("/branches")
				)
			).toBe(false);
			await userEvent.clear(code);
			await userEvent.type(code, "sg-orch-01");
			await waitFor(() =>
				expect(code).toHaveAttribute("aria-invalid", "false")
			);
			expect(code).toHaveValue("SG-ORCH-01");
			expect(within(dialog).getByText("10/10")).toBeVisible();
		}
	);

	it("enables submit when only code has a value", async () => {
		stubApi(routes());
		await open();
		const dialog = await openDialog();
		await userEvent.type(within(dialog).getByLabelText("Branch code"), "0001");
		expect(
			within(dialog).getByRole("button", { name: "Create branch" })
		).toBeEnabled();
	});

	it("creates a trimmed branch, closes, and refetches the visible list", async () => {
		const calls = stubApi({
			...routes(),
			[BRANCHES]: [page([]), page([branch])],
		});
		await open();
		const dialog = await openDialog();
		await fill(dialog, "  Orchard Road  ");
		const code = within(dialog).getByLabelText("Branch code");
		expect(code).toBeRequired();
		expect(code).toHaveValue("  ORC  ");
		expect(code).toHaveAccessibleDescription(
			"1–10 characters. Letters A–Z, numbers and hyphens only."
		);
		expect(within(dialog).getByText("7/10")).toBeVisible();
		expect(
			within(dialog)
				.getAllByRole("textbox")
				.map((input) => input.getAttribute("aria-label"))
		).toEqual(["Branch name", "Branch code", "City"]);
		expect(within(dialog).getByLabelText("City")).toBeRequired();
		expect(within(dialog).getByLabelText("City")).toHaveAccessibleDescription(
			"1–100 characters. Letters, spaces and . ' - only."
		);
		expect(within(dialog).getByText("14/100")).toBeVisible();
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Create branch" })
		);
		await waitFor(() => {
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});
		expect(await screen.findByText("Orchard Road")).toBeVisible();
		expect(
			calls.find(
				(call) => call.method === "POST" && call.path.endsWith("/branches")
			)?.body
		).toEqual({
			name: "Orchard Road",
			code: "ORC",
			city: "São Paulo",
			initialHeadCompanyMembershipIds: ["m-1"],
		});
	});
	it.each(["", "A".repeat(101), "City1", "City&", "\uFEFFCity", "\u0001City"])(
		"validates city %j on submit and change",
		async (value) => {
			const calls = stubApi(routes());
			await open();
			const dialog = await openDialog();
			await fill(dialog);
			const city = within(dialog).getByLabelText("City");
			await userEvent.clear(city);
			if (value) await userEvent.type(city, value);
			expect(city).toHaveAttribute("aria-invalid", "false");
			await userEvent.click(
				within(dialog).getByRole("button", { name: "Create branch" })
			);
			expect(city).toHaveAttribute("aria-invalid", "true");
			expect(city).toHaveFocus();
			expect(
				calls.some(
					(call) => call.method === "POST" && call.path.endsWith("/branches")
				)
			).toBe(false);
			await userEvent.clear(city);
			await userEvent.type(city, "St. John's");
			expect(city).toHaveAttribute("aria-invalid", "false");
		}
	);
	it.each([
		["\u0085São\u00a0\u2003Paulo\u2029", "São Paulo"],
		["A".repeat(100), "A".repeat(100)],
		["𐐀".repeat(100), "𐐀".repeat(100)],
		["X", "X"],
		["St. John's-South", "St. John's-South"],
	])("normalizes valid city %j preserving case", async (value, normalized) => {
		const calls = stubApi(routes());
		await open();
		const dialog = await openDialog();
		await fill(dialog);
		const city = within(dialog).getByLabelText("City");
		await userEvent.clear(city);
		await userEvent.type(city, value);
		if (value === "𐐀".repeat(100))
			expect(within(dialog).getAllByText("100/100")).toHaveLength(1);
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Create branch" })
		);
		await waitFor(() => {
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});
		expect(
			calls.find(
				(call) => call.method === "POST" && call.path.endsWith("/branches")
			)?.body
		).toMatchObject({ city: normalized });
	});
	it("focuses city on field refusal and retains all entered values", async () => {
		stubApi({
			...routes(),
			[CREATE]: {
				status: 400,
				body: {
					status: 400,
					errorCode: "VALIDATION_ERROR",
					errors: [{ field: "city", message: "Private server wording" }],
				},
			},
		});
		await open();
		const dialog = await openDialog();
		await fill(dialog);
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Create branch" })
		);
		expect(
			await within(dialog).findByText("Check the city and try again.")
		).toBeVisible();
		await waitFor(() => {
			expect(within(dialog).getByLabelText("City")).toHaveFocus();
		});
		expect(within(dialog).getByLabelText("City")).toHaveValue("  São  Paulo  ");
		expect(within(dialog).getByLabelText("Branch name")).toHaveValue(
			"Orchard Road"
		);
		expect(within(dialog).getByLabelText("Branch code")).toHaveValue("  ORC  ");
		expect(
			within(dialog).getByRole("button", { name: "Remove Marcus Lim" })
		).toBeVisible();
		expect(
			screen.queryByText("Private server wording")
		).not.toBeInTheDocument();
	});
	it("shows both city and heads refusals while focusing city first", async () => {
		stubApi({
			...routes(),
			[CREATE]: {
				status: 400,
				body: {
					status: 400,
					errors: [
						{ field: "city", message: "Private" },
						{ field: "initialHeadCompanyMembershipIds", message: "Private" },
					],
				},
			},
		});
		await open();
		const dialog = await openDialog();
		await fill(dialog);
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Create branch" })
		);
		expect(
			await within(dialog).findByText("Check the city and try again.")
		).toBeVisible();
		expect(
			within(dialog).getByText("Check the chosen people and try again.")
		).toBeVisible();
		await waitFor(() => {
			expect(within(dialog).getByLabelText("City")).toHaveFocus();
		});
	});
	it("refetches stale people, retains selected Tokens and focuses heads on refusal", async () => {
		const calls = stubApi({
			...routes(),
			[CREATE]: problemReply(400, "INVALID_INITIAL_BRANCH_HEAD"),
		});
		await open();
		const dialog = await openDialog();
		await fill(dialog);
		const before = calls.filter((call) =>
			call.path.endsWith("/members")
		).length;
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Create branch" })
		);
		expect(
			await within(dialog).findByText(
				"One of the chosen people is no longer an active member. Remove them and try again."
			)
		).toBeVisible();
		await waitFor(() => {
			expect(within(dialog).getByLabelText("Branch heads")).toHaveFocus();
			expect(
				calls.filter((call) => call.path.endsWith("/members"))
			).toHaveLength(before + 1);
		});
		expect(
			within(dialog).getByRole("button", { name: "Remove Marcus Lim" })
		).toBeVisible();
	});
	it.each([
		{
			status: 409,
			errorCode: "BRANCH_CODE_CONFLICT",
			errors: [],
			message:
				'A branch with code "ORC" already exists. Choose a different code.',
		},
		{
			status: 400,
			errorCode: "VALIDATION_ERROR",
			errors: [{ field: "code", message: "Private server wording" }],
			message: "Check the branch code and try again.",
		},
	])(
		"retains all inputs and focuses code on $status refusal",
		async ({ status, errorCode, errors, message }) => {
			stubApi({
				...routes(),
				[CREATE]: {
					status,
					body: { status, errorCode, detail: "Private server wording", errors },
				},
			});
			await open();
			const dialog = await openDialog();
			await fill(dialog);
			await userEvent.click(
				within(dialog).getByRole("button", { name: "Create branch" })
			);
			expect(await within(dialog).findByText(message)).toBeVisible();
			await waitFor(() =>
				expect(within(dialog).getByLabelText("Branch code")).toHaveFocus()
			);
			expect(within(dialog).getByLabelText("Branch code")).toHaveValue(
				"  ORC  "
			);
			expect(
				within(dialog).getByLabelText("Branch code")
			).toHaveAccessibleDescription(message);
			expect(within(dialog).getByLabelText("Branch name")).toHaveValue(
				"Orchard Road"
			);
			expect(
				within(dialog).getByRole("button", { name: "Remove Marcus Lim" })
			).toBeVisible();
			expect(
				within(dialog).queryByText("Private server wording")
			).not.toBeInTheDocument();
		}
	);

	it("locks fields and all close paths while submitting", async () => {
		stubApi(routes());
		const fetchBefore = globalThis.fetch;
		let finish: (response: Response) => void = () => {};
		vi.stubGlobal(
			"fetch",
			(url: string, init?: RequestInit): Promise<Response> => {
				if (url.endsWith("/companies/c-1/branches") && init?.method === "POST")
					return new Promise<Response>((resolve) => {
						finish = resolve;
					});
				return fetchBefore(url, init);
			}
		);
		await open();
		const dialog = await openDialog();
		await fill(dialog);
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Create branch" })
		);
		const pending = await within(dialog).findByRole("button", {
			name: "Create branch",
		});
		expect(pending).toHaveAttribute("aria-busy", "true");
		expect(within(dialog).getByLabelText("Branch name")).toBeDisabled();
		expect(within(dialog).getByLabelText("Branch code")).toBeDisabled();
		expect(within(dialog).getByLabelText("Branch heads")).toBeDisabled();
		expect(
			within(dialog).getByRole("button", { name: "Cancel" })
		).toBeDisabled();
		expect(
			within(dialog).getByRole("button", { name: "Close" })
		).toBeDisabled();
		await userEvent.keyboard("{Escape}");
		expect(dialog).toBeVisible();
		finish(
			new Response(JSON.stringify(envelope(branch)), {
				status: 201,
				headers: { "Content-Type": "application/json" },
			})
		);
		await waitFor(() => {
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});
	});
	it.each([
		[
			403,
			"AUTHORIZATION_DENIED",
			"You no longer have permission to create branches.",
		],
		[500, "INTERNAL_ERROR", "We couldn’t create the branch. Try again."],
	])(
		"shows a translated form alert for %s and retains input",
		async (status, code, message) => {
			stubApi({
				...routes(),
				[CREATE]: problemReply(Number(status), String(code)),
			});
			await open();
			const dialog = await openDialog();
			await fill(dialog);
			await userEvent.click(
				within(dialog).getByRole("button", { name: "Create branch" })
			);
			expect(await within(dialog).findByRole("alert")).toHaveTextContent(
				String(message)
			);
			expect(within(dialog).getByLabelText("Branch name")).toHaveValue(
				"Orchard Road"
			);
		}
	);
	it("searches active people, updates footer, retains Tokens and caps heads at 20", async () => {
		const people = Array.from({ length: 20 }, (_, index) => ({
			membershipId: `m-${index}`,
			displayName: `Person ${index}`,
			status: "ACTIVE",
		}));
		const calls = stubApi({
			...routes(),
			[MEMBERS]: (call) =>
				new URLSearchParams(call.search).has("search")
					? page([
							{
								membershipId: "m-new",
								displayName: "New person",
								status: "ACTIVE",
							},
							people[0],
						])
					: page(people, 25),
		});
		await open();
		const dialog = await openDialog();
		await userEvent.click(within(dialog).getByLabelText("Branch heads"));
		expect(
			await screen.findByText(
				"Showing 20 of 25 active company members. Type to narrow."
			)
		).toBeVisible();
		await people.reduce(async (previous, person) => {
			await previous;
			await userEvent.click(
				screen.getByRole("option", { name: person.displayName })
			);
		}, Promise.resolve());
		expect(within(dialog).getByText("20/20")).toBeVisible();
		await userEvent.type(
			screen.getByRole("combobox", { name: "Search people" }),
			"New"
		);
		await waitFor(() => {
			expect(
				screen.getByRole("option", { name: "New person" })
			).toHaveAttribute("aria-disabled", "true");
		});
		expect(screen.getByText("Showing active company members")).toBeVisible();
		expect(
			within(dialog).getByRole("button", { name: "Remove Person 19" })
		).toBeVisible();
		expect(calls.filter((call) => call.path.endsWith("/members"))).toHaveLength(
			2
		);
		await userEvent.keyboard("{Escape}");
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Remove Person 19" })
		);
		expect(within(dialog).getByText("19/20")).toBeVisible();
	});
	it("maps known validation fields without showing server prose and focuses the first field", async () => {
		stubApi({
			...routes(),
			[CREATE]: {
				status: 400,
				body: {
					status: 400,
					errorCode: "VALIDATION_ERROR",
					errors: [
						{ field: "name", message: "PRIVATE NAME" },
						{
							field: "initialHeadCompanyMembershipIds",
							message: "PRIVATE HEADS",
						},
					],
				},
			},
		});
		await open();
		const dialog = await openDialog();
		await fill(dialog);
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Create branch" })
		);
		expect(
			await within(dialog).findByText("Check the branch name and try again.")
		).toBeVisible();
		expect(
			within(dialog).getByText("Check the chosen people and try again.")
		).toBeVisible();
		expect(screen.queryByText(/PRIVATE/)).not.toBeInTheDocument();
		await waitFor(() => {
			expect(within(dialog).getByLabelText("Branch name")).toHaveFocus();
		});
	});
	it("retains values and shows translated network failure", async () => {
		stubApi(routes());
		const fetchBefore = globalThis.fetch;
		vi.stubGlobal(
			"fetch",
			(url: string, init?: RequestInit): Promise<Response> =>
				init?.method === "POST" && url.endsWith("/branches")
					? Promise.reject(new TypeError("Private network text"))
					: fetchBefore(url, init)
		);
		await open();
		const dialog = await openDialog();
		await fill(dialog);
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Create branch" })
		);
		expect(await within(dialog).findByRole("alert")).toHaveTextContent(
			"We couldn’t create the branch. Try again."
		);
		expect(within(dialog).getByLabelText("Branch name")).toHaveValue(
			"Orchard Road"
		);
	});
	it("keeps a duplicate name in place, shows translated conflict and focuses name", async () => {
		stubApi({
			...routes(),
			[CREATE]: problemReply(409, "BRANCH_NAME_CONFLICT"),
		});
		await open();
		const dialog = await openDialog();
		await fill(dialog);
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Create branch" })
		);
		expect(
			await within(dialog).findByText(
				'A branch named "Orchard Road" already exists. Choose a different name.'
			)
		).toBeVisible();
		await waitFor(() => {
			expect(within(dialog).getByLabelText("Branch name")).toHaveFocus();
		});
		expect(within(dialog).getByLabelText("Branch name")).toHaveValue(
			"Orchard Road"
		);
	});
});
