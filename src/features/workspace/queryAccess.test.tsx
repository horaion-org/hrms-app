import {
	QueryClient,
	QueryClientProvider,
	useQuery,
} from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { companyWideWorkspace } from "@/common/testing/effectiveWorkspace";
import type { FunctionComponent } from "@/common/types";
import { workspaceQuery, type Workspace } from "@/features/workspace/api";
import {
	accessiblePreviousData,
	administrativeMeta,
	companiesWithShrunkAccess,
	selfMeta,
	type QueryAccessMeta,
	watchAccessChanges,
} from "@/features/workspace/queryAccess";
import { effectivePermissionMap } from "@/features/workspace/scopes";

const READ = ["member_profile:read", "leave_request:read"];

/** A promise settled from outside, standing for a request still in flight. */
const deferred = <T,>(): {
	promise: Promise<T>;
	resolve: (value: T) => void;
} => {
	let resolve: (value: T) => void = () => {};
	const promise = new Promise<T>((settle) => {
		resolve = settle;
	});
	return { promise, resolve };
};

let stop: (() => void) | undefined;
afterEach(() => {
	stop?.();
	stop = undefined;
});

/** A client watching access changes, already holding `READ` company-wide. */
const watched = (): QueryClient => {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false, gcTime: Infinity } },
	});
	client.setQueryData(workspaceQuery.queryKey, companyWideWorkspace(READ));
	stop = watchAccessChanges(client);
	return client;
};

/** A cached query with its access meta, as a page would have left it. */
const seed = (
	client: QueryClient,
	queryKey: ReadonlyArray<unknown>,
	meta: QueryAccessMeta,
	data: unknown
): void => {
	client.getQueryCache().build(client, { queryKey, meta });
	client.setQueryData(queryKey, data);
};

/** The workspace answering anew, as a reload would. */
const answer = (client: QueryClient, workspace: Workspace): void => {
	client.setQueryData(workspaceQuery.queryKey, workspace);
};

describe("companiesWithShrunkAccess", () => {
	const map = (
		workspace: Workspace
	): ReturnType<typeof effectivePermissionMap> =>
		effectivePermissionMap(workspace);

	it("names a company where some node lost a key", () => {
		expect(
			companiesWithShrunkAccess(
				map(companyWideWorkspace(READ)),
				map(companyWideWorkspace(["member_profile:read"]))
			)
		).toEqual(["c-1"]);
	});

	it("names a company that is gone, or whose unit is gone", () => {
		expect(
			companiesWithShrunkAccess(
				map(companyWideWorkspace(READ)),
				map({ companies: [] })
			)
		).toEqual(["c-1"]);
		expect(
			companiesWithShrunkAccess(
				map(companyWideWorkspace(READ)),
				map(companyWideWorkspace(READ, []))
			)
		).toEqual(["c-1"]);
	});

	it("names nothing when access only grew or stayed the same", () => {
		expect(
			companiesWithShrunkAccess(
				map(companyWideWorkspace(["member_profile:read"])),
				map(companyWideWorkspace(READ))
			)
		).toEqual([]);
		expect(
			companiesWithShrunkAccess(
				map(companyWideWorkspace(READ)),
				map(companyWideWorkspace(READ))
			)
		).toEqual([]);
	});
});

describe("watchAccessChanges", () => {
	it("withdraws only the shrunk company's administrative data, never its self-service data", () => {
		const client = watched();
		seed(client, ["people", "c-1", "list"], administrativeMeta("c-1"), [
			"Alice",
		]);
		seed(client, ["people", "c-1", "me"], selfMeta("c-1"), { name: "Me" });
		seed(client, ["people", "c-2", "list"], administrativeMeta("c-2"), ["Zed"]);

		answer(client, companyWideWorkspace(["member_profile:read"]));

		expect(client.getQueryData(["people", "c-1", "list"])).toBeUndefined();
		expect(client.getQueryData(["people", "c-1", "me"])).toEqual({
			name: "Me",
		});
		expect(client.getQueryData(["people", "c-2", "list"])).toEqual(["Zed"]);
	});

	it("keeps everything when a grant only grows (F06: new controls appear on the next answer)", () => {
		const client = watched();
		seed(client, ["people", "c-1", "list"], administrativeMeta("c-1"), [
			"Alice",
		]);

		answer(client, companyWideWorkspace([...READ, "member_profile:update"]));

		expect(client.getQueryData(["people", "c-1", "list"])).toEqual(["Alice"]);
	});

	it("never offers a withdrawn query's rows as a placeholder, nor memoises one from before", () => {
		const client = watched();
		seed(client, ["people", "c-1", "list"], administrativeMeta("c-1"), [
			"Alice",
		]);
		seed(client, ["people", "c-1", "me"], selfMeta("c-1"), ["Me"]);
		const withdrawnQuery = client
			.getQueryCache()
			.find({ queryKey: ["people", "c-1", "list"] });
		const keptQuery = client
			.getQueryCache()
			.find({ queryKey: ["people", "c-1", "me"] });
		const before = accessiblePreviousData();

		answer(client, companyWideWorkspace(["member_profile:read"]));

		expect(accessiblePreviousData()).not.toBe(before);
		expect(accessiblePreviousData()(["Alice"], withdrawnQuery)).toBeUndefined();
		expect(accessiblePreviousData()(["Me"], keptQuery)).toEqual(["Me"]);
	});

	it("aborts a request in flight and never lets its late answer back in (F08)", async () => {
		const client = watched();
		const late = deferred<Array<string>>();
		let signal: AbortSignal | undefined;
		const fetching = client
			.fetchQuery({
				queryKey: ["leave", "c-1", "list"],
				queryFn: (context) => {
					signal = context.signal;
					return late.promise;
				},
				meta: administrativeMeta("c-1"),
			})
			.catch(() => "cancelled");

		answer(client, companyWideWorkspace(["member_profile:read"]));
		expect(signal?.aborted).toBe(true);

		late.resolve(["stale row"]);
		await expect(fetching).resolves.toBe("cancelled");
		expect(client.getQueryData(["leave", "c-1", "list"])).toBeUndefined();
		expect(
			client.getQueryCache().find({ queryKey: ["leave", "c-1", "list"] })
		).toBeUndefined();
	});

	it("drops the rows on screen and asks again, never showing them as a placeholder (F07)", async () => {
		const client = watched();
		let version = 0;
		const seen: Array<Array<string> | undefined> = [];
		const wrapper = ({
			children,
		}: {
			children: ReactNode;
		}): FunctionComponent => (
			<QueryClientProvider client={client}>{children}</QueryClientProvider>
		);
		const { result } = renderHook(
			() => {
				const list = useQuery({
					queryKey: ["people", "c-1", { page: 1 }],
					queryFn: (): Promise<Array<string>> => {
						version += 1;
						return Promise.resolve([`rows v${version}`]);
					},
					meta: administrativeMeta("c-1"),
					placeholderData: accessiblePreviousData(),
				});
				seen.push(list.data);
				return list;
			},
			{ wrapper }
		);
		await waitFor(() => {
			expect(result.current.data).toEqual(["rows v1"]);
		});
		const before = seen.length;

		answer(client, companyWideWorkspace(["member_profile:read"]));

		await waitFor(() => {
			expect(result.current.data).toEqual(["rows v2"]);
		});
		const after = seen.slice(before);
		// Once withdrawn, the old rows never render again, while the fresh ones load.
		expect(after.slice(0, -1)).not.toContainEqual(["rows v1"]);
		expect(after).toContainEqual(undefined);
	});
});
