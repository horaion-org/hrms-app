import { describe, expect, it } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import { createBranchSchema } from "@/features/organisation/CreateBranchDialog/schema";

const schema = createBranchSchema(authTestI18n.t.bind(authTestI18n));
const head = { membershipId: "m-1", displayName: "Marcus", status: "ACTIVE" };
describe("create branch validation", () => {
	it.each(["Orchard Road", "École & Sons", "東京 2", "O'Neill-West."])(
		"accepts allowed Unicode names: %s",
		(name) => {
			expect(
				schema.safeParse({
					name,
					code: "ORC",
					city: "Singapore",
					country: "SG",
					heads: [head],
				}).success
			).toBe(true);
		}
	);
	it.each([" ", " A ", "Invalid_", "x".repeat(101)])(
		"rejects invalid names: %s",
		(name) => {
			expect(
				schema.safeParse({
					name,
					code: "ORC",
					city: "Singapore",
					country: "SG",
					heads: [head],
				}).success
			).toBe(false);
		}
	);
	it("requires one to twenty heads", () => {
		expect(
			schema.safeParse({
				name: "Orchard",
				code: "ORC",
				city: "Singapore",
				country: "SG",
				heads: [],
			}).success
		).toBe(false);
		expect(
			schema.safeParse({
				name: "Orchard",
				code: "ORC",
				city: "Singapore",
				country: "SG",
				heads: Array.from({ length: 20 }, () => head),
			}).success
		).toBe(true);
		expect(
			schema.safeParse({
				name: "Orchard",
				code: "ORC",
				city: "Singapore",
				country: "SG",
				heads: Array.from({ length: 21 }, () => head),
			}).success
		).toBe(false);
	});
});
