import { describe, expect, it } from "vitest";
import {
	headsSchema,
	MAX_HEADS,
	unitNameSchema,
} from "@/features/organisation/createSchemas";

const name = unitNameSchema({
	required: "required",
	length: "length",
	characters: "characters",
});
const heads = headsSchema({ required: "required", max: "max" });
const head = { membershipId: "m-1", displayName: "Marcus", status: "ACTIVE" };
const messageOf = (result: {
	success: boolean;
	error?: { issues: Array<{ message: string }> };
}): string | undefined => result.error?.issues[0]?.message;

describe("unit name rule", () => {
	it.each(["Front of house", "École & Sons", "東京 2", "O'Neill-West."])(
		"accepts %s",
		(value) => {
			expect(name.safeParse(value).success).toBe(true);
		}
	);
	it("trims before checking", () => {
		expect(name.parse("  Kitchen  ")).toBe("Kitchen");
	});
	it.each([
		["   ", "required"],
		[" A ", "length"],
		["x".repeat(101), "length"],
		["Invalid_", "characters"],
	])("rejects %j with %s", (value, message) => {
		expect(messageOf(name.safeParse(value))).toBe(message);
	});
});

describe("heads rule", () => {
	it("requires one to twenty people", () => {
		expect(messageOf(heads.safeParse([]))).toBe("required");
		expect(
			heads.safeParse(Array.from({ length: MAX_HEADS }, () => head)).success
		).toBe(true);
		expect(
			messageOf(
				heads.safeParse(Array.from({ length: MAX_HEADS + 1 }, () => head))
			)
		).toBe("max");
	});
});
