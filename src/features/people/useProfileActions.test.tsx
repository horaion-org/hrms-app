import { act, renderHook, waitFor } from "@testing-library/react";
import type * as Router from "@tanstack/react-router";
import {
	QueryClient,
	QueryClientProvider,
	useQuery,
} from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import type { FunctionComponent } from "@/common/types";
import { envelope, stubApi } from "@/common/testing/stubApi";
import {
	memberProfileQuery,
	type MemberProfileDetail,
} from "@/features/people/api";
import { profileEditValues } from "@/features/people/profileRequest";
import { useEditProfile } from "@/features/people/useEditProfile";
import { useSetProfileStatus } from "@/features/people/useProfileActions";

/** What the hooks hand navigate: the history state carries the notice. */
type NavigateOptions = {
	state: (previous: object) => { peopleNotice?: { kind: string } };
};
const navigate = vi.fn<(options: NavigateOptions) => Promise<void>>(() =>
	Promise.resolve()
);
vi.mock("@tanstack/react-router", async (importOriginal) => ({
	...(await importOriginal<typeof Router>()),
	useNavigate: (): typeof navigate => navigate,
}));

const PROFILE_PATH = "/api/v1/companies/c-1/member-profiles/m-1";

const kent: MemberProfileDetail = {
	membershipId: "m-1",
	employeeCode: "EMP-10392",
	displayName: "Kent Chua",
	email: "kent.chua@company.com",
	phone: null,
	branchId: "b-1",
	branchName: "Orchard",
	departmentId: "d-1",
	departmentName: "Kitchen",
	jobTitleId: null,
	jobTitleName: null,
	status: "ACTIVE",
	dateOfBirth: null,
	employmentType: "FULL_TIME",
	hireDate: "2025-03-01",
	probationEndDate: null,
	endDate: null,
	reportsTo: null,
	invitationPending: false,
};

beforeEach(() => {
	configureApiClient({
		accessToken: () => Promise.resolve("test-pass"),
		renew: () => Promise.resolve({ kind: "expired" }),
		onUnauthenticated: () => {},
	});
});
afterEach(() => {
	resetApiClient();
	vi.unstubAllGlobals();
	navigate.mockClear();
});

const wrapperFor =
	(client: QueryClient) =>
	({ children }: { children: ReactNode }): FunctionComponent => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	);

/** The profile on screen, whose re-read never answers, as one retrying a refused read does. */
const useProfileStuckRereading = (): void => {
	useQuery({
		queryKey: memberProfileQuery("c-1", "m-1").queryKey,
		queryFn: () => new Promise<MemberProfileDetail>(() => {}),
		initialData: kent,
	});
};

/** The notice the profile was shown again with, from navigate's history state. */
const noticeShown = (): { kind: string } | undefined =>
	navigate.mock.lastCall?.[0].state({}).peopleNotice;

const profileOn = (client: QueryClient): MemberProfileDetail | undefined =>
	client.getQueryData(memberProfileQuery("c-1", "m-1").queryKey);

describe("a saved change to a person", () => {
	it("given_aDeactivation_when_theApiAnswers_then_confirmsAndShowsItWhileTheReReadIsPending", async () => {
		stubApi({
			[`PUT ${PROFILE_PATH}`]: {
				status: 200,
				body: envelope({ ...kent, status: "INACTIVE" }),
			},
		});
		const client = new QueryClient();
		const { result } = renderHook(
			() => {
				useProfileStuckRereading();
				return useSetProfileStatus("c-1", kent);
			},
			{ wrapper: wrapperFor(client) }
		);

		act(() => {
			result.current.mutate("INACTIVE");
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});
		expect(noticeShown()?.kind).toBe("deactivated");
		expect(profileOn(client)?.status).toBe("INACTIVE");
	});

	it("given_anEdit_when_theApiAnswers_then_unlocksAndConfirmsWhileTheReReadIsPending", async () => {
		stubApi({
			[`PUT ${PROFILE_PATH}`]: {
				status: 200,
				body: envelope({ ...kent, departmentId: "d-2", departmentName: "Bar" }),
			},
		});
		const client = new QueryClient();
		const { result } = renderHook(
			() => {
				useProfileStuckRereading();
				return useEditProfile("c-1", kent, undefined);
			},
			{ wrapper: wrapperFor(client) }
		);

		await act(() =>
			result.current(
				{ ...profileEditValues(kent), departmentId: "d-2" },
				undefined,
				{ shown: false }
			)
		);

		expect(noticeShown()?.kind).toBe("saved");
		expect(profileOn(client)?.departmentName).toBe("Bar");
	});
});
