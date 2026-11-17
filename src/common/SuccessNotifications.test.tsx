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

/** Runs one successful mutation with `meta`, as an action does. */
const succeed = (
	client: QueryClient,
	meta?: { successMessage?: "leave.apply" | "leave.approve" | "leave.reject" }
): Promise<unknown> =>
	client
		.getMutationCache()
		.build(client, { mutationFn: () => Promise.resolve(), meta })
		.execute(undefined);

it("shows one confirmation after success and keeps it when the page changes", async () => {
	const { client, view, rerender } = setup();
	await act(async () => {
		await succeed(client, { successMessage: "leave.apply" });
	});
	rerender(view("List"));
	expect(screen.getByRole("status")).toHaveTextContent("leave.apply");
	act(() => {
		vi.advanceTimersByTime(4000);
	});
	expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

it("announces nothing for an action with no message of its own, never a generic success", async () => {
	const { client } = setup();
	await act(async () => {
		await succeed(client);
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

it("shows the newest confirmation at once, replacing the one on screen, for its own full time", async () => {
	const { client } = setup();
	const sendThenWait = async (
		key: "leave.apply" | "leave.approve" | "leave.reject"
	): Promise<void> => {
		await act(async () => {
			await succeed(client, { successMessage: key });
		});
		act(() => {
			vi.advanceTimersByTime(300);
		});
	};
	await sendThenWait("leave.apply");
	await sendThenWait("leave.approve");
	await sendThenWait("leave.reject");
	expect(screen.getAllByRole("status")).toHaveLength(1);
	expect(screen.getByRole("status")).toHaveTextContent("leave.reject");

	act(() => {
		vi.advanceTimersByTime(3500);
	});
	// 3.8 s after it arrived the newest is still up: its time started when it was shown.
	expect(screen.getByRole("status")).toHaveTextContent("leave.reject");
	act(() => {
		vi.advanceTimersByTime(500);
	});
	expect(screen.queryByRole("status")).not.toBeInTheDocument();
});
