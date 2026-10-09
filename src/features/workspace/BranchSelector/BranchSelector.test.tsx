import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import { workspaceQuery, type Workspace } from "@/features/workspace/api";
import { BranchSelector } from "@/features/workspace/BranchSelector";

const LEAVE_READ = "leave_request:read";

const workspace = (
	branches: Workspace["companies"][number]["branches"],
	permissions: Array<string> = []
): Workspace => ({
	companies: [{ uuid: "c-1", name: "Acme", permissions, branches }],
});

/** Orchard and Jurong in Singapore, Kuala Lumpur in Malaysia; the key is held where `held` names. */
const threeBranches = (held: ReadonlyArray<string>): Workspace =>
	workspace(
		[
			["b-1", "Orchard", "SG"],
			["b-2", "Jurong", "SG"],
			["b-3", "Kuala Lumpur", "MY"],
		].map(([uuid = "", name = "", country = ""]) => ({
			uuid,
			name,
			status: "ACTIVE",
			country,
			permissions: held.includes(uuid) ? [LEAVE_READ] : [],
			departments: [
				{
					uuid: `${uuid}-d`,
					name: "Kitchen",
					status: "ACTIVE",
					permissions: held.includes(`${uuid}-d`) ? [LEAVE_READ] : [],
				},
			],
		}))
	);

/** Holds the chosen Branch as a page's URL would. */
const Page = ({
	initial,
	allowAll,
	activeOnly,
	onChange,
}: {
	initial?: string;
	allowAll?: boolean;
	activeOnly?: boolean;
	onChange: (branchId: string | undefined) => void;
}): ReactElement => {
	const [value, setValue] = useState(initial);
	return (
		<BranchSelector
			activeOnly={activeOnly}
			allowAll={allowAll}
			companyId="c-1"
			keys={[LEAVE_READ]}
			value={value}
			onChange={(branchId) => {
				onChange(branchId);
				setValue(branchId);
			}}
		/>
	);
};

const renderWith = (
	data: Workspace,
	initial?: string,
	allowAll = false,
	activeOnly = false
): { onChange: ReturnType<typeof vi.fn>; container: HTMLElement } => {
	const client = new QueryClient();
	client.setQueryData(workspaceQuery.queryKey, data);
	const onChange = vi.fn();
	const { container } = render(
		<I18nextProvider i18n={authTestI18n}>
			<QueryClientProvider client={client}>
				<Page
					activeOnly={activeOnly}
					allowAll={allowAll}
					initial={initial}
					onChange={onChange}
				/>
			</QueryClientProvider>
		</I18nextProvider>
	);
	return { onChange, container };
};

describe("BranchSelector", () => {
	it("offers the Branches where the key is held, at the Branch or a Department beneath it", async () => {
		const user = userEvent.setup();
		renderWith(threeBranches(["b-1", "b-2-d"]), "b-1");

		// Both offered Branches are in Singapore, so no country is asked for.
		expect(
			screen.queryByRole("button", { name: "Country" })
		).not.toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Branch" }));
		expect(
			screen.getAllByRole("option").map((option) => option.textContent)
		).toEqual(["Jurong", "Orchard"]);
	});

	it("offers every Branch for a key held company-wide, by country then name", async () => {
		const user = userEvent.setup();
		renderWith({
			companies: [
				{ ...threeBranches([]).companies[0]!, permissions: [LEAVE_READ] },
			],
		});

		await user.click(await screen.findByRole("button", { name: "Country" }));
		expect(
			screen.getAllByRole("option").map((option) => option.textContent)
		).toEqual(["Malaysia", "Singapore"]);
	});

	it("chooses a country's first Branch when the country changes", async () => {
		const user = userEvent.setup();
		const { onChange } = renderWith(
			threeBranches(["b-1", "b-2", "b-3"]),
			"b-3"
		);

		expect(screen.getByRole("button", { name: "Country" })).toHaveTextContent(
			"Malaysia"
		);
		await user.click(screen.getByRole("button", { name: "Country" }));
		await user.click(screen.getByRole("option", { name: "Singapore" }));

		expect(onChange).toHaveBeenCalledExactlyOnceWith("b-2");
		expect(screen.getByRole("button", { name: "Branch" })).toHaveTextContent(
			"Jurong"
		);
		await user.click(screen.getByRole("button", { name: "Branch" }));
		await user.click(screen.getByRole("option", { name: "Orchard" }));
		expect(onChange).toHaveBeenLastCalledWith("b-1");
	});

	it("announces the first offered Branch once when none, or one not offered, is chosen", () => {
		const unset = renderWith(threeBranches(["b-1", "b-3"]));
		expect(unset.onChange).toHaveBeenCalledExactlyOnceWith("b-3");
		unset.container.remove();

		const stale = renderWith(threeBranches(["b-1"]), "b-2");
		expect(stale.onChange).toHaveBeenCalledExactlyOnceWith("b-1");
		expect(screen.getByRole("button", { name: "Branch" })).toHaveTextContent(
			"Orchard"
		);
	});

	it("leaves an offered choice as it is", () => {
		const { onChange } = renderWith(threeBranches(["b-1", "b-3"]), "b-1");

		expect(onChange).not.toHaveBeenCalled();
	});

	it("renders nothing and announces nothing when no Branch is offered", () => {
		const { onChange, container } = renderWith(threeBranches([]));

		expect(container).toBeEmptyDOMElement();
		expect(onChange).not.toHaveBeenCalled();
	});

	it("offers only ACTIVE Branches with activeOnly", async () => {
		const user = userEvent.setup();
		const data = threeBranches(["b-1", "b-2"]);
		const company = data.companies[0]!;
		const { onChange } = renderWith(
			{
				companies: [
					{
						...company,
						branches: company.branches.map((branch) =>
							branch.uuid === "b-2" ? { ...branch, status: "INACTIVE" } : branch
						),
					},
				],
			},
			"b-2",
			false,
			true
		);

		expect(onChange).toHaveBeenCalledExactlyOnceWith("b-1");
		await user.click(screen.getByRole("button", { name: "Branch" }));
		expect(
			screen.getAllByRole("option").map((option) => option.textContent)
		).toEqual(["Orchard"]);
	});

	describe("with allowAll", () => {
		it("defaults to every Branch without announcing it", () => {
			const { onChange } = renderWith(
				threeBranches(["b-1", "b-2", "b-3"]),
				undefined,
				true
			);

			expect(screen.getByRole("button", { name: "Country" })).toHaveTextContent(
				"All countries"
			);
			expect(screen.getByRole("button", { name: "Branch" })).toHaveTextContent(
				"All branches"
			);
			expect(onChange).not.toHaveBeenCalled();
		});

		it("offers every Branch under all countries, and announces all as undefined", async () => {
			const user = userEvent.setup();
			const { onChange } = renderWith(
				threeBranches(["b-1", "b-2", "b-3"]),
				undefined,
				true
			);

			await user.click(screen.getByRole("button", { name: "Branch" }));
			expect(
				screen.getAllByRole("option").map((option) => option.textContent)
			).toEqual(["All branches", "Kuala Lumpur", "Jurong", "Orchard"]);
			await user.click(screen.getByRole("option", { name: "Orchard" }));
			expect(onChange).toHaveBeenLastCalledWith("b-1");
			expect(screen.getByRole("button", { name: "Country" })).toHaveTextContent(
				"Singapore"
			);

			await user.click(screen.getByRole("button", { name: "Branch" }));
			await user.click(screen.getByRole("option", { name: "All branches" }));
			expect(onChange).toHaveBeenLastCalledWith(undefined);
		});

		it("chooses every Branch when all countries are chosen", async () => {
			const user = userEvent.setup();
			const { onChange } = renderWith(
				threeBranches(["b-1", "b-2", "b-3"]),
				"b-3",
				true
			);

			await user.click(screen.getByRole("button", { name: "Country" }));
			await user.click(screen.getByRole("option", { name: "All countries" }));

			expect(onChange).toHaveBeenCalledExactlyOnceWith(undefined);
			expect(screen.getByRole("button", { name: "Branch" })).toHaveTextContent(
				"All branches"
			);
		});

		it("clears a Branch no longer offered", () => {
			const { onChange } = renderWith(threeBranches(["b-1"]), "b-2", true);

			expect(onChange).toHaveBeenCalledExactlyOnceWith(undefined);
		});
	});
});
