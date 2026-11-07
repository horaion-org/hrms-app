import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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
	it("marks a day cancelled leave left to decide", () => {
		render(
			<RosterDayNotes
				membershipId={MEMBER}
				note={{ flag: "NEEDS_DECISION" }}
				viewerMembershipId={VIEWER}
			/>
		);

		expect(
			screen.getByText("scheduling.rosterMarkers.needsDecision")
		).toBeVisible();
	});

	it("shows a day needing attention with no link and nothing of leave", () => {
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
			screen.getByRole("link", {
				name: "scheduling.rosterMarkers.openInLeave",
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

	it("says the leave type to sighted users as well", () => {
		render(
			<RosterDayNotes
				membershipId={MEMBER}
				note={{
					flag: "ON_LEAVE_WHILE_ROSTERED",
					leaveRequestId: "r1",
					leaveTypeName: "Medical",
				}}
			/>
		);
		expect(
			screen.getByText("scheduling.rosterMarkers.onLeave")
		).toHaveAttribute("title", "scheduling.rosterMarkers.onLeave: Medical");
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

	it.each(["UNKNOWN"] as const)(
		"renders nothing at all for %s alone",
		(flag) => {
			const { container } = render(
				<RosterDayNotes membershipId={MEMBER} note={{ flag }} />
			);
			expect(container).toBeEmptyDOMElement();
		}
	);
});
