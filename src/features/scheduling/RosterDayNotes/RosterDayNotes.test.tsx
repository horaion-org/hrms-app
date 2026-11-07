import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { FindingNames } from "@/features/scheduling/roster/findings/findingNames";
import { leaveLinkSearch } from "./leaveLinkSearch";
import { RosterDayNotes } from "./RosterDayNotes";

vi.mock("@tanstack/react-router", () => ({
	Link: ({
		search,
		children,
		...rest
	}: {
		search: Record<string, string>;
		children: React.ReactNode;
		"aria-label"?: string;
	}): React.JSX.Element => (
		<a
			aria-label={rest["aria-label"]}
			href={`/leave?${new URLSearchParams(search).toString()}`}
		>
			{children}
		</a>
	),
}));

const MEMBER = "member-1";
const VIEWER = "viewer-1";
const NO_NAMES: FindingNames = {
	members: new Map(),
	shifts: new Map(),
	jobTitles: new Map(),
	rules: new Map(),
};

describe("leaveLinkSearch", () => {
	it("opens someone else's request as a reviewer, by their membership", () => {
		expect(leaveLinkSearch("r1", MEMBER, VIEWER)).toEqual({
			requestId: "r1",
			memberId: MEMBER,
			view: "requests",
		});
	});

	it("opens the viewer's own request in My leave", () => {
		expect(leaveLinkSearch("r1", VIEWER, VIEWER)).toEqual({ requestId: "r1" });
	});

	it("does not link a member who no longer resolves", () => {
		expect(leaveLinkSearch("r1", null, VIEWER)).toBeUndefined();
	});
});

describe("RosterDayNotes", () => {
	it("says a day cancelled leave left to decide, under one heading", () => {
		render(
			<RosterDayNotes
				membershipId={MEMBER}
				note={{ flag: "NEEDS_DECISION" }}
				viewerMembershipId={VIEWER}
			/>
		);

		const section = screen.getByRole("region", {
			name: "scheduling.rosterMarkers.needsALook",
		});
		expect(
			within(section).getByText("scheduling.rosterMarkers.needsDecision")
		).toBeVisible();
	});

	it("says a day needing attention with no link and nothing of leave", () => {
		render(
			<RosterDayNotes
				membershipId={MEMBER}
				note={{ flag: "NEEDS_ATTENTION" }}
				viewerMembershipId={VIEWER}
			/>
		);

		expect(
			screen.getByText("scheduling.rosterMarkers.needsAttention")
		).toBeVisible();
		expect(screen.queryByRole("link")).toBeNull();
	});

	it("links a colleague's pending request to the reviewer's view of it", () => {
		render(
			<RosterDayNotes
				membershipId={MEMBER}
				viewerMembershipId={VIEWER}
				note={{
					flag: "LEAVE_REQUESTED",
					leaveRequestId: "r1",
					leaveTypeName: "Annual leave",
				}}
			/>
		);

		expect(
			screen.getByText("scheduling.rosterMarkers.leaveRequested: Annual leave")
		).toBeVisible();
		expect(
			screen.getByRole("link", {
				name: "scheduling.rosterEdit.reviewInLeave",
			})
		).toHaveAttribute(
			"href",
			`/leave?requestId=r1&memberId=${MEMBER}&view=requests`
		);
	});

	it("links the viewer's own leave to My leave", () => {
		render(
			<RosterDayNotes
				membershipId={VIEWER}
				note={{ flag: "ON_LEAVE_WHILE_ROSTERED", leaveRequestId: "r1" }}
				viewerMembershipId={VIEWER}
			/>
		);

		expect(screen.getByRole("link")).toHaveAttribute(
			"href",
			"/leave?requestId=r1"
		);
	});

	it("names the short shift without a leave link", () => {
		render(
			<RosterDayNotes
				membershipId={MEMBER}
				note={{ uncoveredShiftName: "Morning" }}
			/>
		);

		expect(
			screen.getByText("scheduling.rosterMarkers.needsCover")
		).toBeInTheDocument();
		expect(screen.queryByRole("link")).not.toBeInTheDocument();
	});

	it("leaves out what the day editor says in its own words", () => {
		render(
			<RosterDayNotes
				membershipId={MEMBER}
				note={{ flag: "NEEDS_DECISION", uncoveredShiftName: "Morning" }}
				saidApart={new Set(["decision", "leaveRequested"])}
			/>
		);

		expect(
			screen.queryByText("scheduling.rosterMarkers.needsDecision")
		).toBeNull();
		expect(
			screen.getByText("scheduling.rosterMarkers.needsCover")
		).toBeInTheDocument();
	});

	it("lists what the engine left on the day before the leave lines", () => {
		render(
			<RosterDayNotes
				membershipId={MEMBER}
				note={{ uncoveredShiftName: "Morning" }}
				findings={{
					list: [
						{ kind: "message", date: "2026-10-18", message: "Covers alone." },
					],
					names: NO_NAMES,
				}}
			/>
		);

		const items = screen.getAllByRole("listitem");
		expect(items.map((item) => item.textContent)).toEqual([
			"Covers alone.",
			"scheduling.rosterMarkers.needsCover",
		]);
	});

	it.each([
		["a flag the app does not know", { flag: "UNKNOWN" as const }],
		["no note", undefined],
	])("renders nothing at all for %s", (_, note) => {
		const { container } = render(
			<RosterDayNotes membershipId={MEMBER} note={note} />
		);
		expect(container).toBeEmptyDOMElement();
	});
});
