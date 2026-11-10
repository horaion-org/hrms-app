import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
	formerMemberRefSchema,
	memberRefSchema,
	pagedSchema,
} from "@/common/schemas";

describe("member references", () => {
	it.each([
		[{ membershipId: "m-1", displayName: "Ana" }, true, true],
		[{ membershipId: "m-1", displayName: null }, false, true],
		[{ membershipId: "m-1" }, false, false],
		[{ displayName: "Ana" }, false, false],
	])("reads %j: current %s, former %s", (body, current, former) => {
		expect(memberRefSchema.safeParse(body).success).toBe(current);
		expect(formerMemberRefSchema.safeParse(body).success).toBe(former);
	});

	it("keeps only the reference's own fields", () => {
		expect(
			memberRefSchema.parse({
				membershipId: "m-1",
				displayName: "Ana",
				email: "kept out",
			})
		).toEqual({ membershipId: "m-1", displayName: "Ana" });
	});
});

describe("pagedSchema", () => {
	const page = pagedSchema(z.object({ id: z.string() }));

	it("reads the page's items and the total", () => {
		expect(
			page.parse({
				content: [{ id: "a" }],
				page: { totalElements: 12, size: 1 },
			})
		).toEqual({ content: [{ id: "a" }], page: { totalElements: 12 } });
	});

	it.each([
		{ content: [{ id: 1 }], page: { totalElements: 1 } },
		{ content: [], page: { totalElements: -1 } },
		{ content: [] },
	])("refuses %j", (body) => {
		expect(page.safeParse(body).success).toBe(false);
	});
});
