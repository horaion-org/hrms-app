import { describe, expect, it } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import { managedLeaveTypeFixture } from "@/features/leaveTypes/fixtures";
import {
	initialLeaveTypeValues,
	leaveTypeBodyOf,
	leaveTypeSchema,
} from "@/features/leaveTypes/LeaveTypeDialog/schema";

describe("leave type form rules", () => {
	const schema = leaveTypeSchema(authTestI18n.t);

	it("starts a new type as a paid yearly allowance and an edit from the type", () => {
		expect(initialLeaveTypeValues(undefined)).toEqual({
			name: "",
			grantKind: "ALLOWANCE",
			paid: true,
			requiresReason: false,
		});
		expect(
			initialLeaveTypeValues({
				...managedLeaveTypeFixture({ paid: false, requiresReason: true }),
				grantKind: "UNTRACKED",
			})
		).toEqual({
			name: "Annual leave",
			grantKind: "UNTRACKED",
			paid: false,
			requiresReason: true,
		});
	});

	it("refuses a name the API would refuse and sends a valid one as typed", () => {
		expect(
			schema.safeParse({
				name: "Study <leave>",
				grantKind: "ALLOWANCE",
				paid: true,
				requiresReason: false,
			}).success
		).toBe(false);
		const values = schema.parse({
			name: "Study leave",
			grantKind: "UNTRACKED",
			paid: false,
			requiresReason: true,
		});
		expect(leaveTypeBodyOf(values)).toEqual({
			name: "Study leave",
			grantKind: "UNTRACKED",
			paid: false,
			requiresReason: true,
		});
	});
});
