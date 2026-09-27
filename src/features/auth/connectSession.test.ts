import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest, resetApiClient } from "@/common/api-client";
import {
	currentUserReply,
	openApp as openAppAt,
	settled,
	type OpenedApp,
} from "@/common/testing/openApp";
import {
	accessPassReply,
	problemReply,
	stubApi,
} from "@/common/testing/stubApi";
import { endSession, signIn, signOut } from "@/features/auth/session";

const SESSIONS = "/api/v1/public/sessions";
const REFRESH = `POST ${SESSIONS}/refreshes`;
const ME = "GET /api/v1/me";

let disconnect: () => void = () => {};

const openApp = async (entry: string): Promise<OpenedApp> => {
	const app = await openAppAt(entry);
	disconnect = app.disconnect;

	return app;
};

afterEach(() => {
	disconnect();
	endSession("expired");
	resetApiClient();
	window.localStorage.clear();
	vi.unstubAllGlobals();
});

describe("guarded routes", () => {
	it("renew the Session on a fresh load and stay put", async () => {
		const calls = stubApi({
			[REFRESH]: accessPassReply(),
			[ME]: currentUserReply(),
		});

		const { router } = await openApp("/");

		expect(router.state.location.pathname).toBe("/");
		expect(calls.map((call) => call.path)).toEqual([
			`${SESSIONS}/refreshes`,
			"/api/v1/me",
		]);
	});

	it("do not renew while an access pass is held", async () => {
		const calls = stubApi({
			[`POST ${SESSIONS}`]: accessPassReply(),
			[ME]: currentUserReply(),
		});
		await signIn("jose@acme.test", "Str0ng!pass");

		const { router } = await openApp("/");

		expect(router.state.location.pathname).toBe("/");
		expect(calls.map((call) => call.method)).toEqual(["POST", "GET"]);
	});

	it.each([
		["an ended Session", problemReply(401, "SESSION_EXPIRED")],
		["an unreachable API", { status: 503 }],
	])("send %s to sign in with a return path", async (_case, reply) => {
		stubApi({ [REFRESH]: reply });

		const { router } = await openApp("/?tab=2");

		expect(router.state.location.pathname).toBe("/sign-in");
		expect(router.state.location.search).toEqual({ redirect: "/?tab=2" });
	});
});

describe("when the Session ends", () => {
	it("a refused request clears the cache and returns through sign in", async () => {
		stubApi({
			[REFRESH]: [accessPassReply(), problemReply(401, "SESSION_EXPIRED")],
			[ME]: currentUserReply(),
			"GET /api/v1/companies": problemReply(401, "UNAUTHENTICATED"),
		});
		const { router, queryClient } = await openApp("/");

		await expect(apiRequest("/api/v1/companies")).rejects.toMatchObject({
			status: 401,
		});
		await settled(router);

		expect(queryClient.getQueryData(["me"])).toBeUndefined();
		expect(router.state.location.pathname).toBe("/sign-in");
		expect(router.state.location.search).toEqual({ redirect: "/" });
	});

	it("signing out clears the cache and opens sign in without a return path", async () => {
		stubApi({
			[REFRESH]: [accessPassReply(), problemReply(401, "SESSION_EXPIRED")],
			[`DELETE ${SESSIONS}`]: { status: 204 },
			[ME]: currentUserReply(),
		});
		const { router, queryClient } = await openApp("/");
		expect(queryClient.getQueryData(["me"])).toBeDefined();

		await signOut();
		await settled(router);

		expect(queryClient.getQueryData(["me"])).toBeUndefined();
		expect(router.state.location.pathname).toBe("/sign-in");
		expect(router.state.location.search).toEqual({});
	});

	it("leaves a page that needs no Session alone", async () => {
		stubApi({});
		const { router } = await openApp("/sign-up");

		endSession("signed-out-elsewhere");
		await settled(router);

		expect(router.state.location.pathname).toBe("/sign-up");
	});
});
