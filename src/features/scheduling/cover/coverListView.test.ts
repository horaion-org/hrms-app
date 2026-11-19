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
	it.each<
		[CoverPanelStatus, EngineRepairState["status"], boolean, CoverListView]
	>([
		["loading", "loading", false, "engine"],
		["options", "loading", false, "engine"],
		["options", "ready", false, "engine"],
		["failed", "ready", false, "engine"],
		["options", "refused", false, "backendFallback"],
		["nobody", "refused", false, "backendFallback"],
		["loading", "loading", true, "backendWithEngine"],
		["options", "ready", true, "backendWithEngine"],
		["options", "refused", true, "backendWithEngine"],
		["rosterMoved", "ready", false, "gapStatus"],
		["notEditable", "refused", true, "gapStatus"],
		["closed", "loading", false, "gapStatus"],
	])(
		"given a list %s, an engine %s and published %s, shows %s",
		(listStatus, engineStatus, published, view) => {
			expect(coverListView(listStatus, engineStatus, published)).toBe(view);
		}
	);
});

describe("showsBackendList", () => {
	it.each<[CoverListView, boolean]>([
		["engine", false],
		["gapStatus", false],
		["backendFallback", true],
		["backendWithEngine", true],
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
