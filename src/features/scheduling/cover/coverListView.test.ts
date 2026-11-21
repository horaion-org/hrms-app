import { describe, expect, it } from "vitest";
import {
	coverListView,
	refusalLineKey,
	showsBackendList,
	type CoverListView,
} from "@/features/scheduling/cover/coverListView";
import type { RepairRefusal } from "@/features/scheduling/cover/engineRepairWords";
import type { EngineRepairState } from "@/features/scheduling/cover/useEngineRepair";
import type { CoverPanelStatus } from "@/features/scheduling/cover/useCoverPanel";

describe("coverListView", () => {
	it.each<[CoverPanelStatus, EngineRepairState["status"], CoverListView]>([
		["loading", "loading", "engine"],
		["options", "loading", "engine"],
		["options", "ready", "engine"],
		["failed", "ready", "engine"],
		["options", "refused", "backendFallback"],
		["nobody", "refused", "backendFallback"],
		["rosterMoved", "ready", "gapStatus"],
		["notEditable", "refused", "gapStatus"],
		["closed", "loading", "gapStatus"],
	])(
		"given a list %s and an engine %s, shows %s, published or not",
		(listStatus, engineStatus, view) => {
			expect(coverListView(listStatus, engineStatus)).toBe(view);
		}
	);
});

describe("showsBackendList", () => {
	it.each<[CoverListView, boolean]>([
		["engine", false],
		["gapStatus", false],
		["backendFallback", true],
	])("for %s is %s", (view, shown) => {
		expect(showsBackendList(view)).toBe(shown);
	});
});

describe("refusalLineKey", () => {
	it.each<[RepairRefusal, string]>([
		["notConnected", "scheduling.cover.engine.unreachable"],
		["tooSlow", "scheduling.cover.engine.unreachable"],
		["failed", "scheduling.cover.engine.unreachable"],
		["notSeenByEngine", "scheduling.cover.engine.refusal.notSeenByEngine"],
		["expired", "scheduling.cover.engine.refusal.expired"],
		["rosterMoved", "scheduling.cover.engine.refusal.rosterMoved"],
	])("words %s with %s", (refusal, key) => {
		expect(refusalLineKey(refusal)).toBe(key);
	});
});
