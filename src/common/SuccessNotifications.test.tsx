import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import { StrictMode, type ReactElement } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SuccessNotifications } from "@/common/SuccessNotifications";

vi.mock("react-i18next", () => ({
	useTranslation: (): { t: (key: string) => string } => ({
		t: (key: string): string => key,
	}),
}));

beforeEach(() => {
	vi.useFakeTimers();
});
afterEach(() => {
	vi.useRealTimers();
});

const setup = (): ReturnType<typeof render> & {
	client: QueryClient;
	view: (page: string) => ReactElement;
} => {
	const client = new QueryClient({
		defaultOptions: { mutations: { retry: false } },
	});
	const view = (page: string): ReactElement => (
		<StrictMode>
			<QueryClientProvider client={client}>
				<SuccessNotifications />
				<div key={page}>{page}</div>
			</QueryClientProvider>
		</StrictMode>
	);
	return { client, view, ...render(view("Editor")) };
};

it("shows one confirmation after success and keeps it when the page changes", async () => {
	const { client, view, rerender } = setup();
	await act(async () => {
		await client
			.getMutationCache()
			.build(client, {
				mutationFn: () => Promise.resolve(),
			})
			.execute(undefined);
	});
	rerender(view("List"));
	expect(screen.getByRole("status")).toHaveTextContent(
		"notifications.operationSucceeded"
	);
	act(() => {
		vi.advanceTimersByTime(4000);
	});
	expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

it("does not announce pending, failed, or explicitly handled operations", async () => {
	const { client } = setup();
	let finish!: () => void;
	const pending = new Promise<void>((resolve) => {
		finish = resolve;
	});
	let execution!: Promise<void>;
	act(() => {
		execution = client
			.getMutationCache()
			.build(client, {
				mutationFn: () => pending,
				meta: { successMessage: false },
			})
			.execute(undefined);
	});
	expect(screen.queryByRole("status")).not.toBeInTheDocument();
	await act(async () => {
		finish();
		await execution;
	});
	await act(async () => {
		await expect(
			client
				.getMutationCache()
				.build(client, {
					mutationFn: () => Promise.reject(new Error("Failed")),
				})
				.execute(undefined)
		).rejects.toThrow("Failed");
	});
	expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

it("queues consecutive successes and translates their configured messages", async () => {
	const { client } = setup();
	await act(async () => {
		await Promise.all(
			(["leave.apply", "leave.approve"] as const).map((key) =>
				client
					.getMutationCache()
					.build(client, {
						mutationFn: () => Promise.resolve(),
						meta: { successMessage: key },
					})
					.execute(undefined)
			)
		);
	});
	expect(screen.getAllByRole("status")).toHaveLength(1);
	expect(screen.getByRole("status")).toHaveTextContent("leave.apply");
	act(() => {
		vi.advanceTimersByTime(4000);
	});
	expect(screen.getByRole("status")).toHaveTextContent("leave.approve");
	act(() => {
		vi.advanceTimersByTime(4000);
	});
	expect(screen.queryByRole("status")).not.toBeInTheDocument();
});
