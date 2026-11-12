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
import type { CoverOffer } from "@/features/scheduling/coverOffers/api";
import {
	useCellCoverOffer,
	type CellCoverOffer,
} from "@/features/scheduling/coverOffers/useCellCoverOffer";
import { dayTypeInSentence } from "@/features/scheduling/dayTypes";
import { formatDay } from "@/features/scheduling/periods";
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
	/** A draft's change landed; the roster already shows it. */
	onApplied: (change: RosterChange) => void;
	/** A recorded yes applied the change; the roster refreshes by itself. */
	onCoverRecorded?: () => void;
};

/** Where the list stands: what the panel shows in place of the options. */
export type CoverPanelStatus =
	"loading" | "rosterMoved" | "failed" | "closed" | "nobody" | "options";

export type CoverPanel = {
	status: CoverPanelStatus;
	options: CoverOptions | undefined;
	/** The chosen option; the first (Suggested) until another is chosen. */
	selected: CoverOption | undefined;
	select: (membershipId: string) => void;
	/** After the roster moved, reads it again so the list is made afresh; otherwise asks again. */
	findAgain: () => void;
	review: {
		names: CheckNames;
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
		return rosterChangeRefusal(query.error) === "revision"
			? "rosterMoved"
			: "failed";
	if (!options || query.isPending) return "loading";
	if (options.gap.shortBy === 0) return "closed";
	return options.options.length === 0 ? "nobody" : "options";
};

/**
 * Find cover's state and calls, no words on screen: the ranked list for the
 * gap, the chosen option (the first until another is chosen), its preview
 * through the roster-change preview (the grid outlines what it touches),
 * and Apply on a draft or the offer actions on a published roster, exactly
 * as the day editor does it (`useRosterCellPanel`, `useCellCoverOffer`).
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

	const list = useQuery(coverOptionsQuery(target, gap, revision));
	const options = list.data;
	const status = statusOf(list, options);
	const shown = status === "options" ? (options?.options ?? []) : [];
	const selected =
		shown.find((option) => option.membershipId === chosen) ?? shown[0];

	const body: RosterChangeBody | undefined = selected && {
		expectedRevision: revision,
		cells: selected.cells,
	};
	const preview = useQuery(
		rosterChangePreviewQuery(
			target.companyId,
			target.unit,
			target.scheduleId,
			body
		)
	);
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
	const offer = useCellCoverOffer({
		target,
		offers: coverOffers?.offers,
		published: coverOffers !== undefined,
		assignment: candidateRow ?? dayRow,
		choice:
			candidateRow && selected
				? { kind: "shift", shiftId: gap.shiftId }
				: undefined,
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

	return {
		status,
		options,
		selected,
		select: (membershipId): void => {
			setChosen(membershipId);
			setTickedFor(null);
			apply.reset();
			offer.reset();
		},
		findAgain: (): void => {
			if (status === "rosterMoved") refreshRoster();
			else void list.refetch();
		},
		review: {
			names: {
				member: memberName,
				// The roster's own days name the shifts worked when the frozen shifts can't be read.
				shift: (id) =>
					shifts.find((shift) => shift.shiftId === id)?.name ??
					assignments.find((row) => row.shift?.shiftId === id)?.shift?.name ??
					"",
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
			applyBlocked: !preview.data || !canApply(gate, ticked, remark),
			apply: (): void => {
				if (!body || !preview.data) return;
				apply.mutate(
					{
						...body,
						remark: remark.trim() === "" ? undefined : remark.trim(),
						checksFingerprint: fingerprint ?? undefined,
					},
					{
						onSuccess: onApplied,
						onError: (error) => {
							if (rosterChangeRefusal(error) === "checksChanged")
								void preview.refetch();
						},
					}
				);
			},
			applyRefusal: apply.error ? rosterChangeRefusal(apply.error) : undefined,
			busy: apply.isPending,
		},
		offer: coverOffers && {
			...offer,
			timeZone: coverOffers.timeZone,
			ready: Boolean(preview.data) && canApply(gate, ticked, remark),
		},
	};
};
