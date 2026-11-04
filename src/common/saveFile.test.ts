import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { REVOKE_DELAY_MS, saveFile } from "@/common/saveFile";

/** What the download did, in order: each click with the link's URL and name, and each URL released. */
let steps: Array<string>;

beforeEach(() => {
	steps = [];
	vi.useFakeTimers();
	vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:file-1");
	vi.spyOn(URL, "revokeObjectURL").mockImplementation((url) => {
		steps.push(`revoke ${url}`);
	});
	vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
		this: HTMLAnchorElement
	) {
		steps.push(`click ${this.href} as ${this.download}`);
	});
});
afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe("saveFile", () => {
	it("given_aFile_when_saved_then_clicksALinkNamingItAndRemovesTheLink", () => {
		saveFile(new Blob(["a,b"]), "people.csv");

		expect(steps).toEqual(["click blob:file-1 as people.csv"]);
		expect(document.querySelector("a")).toBeNull();
	});

	it("given_theClickReturned_when_theDelayPasses_then_releasesTheUrlOnlyThen", () => {
		saveFile(new Blob(["a,b"]), "people.csv");

		// Safari and Firefox start the download after click() returns: the URL must still be live.
		vi.advanceTimersByTime(REVOKE_DELAY_MS - 1);
		expect(steps).toEqual(["click blob:file-1 as people.csv"]);

		vi.advanceTimersByTime(1);
		expect(steps).toEqual([
			"click blob:file-1 as people.csv",
			"revoke blob:file-1",
		]);
	});
});
