import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";
import { formatDay } from "@/features/scheduling/periods";
import {
	latestRosterChangeQuery,
	type RosterChange,
	type RosterChangePreview,
	type RosterUndoBody,
} from "@/features/scheduling/rosterChanges/api";
import { rosterChangeRefusal } from "@/features/scheduling/rosterChanges/rosterChangeRefusal";
import { applyGate } from "@/features/scheduling/rosterChanges/rosterEdit";
import {
	useRosterChangeActions,
	type RosterChangeTarget,
} from "@/features/scheduling/rosterChanges/useRosterChangeActions";
import { UndoRosterChangeDialog } from "@/features/scheduling/UndoRosterChangeDialog";

export type LastRosterChangeProps = {
	/** Where the roster lives and which run's rows are shown. */
	target: RosterChangeTarget;
	/** The roster revision on screen; the latest change is read at it. */
	revision: number;
	/** A change the person just applied: confirmed in a toast that offers Undo. */
	applied?: RosterChange;
	/** The toast went away, by itself or after Undo. */
	onAppliedDismissed: () => void;
	/** The roster is published: an undo tells the people whose days it changes back, so it always asks first. */
	notifiesMembers?: boolean;
	/** Shows the "Last change … Undo" line; the roster shows it only in its Changed panel. The toast always shows. */
	showsLatest?: boolean;
	className?: string;
};

/** How long the toast with Undo stays, so there is time to reach it. */
const UNDO_TOAST_MS = 10_000;

const key = "scheduling.rosterEdit";

/**
 * The way back from the roster's latest hand change: a toast right after
 * applying ("Roster changed. Undo"), then a line in the Changed panel until the
 * next change ("Last change: Ben Tan, Sat 17 Oct · Undo"). A swap names both
 * people. An undo is an edit back: it is previewed first, applied at once
 * when nothing stands against it, and otherwise asked about with the same
 * checks, tick and remark as an edit. On a published roster it is always
 * asked about, since people are told. Undoing lands like any change.
 */
export const LastRosterChange = ({
	target,
	revision,
	applied,
	onAppliedDismissed,
	notifiesMembers = false,
	showsLatest = true,
	className,
}: LastRosterChangeProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = i18n.resolvedLanguage ?? i18n.language;
	const latest = useQuery(
		latestRosterChangeQuery(
			target.companyId,
			target.unit,
			target.scheduleId,
			revision,
			showsLatest
		)
	);
	const { previewUndo, undo } = useRosterChangeActions(target);
	// An undo whose checks ask for something, or refuse it, is asked about first.
	const [asking, setAsking] = useState<{
		change: RosterChange;
		preview: RosterChangePreview;
	}>();
	const runUndo = (change: RosterChange, body: RosterUndoBody): void => {
		undo.mutate(
			{ changeId: change.changeId, body },
			{
				onSuccess: () => {
					setAsking(undefined);
					onAppliedDismissed();
				},
			}
		);
	};
	const undoChange = (change: RosterChange): void => {
		previewUndo.mutate(
			{ changeId: change.changeId, expectedRevision: change.toRevision },
			{
				onSuccess: (preview) => {
					const gate = applyGate(preview.checks);
					if (notifiesMembers || gate.refused || gate.needsTick)
						setAsking({ change, preview });
					else runUndo(change, { expectedRevision: change.toRevision });
				},
			}
		);
	};
	const failure = asking
		? previewUndo.error
		: (undo.error ?? previewUndo.error);
	const edit =
		latest.data?.kind === "EDIT" && latest.data.undoable
			? latest.data
			: undefined;
	const summaryOf = (change: RosterChange): string => {
		const name = (index: number): string =>
			change.cells[index]?.displayName ?? t("scheduling.detail.formerMember");
		const date = formatDay(change.cells[0]?.day ?? change.appliedAt, language);
		return change.cells.length === 2
			? t(`${key}.summarySwap`, { first: name(0), second: name(1), date })
			: t(`${key}.summaryOne`, { name: name(0), date });
	};
	return (
		<>
			{showsLatest && edit && (
				<div
					className={joinClassNames(
						"flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-800",
						className
					)}
				>
					<span>{t(`${key}.lastChange`, { summary: summaryOf(edit) })}</span>
					<Button
						disabled={undo.isPending || previewUndo.isPending}
						variant="textlink"
						onClick={() => {
							undoChange(edit);
						}}
					>
						{t(`${key}.undo`)}
					</Button>
				</div>
			)}
			{failure && (
				<p className="mt-2 text-sm text-error-700" role="alert">
					{t(`${key}.error.${rosterChangeRefusal(failure)}`)}
				</p>
			)}
			{asking && (
				<UndoRosterChangeDialog
					notifiesMembers={notifiesMembers}
					preview={asking.preview}
					submitting={undo.isPending}
					error={
						undo.error
							? t(`${key}.error.${rosterChangeRefusal(undo.error)}`)
							: undefined
					}
					onClose={() => {
						setAsking(undefined);
						undo.reset();
					}}
					onConfirm={(body) => {
						runUndo(asking.change, body);
					}}
				/>
			)}
			{applied && (
				<Toast
					key={applied.changeId}
					duration={UNDO_TOAST_MS}
					action={{
						label: t(`${key}.undo`),
						onClick: () => {
							undoChange(applied);
						},
					}}
					onDismiss={onAppliedDismissed}
				>
					{t(`${key}.applied`)}
				</Toast>
			)}
		</>
	);
};
