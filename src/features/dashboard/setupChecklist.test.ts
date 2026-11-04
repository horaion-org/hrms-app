import { describe, expect, it } from "vitest";
import {
	isSetupDismissed,
	rememberSetupDismissed,
	setupDismissedKey,
	setupProgress,
} from "@/features/dashboard/setupChecklist";

const counts = {
	branches: 0,
	departments: 0,
	jobTitles: 0,
	members: 1,
};

describe("setupProgress", () => {
	it("ticks the organisation once a branch, a department and a job title exist", () => {
		expect(setupProgress(counts)).toEqual({
			organisationDone: false,
			peopleDone: false,
			doneCount: 0,
			complete: false,
		});
		expect(
			setupProgress({ ...counts, branches: 2, departments: 1 }).organisationDone
		).toBe(false);
		expect(
			setupProgress({ ...counts, branches: 1, departments: 1, jobTitles: 1 })
		).toMatchObject({ organisationDone: true, doneCount: 1, complete: false });
	});

	it("ticks people once someone besides the founder is a member, and completes with both", () => {
		expect(setupProgress({ ...counts, members: 2 })).toMatchObject({
			peopleDone: true,
			doneCount: 1,
		});
		expect(
			setupProgress({ branches: 1, departments: 1, jobTitles: 1, members: 2 })
				.complete
		).toBe(true);
	});
});

describe("setup dismissal", () => {
	it("remembers a dismissal per company", () => {
		const stored = new Map<string, string>();
		const storage = {
			getItem: (key: string): string | null => stored.get(key) ?? null,
			setItem: (key: string, value: string): void => {
				stored.set(key, value);
			},
		};

		rememberSetupDismissed("c-1", storage);

		expect(isSetupDismissed("c-1", storage)).toBe(true);
		expect(isSetupDismissed("c-2", storage)).toBe(false);
		expect([...stored.keys()]).toEqual([setupDismissedKey("c-1")]);
	});

	it("reads storage that throws as not dismissed, and ignores a failed write", () => {
		const broken = {
			getItem: (): string => {
				throw new Error("blocked");
			},
			setItem: (): void => {
				throw new Error("blocked");
			},
		};

		expect(isSetupDismissed("c-1", broken)).toBe(false);
		expect(() => {
			rememberSetupDismissed("c-1", broken);
		}).not.toThrow();
	});
});
