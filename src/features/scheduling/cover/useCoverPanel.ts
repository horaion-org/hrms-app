import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import {
	coverOptionsQuery,
	type CoverGapRequest,
	type CoverOption,
	type CoverOptions,
} from "@/features/scheduling/cover/api";
import {
	coverListView,
	showsBackendList,
	type CoverListView,
} from "@/features/scheduling/cover/coverListView";
import { notAssignedWithLeaveCorrected } from "@/features/scheduling/cover/notAssignedLeave";
import type {
	NotAssignedPerson,
	RepairOption,
} from "@/features/scheduling/cover/engineRepairApi";
import { stillShortToast } from "@/features/scheduling/cover/engineRepairWords";
import {
	useEngineRepair,
	type EngineRepairState,
} from "@/features/scheduling/cover/useEngineRepair";
import type { CoverOffer } from "@/features/scheduling/coverOffers/api";
import { engineOfferTargetOf } from "@/features/scheduling/coverOffers/engineOfferKind";
import {
	useCellCoverOffer,
	type CellCoverOffer,
} from "@/features/scheduling/coverOffers/useCellCoverOffer";
import { dayTypeInSentence } from "@/features/scheduling/dayTypes";
import { formatDay } from "@/common/formatDay";
import {
	rosterChangePreviewQuery,
	type RosterChange,
	type RosterChangeBody,
	type RosterChangePreview,
} from "@/features/scheduling/rosterChanges/api";
import type { CheckNames } from "@/features/scheduling/rosterChanges/checkSentence";
import {
	rosterChangeRefusal,
	type RosterChangeRefusal,
} from "@/features/scheduling/rosterChanges/rosterChangeRefusal";
import {
	applyGate,
	canApply,
	rosterCellKey,
} from "@/features/scheduling/rosterChanges/rosterEdit";
import {
	useRosterChangeActions,
	type RosterChangeTarget,
} from "@/features/scheduling/rosterChanges/useRosterChangeActions";
import {
	scheduleKey,
	type ScheduleAssignment,
	type ScheduleShift,
} from "@/features/scheduling/schedules/api";

/** What Find cover is for and where it lives. */
export type CoverPanelInput = {
	target: RosterChangeTarget;
	/** The roster revision on screen; the list and the preview are made at it. */
	revision: number;
	gap: CoverGapRequest;
	/** The whole roster, for names and each person's day. */
	assignments: ReadonlyArray<ScheduleAssignment>;
	/** Any roster row of the gap's day; the offer actions read it while nobody is chosen. */
	dayRow: ScheduleAssignment;
	/** The schedule's frozen shifts, for names. */
	shifts: ReadonlyArray<ScheduleShift>;
	/**
	 * On a published roster: its cover offers and time zone. A choice then
	 * goes out as an offer (or a recorded yes) instead of Apply.
	 */
	coverOffers?: { offers: ReadonlyArray<CoverOffer>; timeZone: string };
	/** The days the previewed change touches, as `rosterCellKey` names them. */
	onPreviewDays: (keys: ReadonlyArray<string>) => void;
	/**
	 * A draft's change landed; the roster already shows it. With an engine
	 * option that leaves hours short, the toast's words saying so.
	 */
	onApplied: (change: RosterChange, stillShort?: string) => void;
	/** A recorded yes applied the change; the roster refreshes by itself. */
	onCoverRecorded?: () => void;
};

/** Where the list stands: what the panel shows in place of the options. */
export type CoverPanelStatus =
	| "loading"
	| "rosterMoved"
	| "notEditable"
	| "failed"
	| "closed"
	| "nobody"
	| "options";

/** The list's refusals that have a status of their own; any other refusal is a plain failure. */
const REFUSAL_STATUSES: Partial<Record<RosterChangeRefusal, CoverPanelStatus>> =
	{ revision: "rosterMoved", notEditable: "notEditable" };

export type CoverPanel = {
	status: CoverPanelStatus;
	options: CoverOptions | undefined;
	/** Why each person with the gap's job title has no option, "on leave" corrected by the backend's list; null when the engine did not say. */
	notAssigned: Array<NotAssignedPerson> | null;
	/** The engine's own options for the gap, asked for as the panel opens. */
	engineRepair: EngineRepairState & { askAgain: () => void };
	/** Which list the panel shows: the engine's options, or the backend's people (`coverListView`). */
	view: CoverListView;
	/**
	 * The chosen person of the backend's list, only while that list is shown
	 * (the engine refused); until one is chosen, the first.
	 */
	selected: CoverOption | undefined;
	select: (membershipId: string) => void;
	/** A change is landing, or landed at a revision the roster does not show yet: nothing is asked meanwhile. */
	landing: boolean;
	/** Whether the change under review is one of the scheduling engine's options instead. */
	repairChosen: boolean;
	/** Reviews an engine option's change, its cells exactly as the answer gave them, in place of the chosen person. */
	chooseRepair: (option: RepairOption) => void;
	/** Lets go of the chosen person or engine option: back to the list, its default chosen again. */
	unchoose: () => void;
	/** After the roster moved, reads it again so the list is made afresh; otherwise asks again. */
	findAgain: () => void;
	review: {
		names: CheckNames;
		/**
		 * On a published roster, an engine option that changes two people: no
		 * offer can ask both, so Apply reads "They both agreed" and a remark
		 * is required.
		 */
		bothMustAgree: boolean;
		/** Apply was refused because the roster moved: Apply waits, and this finds the options again at the new revision. */
		findOptionsAgain: () => void;
		preview: RosterChangePreview | undefined;
		previewRefusal: RosterChangeRefusal | undefined;
		retryPreview: () => void;
		remark: string;
		setRemark: (remark: string) => void;
		ticked: boolean;
		setTicked: (checked: boolean) => void;
		/** A check asks for a remark, so Apply reads "Apply anyway". */
		applyAnyway: boolean;
		applyBlocked: boolean;
		apply: () => void;
		applyRefusal: RosterChangeRefusal | undefined;
		busy: boolean;
	};
	/** On a published roster: send the offer or record a yes. */
	offer: (CellCoverOffer & { timeZone: string; ready: boolean }) | undefined;
};

/** Where the list stands, from its query. */
const statusOf = (
	query: { isPending: boolean; error: Error | null },
	options: CoverOptions | undefined
): CoverPanelStatus => {
	if (query.error)
		return REFUSAL_STATUSES[rosterChangeRefusal(query.error)] ?? "failed";
	if (!options || query.isPending) return "loading";
	if (options.gap.shortBy === 0) return "closed";
	return options.options.length === 0 ? "nobody" : "options";
};

/**
 * Find cover's state and calls, no words on screen: the ranked list for the
 * gap, the engine's own answer asked for at once (`useEngineRepair`), which of
 * the two the panel lists (`coverListView`), the engine's why-not list with
 * its "on leave" corrected by the backend's (`notAssignedLeave`), the chosen
 * person of the backend's list (the first; nobody while the engine's options
 * are the list), its preview
 * through the roster-change preview (the grid outlines what it touches),
 * and Apply on a draft or the offer actions on a published roster, exactly
 * as the day editor does it (`useRosterCellPanel`, `useCellCoverOffer`). An
 * engine option chosen (`chooseRepair`) takes the chosen person's place: its
 * cells are previewed and applied as the answer gave them, at the revision
 * the engine worked them out at, and Apply says it is a repair option; on a
 * published roster one person's option is offered to them, and one that
 * changes two people is applied once both agreed, with a remark.
 */
export const useCoverPanel = ({
	target,
	revision,
	gap,
	assignments,
	dayRow,
	shifts,
	coverOffers,
	onPreviewDays,
	onApplied,
	onCoverRecorded,
}: CoverPanelInput): CoverPanel => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	const client = useQueryClient();
	const { apply } = useRosterChangeActions(target);
	const [chosen, setChosen] = useState<string>();
	const [editedRemark, setEditedRemark] = useState<string>();
	const [tickedFor, setTickedFor] = useState<string | null>(null);
	// An engine option holds for the revision on screen it was chosen at: once it lands (or the roster moves),
	// it is dropped with its preview, as a chosen person of the list is when the list is made afresh.
	const [repairChoice, setRepairChoice] = useState<{
		option: RepairOption;
		/** The revision on screen when it was chosen. */
		chosenAt: number;
		/** The revision the engine worked the option out at, which its preview and Apply are made at. */
		answerRevision: number;
	}>();
	const repairOption =
		repairChoice?.chosenAt === revision ? repairChoice.option : undefined;

	// While a change lands, and until the roster shows its revision, the list and the preview are not asked
	// again: the landing refreshes the schedule's reads, and these, keyed by the revision it passed, would only
	// be refused as stale.
	const landedRevision = apply.data?.toRevision;
	const landing =
		apply.isPending ||
		(landedRevision !== undefined && landedRevision > revision);
	const engineRepair = useEngineRepair(target, gap, revision, landing);
	const list = useQuery({
		...coverOptionsQuery(target, gap, revision),
		enabled: !landing,
	});
	const options = list.data;
	const status = statusOf(list, options);
	/** A roster member's profile id, which is how the engine names people. */
	const profileIdOf = (membershipId: string): string | undefined =>
		assignments.find((row) => row.member?.membershipId === membershipId)?.member
			?.memberProfileId;
	const engineNotAssigned =
		engineRepair.status === "ready" ? (engineRepair.notAssigned ?? null) : null;
	const notAssigned =
		engineNotAssigned && options
			? notAssignedWithLeaveCorrected(engineNotAssigned, options, profileIdOf)
			: engineNotAssigned;
	const view = coverListView(status, engineRepair.status);
	// While the engine's options are the list, nobody of the backend's list is chosen or previewed.
	const shown =
		status === "options" && showsBackendList(view) && options
			? options.options
			: [];
	const selected =
		shown.find((option) => option.membershipId === chosen) ?? shown[0];

	const body: RosterChangeBody | undefined =
		repairOption && repairChoice
			? {
					expectedRevision: repairChoice.answerRevision,
					cells: repairOption.cells,
				}
			: selected && { expectedRevision: revision, cells: selected.cells };
	const preview = useQuery({
		...rosterChangePreviewQuery(
			target.companyId,
			target.unit,
			target.scheduleId,
			body
		),
		enabled: !landing,
	});
	const fingerprint = preview.data?.checksFingerprint ?? null;
	const gate = applyGate(preview.data?.checks ?? []);
	const ticked = fingerprint !== null && tickedFor === fingerprint;

	const memberName = (membershipId: string | null): string =>
		assignments.find((row) => row.member?.membershipId === membershipId)?.member
			?.displayName ?? t("scheduling.detail.formerMember");
	const [absent] = options?.gap.absentMembershipIds ?? [];
	const remark =
		editedRemark ??
		(options?.gap.absentMembershipIds.length === 1 && absent !== undefined
			? t("scheduling.cover.remark", { name: memberName(absent) })
			: "");

	const candidateRow =
		selected &&
		assignments.find(
			(row) =>
				row.member?.membershipId === selected.membershipId &&
				row.day === gap.day
		);
	// One person's engine option is offered to them; one that changes two people is offered to nobody.
	const engineOffer =
		repairOption && engineOfferTargetOf(repairOption, assignments);
	const personChoice =
		candidateRow && selected && !repairOption
			? { kind: "shift" as const, shiftId: gap.shiftId }
			: undefined;
	const offer = useCellCoverOffer({
		target,
		offers: coverOffers?.offers,
		published: coverOffers !== undefined,
		assignment: engineOffer?.assignment ?? candidateRow ?? dayRow,
		choice: engineOffer?.choice ?? personChoice,
		offerKind: engineOffer?.offerKind,
		leaveMove: false,
		body,
		checksFingerprint: fingerprint,
		remark,
		onChecksChanged: () => {
			void preview.refetch();
		},
		onRecorded: onCoverRecorded,
	});

	const previewKeys = (body?.cells ?? [])
		.map((cell) => rosterCellKey(cell.membershipId, cell.day))
		.join(",");
	// The grid outlines what the chosen option would change.
	useEffect(() => {
		onPreviewDays(previewKeys === "" ? [] : previewKeys.split(","));
	}, [previewKeys, onPreviewDays]);

	const refreshRoster = (): void => {
		void client.invalidateQueries({
			queryKey: scheduleKey(target.companyId, target.scheduleId),
		});
	};
	const previewRefusal = preview.error
		? rosterChangeRefusal(preview.error)
		: undefined;

	const shiftName = (id: string | null): string =>
		shifts.find((shift) => shift.shiftId === id)?.name ??
		assignments.find((row) => row.shift?.shiftId === id)?.shift?.name ??
		"";
	/** What the engine option under review leaves short once applied, in the toast's words. */
	const stillShortOfChoice = (): string | undefined =>
		repairOption && stillShortToast(repairOption, shiftName(gap.shiftId), t);
	// A refusal belongs to the change it refused: once the roster is read again at another revision, the
	// change under review is another one, so the old words do not sit under it.
	const applyRefusal =
		apply.error && apply.variables?.expectedRevision === body?.expectedRevision
			? rosterChangeRefusal(apply.error)
			: undefined;
	const bothMustAgree =
		coverOffers !== undefined &&
		repairOption !== undefined &&
		repairOption.people.length > 1;

	/** A new choice starts its review afresh. */
	const startReview = (): void => {
		setTickedFor(null);
		apply.reset();
		offer.reset();
	};

	return {
		status,
		options,
		notAssigned,
		engineRepair,
		view,
		selected,
		select: (membershipId): void => {
			setChosen(membershipId);
			setRepairChoice(undefined);
			startReview();
		},
		landing,
		repairChosen: repairOption !== undefined,
		chooseRepair: (option): void => {
			setRepairChoice({
				option,
				chosenAt: revision,
				answerRevision:
					engineRepair.status === "ready" ? engineRepair.revision : revision,
			});
			startReview();
		},
		unchoose: (): void => {
			setChosen(undefined);
			setRepairChoice(undefined);
			startReview();
		},
		findAgain: (): void => {
			if (status === "rosterMoved") refreshRoster();
			else void list.refetch();
		},
		review: {
			names: {
				member: memberName,
				// The roster's own days name the shifts worked when the frozen shifts can't be read.
				shift: shiftName,
				day: (date) => formatDay(date, language),
				dayType: (code) => dayTypeInSentence(code, t),
			},
			preview: preview.data,
			previewRefusal,
			retryPreview: (): void => {
				if (previewRefusal === "revision") refreshRoster();
				else void preview.refetch();
			},
			remark,
			setRemark: setEditedRemark,
			ticked,
			setTicked: (checked): void => {
				setTickedFor(checked ? fingerprint : null);
			},
			applyAnyway: gate.needsRemark,
			applyBlocked:
				!preview.data ||
				!canApply(gate, ticked, remark) ||
				(bothMustAgree && remark.trim() === "") ||
				applyRefusal === "revision",
			apply: (): void => {
				if (!body || !preview.data) return;
				apply.mutate(
					{
						...body,
						remark: remark.trim() === "" ? undefined : remark.trim(),
						checksFingerprint: fingerprint ?? undefined,
						...(repairOption ? { repairOptionKind: repairOption.kind } : {}),
					},
					{
						onSuccess: (change) => {
							onApplied(change, stillShortOfChoice());
						},
						onError: (error) => {
							if (rosterChangeRefusal(error) === "checksChanged")
								void preview.refetch();
						},
					}
				);
			},
			applyRefusal,
			busy: apply.isPending,
			bothMustAgree,
			findOptionsAgain: (): void => {
				setChosen(undefined);
				setRepairChoice(undefined);
				startReview();
				refreshRoster();
			},
		},
		offer: coverOffers && {
			...offer,
			timeZone: coverOffers.timeZone,
			ready: Boolean(preview.data) && canApply(gate, ticked, remark),
		},
	};
};
