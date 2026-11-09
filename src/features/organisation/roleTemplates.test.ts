import { describe, expect, it } from "vitest";
import contract from "../../../contracts/permission-catalog.json";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	ROLE_TEMPLATE_LIST,
	type RoleTemplate,
	startFrom,
	templatePlaces,
} from "@/features/organisation/roleTemplates";

const t = authTestI18n.t.bind(authTestI18n);
const template = (key: string): RoleTemplate => {
	const found = ROLE_TEMPLATE_LIST.find((each) => each.key === key);
	if (!found) throw new Error(`no template ${key}`);
	return found;
};

describe("role templates from the API's contract", () => {
	it("are the contract's templates, in its order, unchanged", () => {
		expect(ROLE_TEMPLATE_LIST).toEqual(contract.roleTemplates);
		expect(ROLE_TEMPLATE_LIST.map((each) => each.key)).toEqual([
			"administrator",
			"hr_manager",
			"roster_planner",
			"department_manager",
			"leave_approver",
			"viewer",
		]);
	});

	it("start a role with the template's kind and every key the person can give", () => {
		expect(startFrom(template("leave_approver"), [])).toEqual({
			kind: "LOCAL",
			permissions: [
				"member_profile:read",
				"leave_request:read",
				"leave_request:review",
			],
			leftOut: [],
		});
	});

	it("leave out what the person can't give, and what needs it", () => {
		// Reviewing needs the read, so it is left out with it; the profile view still goes in.
		const start = startFrom(template("leave_approver"), ["leave_request:read"]);
		expect(start.permissions).toEqual(["member_profile:read"]);
		expect(start.leftOut).toEqual([
			"leave_request:read",
			"leave_request:review",
		]);
	});

	it("say where a role made from them can be given", () => {
		expect(templatePlaces(template("administrator"), t, "en")).toBe(
			"the whole company"
		);
		expect(templatePlaces(template("hr_manager"), t, "en")).toBe(
			"the whole company or a branch"
		);
		expect(templatePlaces(template("roster_planner"), t, "en")).toBe(
			"the whole company, a branch, or a department"
		);
		expect(templatePlaces(template("department_manager"), t, "en")).toBe(
			"the whole company, a branch, or a department"
		);
	});
});
