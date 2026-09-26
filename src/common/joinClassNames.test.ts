import { describe, expect, it } from "vitest";
import { joinClassNames } from "@/common/joinClassNames";

describe("joinClassNames", () => {
	it("joins set class names in order and skips unset ones", () => {
		expect(
			joinClassNames("flex", undefined, false, null, "", "consumer-layout")
		).toBe("flex consumer-layout");
	});
});
