/** A part of the roster day editor, top to bottom. */
export type CellPanelSectionId =
	| "issues"
	| "current"
	| "needsDecision"
	| "leaveRequested"
	| "offerOpen"
	| "stranded"
	| "readOnly"
	| "choices"
	| "offerSent"
	| "changeReview"
	| "leaveReview";

/** What decides the editor's parts for one day. */
export type CellPanelFacts = {
	/** The day has notes that need a look (`RosterDayNotes`). */
	hasIssues: boolean;
	/** A manager must decide the day. */
	needsDecision: boolean;
	/** Someone who may change leave here sees the day's pending request, with a link to it. */
	leaveRequestPending: boolean;
	/** A cover offer for the member's day is out, and not the one this panel just sent. */
	offerOpen: boolean;
	/** The leave was cancelled but the roster edit after it was refused. */
	stranded: boolean;
	/** The day offers at least one choice; otherwise it is read-only. */
	hasChoices: boolean;
	/** The choice edits the roster, so there is a change to preview. */
	previewing: boolean;
	/** The change just went out as a cover offer, which then shows in place of its review. */
	offerSent: boolean;
	/** The choice goes through Leave. */
	movingLeave: boolean;
};

/**
 * The editor's parts, in order. The day's notes come first and what the day
 * holds now always shows; then what needs acting on, then the choices (or
 * why there are none), then the review of what was chosen. A leave move that
 * edits the roster is reviewed as a roster change; one that doesn't gets the
 * leave review. A change sent as a cover offer shows the offer instead of
 * its review.
 */
export const CELL_PANEL_SECTIONS: ReadonlyArray<{
	id: CellPanelSectionId;
	shownWhen: (facts: CellPanelFacts) => boolean;
}> = [
	{ id: "issues", shownWhen: ({ hasIssues }) => hasIssues },
	{ id: "current", shownWhen: () => true },
	{ id: "needsDecision", shownWhen: ({ needsDecision }) => needsDecision },
	{
		id: "leaveRequested",
		shownWhen: ({ leaveRequestPending }) => leaveRequestPending,
	},
	{ id: "offerOpen", shownWhen: ({ offerOpen }) => offerOpen },
	{ id: "stranded", shownWhen: ({ stranded }) => stranded },
	{ id: "readOnly", shownWhen: ({ hasChoices }) => !hasChoices },
	{ id: "choices", shownWhen: ({ hasChoices }) => hasChoices },
	{
		id: "offerSent",
		shownWhen: ({ previewing, offerSent }) => previewing && offerSent,
	},
	{
		id: "changeReview",
		shownWhen: ({ previewing, offerSent }) => previewing && !offerSent,
	},
	{
		id: "leaveReview",
		shownWhen: ({ movingLeave, previewing }) => movingLeave && !previewing,
	},
];

/** The parts to show, in order. */
export const cellPanelSections = (
	facts: CellPanelFacts
): Array<CellPanelSectionId> =>
	CELL_PANEL_SECTIONS.filter(({ shownWhen }) => shownWhen(facts)).map(
		({ id }) => id
	);
