import type { BrowserContext, Route } from "@playwright/test";
import {
	effectiveWorkspace,
	TEST_BRANCHES,
} from "@/common/testing/effectiveWorkspace";
import { approvalInstanceFixture } from "@/features/approvals/fixtures";
import { MEMBER_WEEK_FIXTURES } from "@/features/availability/fixtures";
import {
	TERMS_OVERVIEW,
	TERMS_OVERVIEW_RESPONSE,
	termsListResponse,
} from "@/features/employmentTerms/fixtures";
import { LEAVE_FIXTURES, LEAVE_TYPE_FIXTURES } from "@/features/leave/fixtures";
import { LEAVE_TYPE_CATALOGUE_FIXTURE } from "@/features/leaveTypes/fixtures";
import { notificationDemoFixtures } from "@/features/notifications/fixtures";
import { frozenConstraintsFixture } from "@/features/scheduling/constraints/fixtures";
import { coverOfferFixture } from "@/features/scheduling/coverOffers/fixtures";
import {
	generatedScheduleFixture,
	scheduleAssignmentsFixture,
	scheduleFixture,
} from "@/features/scheduling/schedules/fixtures";
import { frozenShiftsFixture } from "@/features/scheduling/shifts/fixtures";
import {
	licenceFixture,
	overviewFixture,
	skillFixture,
} from "@/features/skills/fixtures";
import { PERMISSION_KEYS } from "@/features/workspace/permissionKeys";
import { mockSessionRoutes } from "./session";

const COMPANY = "/api/v1/companies/acme";

const envelope = (route: Route, data: unknown): Promise<void> =>
	route.fulfill({
		status: 200,
		contentType: "application/json",
		body: JSON.stringify({
			success: true,
			message: "OK",
			data,
			path: new URL(route.request().url()).pathname,
			timestamp: new Date().toISOString(),
		}),
	});

/** One page holding every row, as the API answers it: the last page, with no next one. */
const pageOf = (content: Array<unknown>): unknown => ({
	content,
	page: { totalElements: content.length, hasNext: false },
});

/** Open until the second midnight (UTC) from now, so the offer's card shows and its deadline reads the same all day. */
const openCoverOffer = (): unknown => {
	const day = 24 * 60 * 60 * 1000;
	return coverOfferFixture({
		expiresAt: new Date(Math.ceil(Date.now() / day) * day + day).toISOString(),
	});
};

const emptyPage = pageOf([]);

const PEOPLE = [
	["m-2", "EMP-10517", "Aisha Rahman", "d-1", "Kitchen", "Head Chef"],
	["m-3", "EMP-10620", "Cheryl Ng", "d-1", "Kitchen", "Line Cook"],
	["m-4", "EMP-10734", "Faris Ahmad bin Abdullah", "d-2", "Bar", "Bartender"],
	["m-5", "EMP-10811", "Siti Nurhaliza", "d-2", "Bar", "Bar Supervisor"],
	["m-6", "EMP-10902", "José Cruz", "d-1", "Kitchen", "Kitchen Porter"],
].map(
	([
		membershipId,
		employeeCode,
		displayName,
		departmentId,
		departmentName,
		jobTitleName,
	]) => ({
		membershipId,
		employeeCode,
		displayName,
		email: `${String(displayName).split(" ")[0]?.toLowerCase()}@acme.test`,
		phone: "+6591234821",
		branchId: "b-1",
		branchName: "Orchard",
		departmentId,
		departmentName,
		jobTitleId: `jt-${String(jobTitleName).toLowerCase().replace(/ /g, "-")}`,
		jobTitleName,
		status: "ACTIVE",
		invitationPending: membershipId === "m-6",
	})
);

const profileDetail = (person: (typeof PEOPLE)[number]): unknown => ({
	...person,
	dateOfBirth: "1991-04-12",
	employmentType: "FULL_TIME",
	hireDate: "2023-02-01",
	probationEndDate: "2023-05-01",
	endDate: null,
	reportsTo: { membershipId: "m-5", displayName: "Siti Nurhaliza" },
});

const BRANCHES = [
	["b-1", "Orchard", "ORC", "Singapore", "SG", "Asia/Singapore"],
	["b-2", "Tampines", "TAM", "Singapore", "SG", "Asia/Singapore"],
].map(([branchId, name, code, city, country, timeZone]) => ({
	branchId,
	name,
	code,
	city,
	country,
	timeZone,
	status: "ACTIVE",
	createdAt: "2026-01-05T02:00:00Z",
}));

const DEPARTMENTS = [
	["d-1", "b-1", "Orchard", "Kitchen"],
	["d-2", "b-1", "Orchard", "Bar"],
	["d-3", "b-2", "Tampines", "Front"],
].map(([departmentId, branchId, branchName, name]) => ({
	departmentId,
	branchId,
	branchName,
	name,
	status: "ACTIVE",
	createdAt: "2026-01-05T02:00:00Z",
}));

const JOB_TITLES = PEOPLE.map((person) => ({
	jobTitleId: person.jobTitleId,
	branchId: "b-1",
	branchName: "Orchard",
	departmentId: person.departmentId,
	departmentName: person.departmentName,
	name: person.jobTitleName,
	description: `Runs the ${String(person.departmentName).toLowerCase()} during service.`,
	status: "ACTIVE",
	holderCount: 1,
	createdAt: "2026-01-05T02:00:00Z",
}));

const ACCESS_ROLES = [
	["r-1", "Company Owner", true, 1],
	["r-2", "Branch Manager", false, 2],
	["r-3", "Department Head", false, 4],
].map(([accessRoleId, name, protectedRole, holderCount]) => ({
	accessRoleId,
	name,
	protectedRole,
	status: "ACTIVE",
	permissions: PERMISSION_KEYS.slice(0, 12),
	holderCount,
}));

const AUDIT_EVENTS = [
	["Branch", "CREATE", "Tampines"],
	["Department", "UPDATE", "Kitchen"],
	["JobTitle", "CREATE", "Bar Supervisor"],
	["AccessRole", "UPDATE", "Branch Manager"],
].map(([entityType, action, entityName], index) => ({
	auditEventId: `ae-${index}`,
	action,
	entityType,
	entityId: `e-${index}`,
	entityName,
	actorDisplayName: "Owner",
	occurredAt: `2026-11-0${index + 1}T03:00:00Z`,
}));

const SKILLS = [
	overviewFixture(skillFixture(), { holders: 4 }),
	overviewFixture(licenceFixture(), { holders: 2, expiringSoon: 1 }),
];

const schedule = generatedScheduleFixture({ status: "GENERATED" });
const LEAVE = LEAVE_FIXTURES.map((request) => ({
	...request,
	branchName: "Orchard",
	departmentName: "Kitchen",
}));

/** Answers for paths under the company, matched in order; the first match wins. */
type Answer = { path: RegExp; data: () => unknown };

const ANSWERS: Array<Answer> = [
	{ path: /^\/me\/profile$/, data: () => profileDetail(PEOPLE[0]!) },
	{ path: /^\/member-profiles\/m-\d+$/, data: () => profileDetail(PEOPLE[0]!) },
	{ path: /^\/member-profiles$/, data: () => pageOf(PEOPLE) },
	{ path: /^\/me\/colleagues$/, data: () => pageOf(PEOPLE) },
	{ path: /^\/branches$/, data: () => pageOf(BRANCHES) },
	{ path: /^\/departments$/, data: () => pageOf(DEPARTMENTS) },
	{ path: /^\/job-titles$/, data: () => pageOf(JOB_TITLES) },
	{ path: /^\/access-roles\/r-\d+$/, data: () => ACCESS_ROLES[1] },
	{ path: /^\/access-roles$/, data: () => pageOf(ACCESS_ROLES) },
	{ path: /^\/audit-events$/, data: () => pageOf(AUDIT_EVENTS) },
	{ path: /^\/skill-overview$/, data: () => pageOf(SKILLS) },
	{ path: /^\/skill-categories$/, data: () => ["Food safety", "Licences"] },
	{ path: /^\/leave-requests$/, data: () => pageOf(LEAVE) },
	{ path: /^\/me\/leave-requests$/, data: () => pageOf(LEAVE.slice(0, 2)) },
	{ path: /^\/me\/leave-types$/, data: () => LEAVE_TYPE_FIXTURES },
	{ path: /^\/leave-types$/, data: () => LEAVE_TYPE_CATALOGUE_FIXTURE },
	{
		path: /^\/me\/notifications\/unread-count$/,
		data: () => ({ unreadCount: 3 }),
	},
	{
		path: /^\/me\/notifications$/,
		data: () => pageOf(notificationDemoFixtures().slice(0, 12)),
	},
	{
		path: /^\/availability$/,
		data: () => ({
			weekStartMonday: "2026-11-09",
			members: MEMBER_WEEK_FIXTURES,
		}),
	},
	{
		path: /^\/me\/approval-instances\/pending$/,
		data: () => [approvalInstanceFixture()],
	},
	{ path: /^\/me\/cover-offers$/, data: () => [openCoverOffer()] },
	// The roster's submission waits on step 1, which the owner may decide.
	{
		path: /^\/approval-instances\/ai-\d+$/,
		data: () => approvalInstanceFixture({ canDecide: true }),
	},
	{ path: /^\/approval-instances$/, data: () => [approvalInstanceFixture()] },
	{
		path: /^\/employment-terms\/overview$/,
		data: () => TERMS_OVERVIEW_RESPONSE,
	},
	{
		path: /^\/employment-terms$/,
		data: () => termsListResponse(TERMS_OVERVIEW.terms),
	},
	{
		path: /^\/schedules$/,
		data: () =>
			pageOf([
				schedule,
				scheduleFixture({ scheduleId: "s-2", name: "Bar - Week 46" }),
			]),
	},
	{ path: /^(?!\/me).*\/schedules\/s-\d+$/, data: () => schedule },
	{
		path: /\/schedules\/s-\d+\/assignments$/,
		data: () => scheduleAssignmentsFixture(),
	},
	{
		path: /\/schedules\/s-\d+\/shifts$/,
		data: () => frozenShiftsFixture(),
	},
	{
		path: /\/schedules\/s-\d+\/constraints$/,
		data: () => frozenConstraintsFixture(),
	},
	{
		path: /^\/me\/schedules\/s-\d+$/,
		data: () => ({
			scheduleId: schedule.scheduleId,
			name: schedule.name,
			branchName: schedule.branchName,
			departmentName: schedule.departmentName,
			timeZone: schedule.timeZone,
			periodStart: schedule.periodStart,
			periodEnd: schedule.periodEnd,
			assignments: scheduleAssignmentsFixture(),
		}),
	},
];

/**
 * A signed-in owner of "Acme" holding every permission company-wide, with
 * every read the app makes answered from canned data, so each route renders
 * as it would with a populated company. Writes answer 204. Returns the paths
 * that fell through to the empty default, for widening the canned data.
 */
export const mockDemoCompany = async (
	context: BrowserContext
): Promise<{ unanswered: Array<string> }> => {
	const unanswered: Array<string> = [];
	await context.route("**/api/v1/**", (route) => {
		const url = new URL(route.request().url());
		const path = url.pathname;
		if (path.startsWith("/api/v1/public/") || path === "/api/v1/me")
			return route.fallback();
		if (route.request().method() !== "GET")
			return route.fulfill({ status: 204 });
		if (path === "/api/v1/me/workspace")
			return envelope(
				route,
				effectiveWorkspace({
					companies: [
						{
							uuid: "acme",
							name: "Acme",
							permissions: [...PERMISSION_KEYS],
							branches: TEST_BRANCHES,
						},
					],
				})
			);
		const local = path.startsWith(COMPANY) ? path.slice(COMPANY.length) : path;
		const answer = ANSWERS.find((candidate) => candidate.path.test(local));
		if (answer) return envelope(route, answer.data());
		unanswered.push(`${local}${url.search}`);
		return envelope(route, emptyPage);
	});
	const session = await mockSessionRoutes(context);
	session.session = "active";
	return { unanswered };
};
