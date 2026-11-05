import { describe, expect, it, vi } from "vitest";
import { collectPages } from "@/features/skills/useBulkAssign";

const pageOf = (
	start: number,
	length: number,
	total: number
): { items: Array<number>; total: number } => ({
	items: Array.from({ length }, (_, index) => start + index),
	total,
});

describe("collectPages", () => {
	it("stops once every row is in", async () => {
		const fetchPage = vi.fn((page: number) =>
			Promise.resolve(pageOf(page * 100, page === 0 ? 100 : 20, 120))
		);
		const result = await collectPages(fetchPage);
		expect(result.items).toHaveLength(120);
		expect(result.total).toBe(120);
		expect(fetchPage).toHaveBeenCalledTimes(2);
	});

	it("reads at most five pages, the bulk limit, and keeps the true total", async () => {
		const fetchPage = vi.fn((page: number) =>
			Promise.resolve(pageOf(page * 100, 100, 900))
		);
		const result = await collectPages(fetchPage);
		expect(result.items).toHaveLength(500);
		expect(result.total).toBe(900);
		expect(fetchPage).toHaveBeenCalledTimes(5);
	});

	it("stops at a short page even when the total says more", async () => {
		const fetchPage = vi.fn(() => Promise.resolve(pageOf(0, 3, 50)));
		const result = await collectPages(fetchPage);
		expect(result.items).toHaveLength(3);
		expect(fetchPage).toHaveBeenCalledTimes(1);
	});
});
