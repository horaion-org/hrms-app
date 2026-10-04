import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn, userEvent, within } from "storybook/test";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { authTestI18n } from "@/features/auth/testingI18n";
import { CreateBranchDialog } from "@/features/organisation/CreateBranchDialog";

const client = new QueryClient({
	defaultOptions: { queries: { retry: false } },
});
const people = ["Marcus Lim", "Priya Nair", "Daniel Tan"].map(
	(displayName, index) => ({
		membershipId: `member-${index}`,
		displayName,
		status: "ACTIVE",
	})
);
const meta = {
	title: "Features/Organisation/CreateBranchDialog",
	component: CreateBranchDialog,
	args: { companyId: "story-company", onClose: fn() },
	decorators: [
		(Story): ReactElement => (
			<I18nextProvider i18n={authTestI18n}>
				<QueryClientProvider client={client}>
					<Story />
				</QueryClientProvider>
			</I18nextProvider>
		),
	],
	beforeEach: ({ parameters }) => {
		const original = globalThis.fetch;
		configureApiClient({
			accessToken: () => Promise.resolve("story-pass"),
			renew: () => Promise.resolve({ kind: "expired" }),
			onUnauthenticated: () => {},
		});
		globalThis.fetch = (input, init): Promise<Response> => {
			if (init?.method === "POST") {
				if (parameters["pending"]) return new Promise<Response>(() => {});
				if (parameters["codeConflict"])
					return Promise.resolve(
						new Response(
							JSON.stringify({
								status: 409,
								errorCode: "BRANCH_CODE_CONFLICT",
							}),
							{ status: 409, headers: { "Content-Type": "application/json" } }
						)
					);
				return Promise.resolve(
					new Response(
						JSON.stringify({ status: 500, errorCode: "INTERNAL_ERROR" }),
						{ status: 500, headers: { "Content-Type": "application/json" } }
					)
				);
			}
			if (
				(typeof input === "string"
					? input
					: input instanceof URL
						? input.href
						: input.url
				).includes("/members")
			)
				return Promise.resolve(
					new Response(
						JSON.stringify({
							success: true,
							data: { content: people, page: { totalElements: people.length } },
						}),
						{ status: 200, headers: { "Content-Type": "application/json" } }
					)
				);
			return original(input, init);
		};
		return (): void => {
			globalThis.fetch = original;
			resetApiClient();
			client.clear();
		};
	},
} satisfies Meta<typeof CreateBranchDialog>;
export default meta;
type Story = StoryObj<typeof meta>;

const fill = async (body: HTMLElement): Promise<void> => {
	const page = within(body);
	await userEvent.type(
		await page.findByLabelText("Branch name"),
		"Orchard Road"
	);
	await userEvent.type(page.getByLabelText("Branch code"), "orc");
	await userEvent.type(page.getByLabelText("City"), "Singapore");
	await userEvent.click(page.getByLabelText("Branch heads"));
	await userEvent.click(
		await page.findByRole("option", { name: "Marcus Lim" })
	);
	await userEvent.keyboard("{Escape}");
};

export const Empty: Story = {};
export const NameEntered: Story = {
	play: async ({ canvasElement }) => {
		await userEvent.type(
			await within(canvasElement.ownerDocument.body).findByLabelText(
				"Branch name"
			),
			"Orchard Road"
		);
	},
};
export const ChoosingHeads: Story = {
	play: async ({ canvasElement }) => {
		const page = within(canvasElement.ownerDocument.body);
		await userEvent.type(
			await page.findByLabelText("Branch name"),
			"Orchard Road"
		);
		await userEvent.type(page.getByLabelText("Branch code"), "orc");
		await userEvent.type(page.getByLabelText("City"), "Singapore");
		await userEvent.click(page.getByLabelText("Branch heads"));
	},
};
export const HeadsSelected: Story = {
	play: async ({ canvasElement }) => {
		await fill(canvasElement.ownerDocument.body);
	},
};
export const Submitting: Story = {
	parameters: { pending: true },
	play: async ({ canvasElement }) => {
		await fill(canvasElement.ownerDocument.body);
		await userEvent.click(
			within(canvasElement.ownerDocument.body).getByRole("button", {
				name: "Create branch",
			})
		);
	},
};
export const FormError: Story = { play: Submitting.play };

export const CodeEntered: Story = {
	play: async ({ canvasElement }) => {
		await userEvent.type(
			await within(canvasElement.ownerDocument.body).findByLabelText(
				"Branch code"
			),
			"sg-orc-01"
		);
	},
};
export const CodeConflict: Story = {
	parameters: { codeConflict: true },
	play: Submitting.play,
};
export const CodeValidation: Story = {
	play: async ({ canvasElement }) => {
		const page = within(canvasElement.ownerDocument.body);
		await fill(canvasElement.ownerDocument.body);
		await userEvent.clear(page.getByLabelText("Branch code"));
		await userEvent.type(page.getByLabelText("Branch code"), "invalid_");
		await userEvent.click(page.getByRole("button", { name: "Create branch" }));
	},
};

export const CityEntered: Story = {
	play: async ({ canvasElement }) => {
		await userEvent.type(
			await within(canvasElement.ownerDocument.body).findByLabelText("City"),
			"São Paulo"
		);
	},
};
export const CityValidation: Story = {
	play: async ({ canvasElement }) => {
		const page = within(canvasElement.ownerDocument.body);
		await fill(canvasElement.ownerDocument.body);
		await userEvent.clear(page.getByLabelText("City"));
		await userEvent.type(page.getByLabelText("City"), "City1");
		await userEvent.click(page.getByRole("button", { name: "Create branch" }));
	},
};
