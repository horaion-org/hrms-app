import type { SelectOption } from "@/components/forms/Select";
import type { CellCoverOffer } from "@/features/scheduling/coverOffers/useCellCoverOffer";
import type { LeaveLinkSearch } from "@/features/scheduling/RosterDayNotes/leaveLinkSearch";
import type { RosterChangePreview } from "@/features/scheduling/rosterChanges/api";
import type { CellPanelFacts } from "@/features/scheduling/rosterChanges/cellPanelSections";
import type { CheckNames } from "@/features/scheduling/rosterChanges/checkSentence";
import type { RosterChangeRefusal } from "@/features/scheduling/rosterChanges/rosterChangeRefusal";
import type {
	NotWorkingWording,
	SwapPartners,
} from "@/features/scheduling/rosterChanges/rosterEdit";
import type {
	RosterLeaveRefusal,
	RosterPanelMode,
} from "@/features/scheduling/rosterChanges/rosterLeave";
import type { ScheduleShift } from "@/features/scheduling/schedules/api";

/*
 * What the roster day editor shows and can do, as `useRosterCellPanel`
 * returns it. The panel and its sections render from these alone.
 */

/** The leave was cancelled but the roster edit after it was refused: why, and whether the day now reads as flagged. */
export type StrandedLeave = { refusal: RosterChangeRefusal; flagged: boolean };

/** The day's choices and what is picked for each. */
export type CellChoicesState = {
	modes: Array<RosterPanelMode>;
	mode: RosterPanelMode | undefined;
	chooseMode: (mode: RosterPanelMode) => void;
	shiftChoices: Array<ScheduleShift>;
	shiftId: string | undefined;
	setShiftId: (shiftId: string) => void;
	/** How the choice not to work the day reads. */
	notWorkingWording: NotWorkingWording;
	/** The types the day not worked can take; none hides the choice and sends no type. */
	dayTypes: Array<string>;
	dayType: string | undefined;
	setDayType: (dayType: string) => void;
	partners: SwapPartners;
	partnerId: string | undefined;
	setPartnerId: (assignmentId: string) => void;
	leaveOptions: Array<SelectOption>;
	leaveType: string | undefined;
	setLeaveType: (leaveType: string) => void;
};

/** The review of a roster change: the preview, its checks and Apply. */
export type CellChangeReviewState = {
	names: CheckNames;
	preview: RosterChangePreview | undefined;
	previewRefusal: RosterChangeRefusal | undefined;
	retryPreview: () => void;
	applyRefusal: RosterChangeRefusal | undefined;
	leaveFailure: RosterLeaveRefusal | undefined;
	remark: string;
	setRemark: (remark: string) => void;
	/** Every leave move asks for a remark, whatever the checks say. */
	remarkRequired: boolean;
	ticked: boolean;
	setTicked: (ticked: boolean) => void;
	/** The checks ask for a remark, so Apply reads "Apply anyway". */
	applyAnyway: boolean;
	applyBlocked: boolean;
	applyChange: () => void;
	busy: boolean;
};

/** The review of a leave move that doesn't edit the roster. */
export type CellLeaveReviewState = {
	change: { before: string; after: string };
	notes: Array<string>;
	leaveFailure: RosterLeaveRefusal | undefined;
	remark: string;
	setRemark: (remark: string) => void;
	applyBlocked: boolean;
	applyLeaveMove: () => void;
	busy: boolean;
};

/** On a published roster with cover offers: the day's offers, and sending, recording and withdrawing one. */
export type CellCoverOfferState = CellCoverOffer & {
	/** The roster's time zone, which an offer's deadline reads in. */
	timeZone: string;
	/** The change is previewed and its checks answered, so an offer may go out. */
	ready: boolean;
};

/** On a published roster, Apply asks first how many people will be told. */
export type CellApplyConfirmation = {
	count: number;
	submitting: boolean;
	confirm: () => void;
	close: () => void;
};

export type RosterCellPanelState = {
	/** Whose day, or "Former member". */
	name: string;
	/** The day, formatted for reading. */
	day: string;
	language: string;
	/** What decides which parts of the panel show. */
	facts: CellPanelFacts;
	/** The viewer's own day: nobody changes their own leave. */
	ownDay: boolean;
	leaveDay: boolean;
	/** The Leave page's search for the day's request, for someone who may change leave here. */
	requestLink: LeaveLinkSearch | undefined;
	/** How many days the day's request covers; 1 until it is read. */
	requestDays: number;
	stranded: StrandedLeave | undefined;
	choices: CellChoicesState;
	changeReview: CellChangeReviewState;
	leaveReview: CellLeaveReviewState;
	/** Undefined on a roster that asks nobody (a draft, or no offers given). */
	coverOffer: CellCoverOfferState | undefined;
	confirmation: CellApplyConfirmation | undefined;
};
