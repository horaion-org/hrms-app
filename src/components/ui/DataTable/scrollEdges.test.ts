import { expect, it } from "vitest";
import { scrollEdgesOf } from "@/components/ui/DataTable/scrollEdges";

it("hides nothing when the content fits", () => {
	expect(
		scrollEdgesOf({ scrollLeft: 0, scrollWidth: 600, clientWidth: 600 })
	).toEqual({ overflowsStart: false, overflowsEnd: false });
});

it("hides content past the end until scrolled, then past both edges, then past the start", () => {
	const frame = { scrollWidth: 1200, clientWidth: 600 };
	expect(scrollEdgesOf({ ...frame, scrollLeft: 0 })).toEqual({
		overflowsStart: false,
		overflowsEnd: true,
	});
	expect(scrollEdgesOf({ ...frame, scrollLeft: 300 })).toEqual({
		overflowsStart: true,
		overflowsEnd: true,
	});
	expect(scrollEdgesOf({ ...frame, scrollLeft: 600 })).toEqual({
		overflowsStart: true,
		overflowsEnd: false,
	});
});

it("ignores less than a pixel, as zoomed screens report fractions", () => {
	expect(
		scrollEdgesOf({ scrollLeft: 0.5, scrollWidth: 1200, clientWidth: 600 })
	).toEqual({ overflowsStart: false, overflowsEnd: true });
	expect(
		scrollEdgesOf({ scrollLeft: 599.5, scrollWidth: 1200, clientWidth: 600 })
	).toEqual({ overflowsStart: true, overflowsEnd: false });
});

it("reads right-to-left frames, whose scrollLeft runs negative", () => {
	expect(
		scrollEdgesOf({ scrollLeft: -300, scrollWidth: 1200, clientWidth: 600 })
	).toEqual({ overflowsStart: true, overflowsEnd: true });
});
