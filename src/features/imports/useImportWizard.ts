import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import type { DownloadedFile } from "@/common/api-client";
import { saveFile } from "@/common/saveFile";
import {
	CHECK_STEP,
	IMPORT_STEP,
	TEMPLATE_STEP,
	UPLOAD_STEP,
} from "@/features/imports/importWizard";

/** What one kind of import brings to the wizard: its API calls and how it words a refusal. */
export type ImportWizardSource<Check, Refusal extends string> = {
	/** The import shown from the URL; while there is one, the wizard sits at its last step. */
	openedImportId: string | undefined;
	downloadTemplate: () => Promise<DownloadedFile>;
	/** Checks a file without saving anything. */
	checkFile: (file: File) => Promise<Check>;
	/** Why a file is refused before it is sent, if it is. */
	clientFileProblem: (file: File) => Refusal | undefined;
	/** Why the API refused a check or an import. */
	refusalCode: (error: unknown) => Refusal;
	/** Leaves the shown import, so the wizard can take another file. */
	clearShownImport: () => void;
	/** Called once a check arrives, e.g. to preset the import's options from it. */
	onChecked?: (check: Check) => void;
};

export type ImportWizard<Check, Refusal extends string> = {
	/** The step on screen: the chosen one, or the last while an import is shown. */
	currentStep: number;
	/** Moves to a step; ignored while an import is shown. */
	goTo: (step: number) => void;
	/** The file the check was made of, and that the import will send. */
	file: File | undefined;
	check: Check | undefined;
	refusal: Refusal | undefined;
	refuse: (refusal: Refusal | undefined) => void;
	templateDownloading: boolean;
	templateFailed: boolean;
	downloadTemplate: () => void;
	checking: boolean;
	/** Checks a chosen file, unless it is refused before sending. */
	choose: (file: File) => void;
	/** Whether the import is being confirmed. */
	confirming: boolean;
	openConfirm: () => void;
	closeConfirm: () => void;
	/** Back to the upload step with nothing checked or shown. */
	startOver: () => void;
};

/**
 * The state both import pages share: the step, the chosen file and its
 * check, the refusal to show, the template download and the confirmation.
 * Starting the import stays with each page, since what it sends and what it
 * does with the answer differ.
 */
export const useImportWizard = <Check, Refusal extends string>({
	openedImportId,
	downloadTemplate,
	checkFile,
	clientFileProblem,
	refusalCode,
	clearShownImport,
	onChecked,
}: ImportWizardSource<Check, Refusal>): ImportWizard<Check, Refusal> => {
	const [step, setStep] = useState(TEMPLATE_STEP);
	const [file, setFile] = useState<File | undefined>(undefined);
	const [check, setCheck] = useState<Check | undefined>(undefined);
	const [refusal, setRefusal] = useState<Refusal | undefined>(undefined);
	const [confirming, setConfirming] = useState(false);
	const template = useMutation({
		mutationFn: downloadTemplate,
		onSuccess: ({ blob, fileName }) => {
			saveFile(blob, fileName);
		},
	});
	const checking = useMutation({
		mutationFn: checkFile,
		onSuccess: (result) => {
			setCheck(result);
			onChecked?.(result);
			setStep(CHECK_STEP);
		},
		onError: (error) => {
			setRefusal(refusalCode(error));
		},
	});
	return {
		// An import named in the URL (just started, or opened from a list of imports) shows its result, whatever step the wizard was on.
		currentStep: openedImportId === undefined ? step : IMPORT_STEP,
		goTo: (next): void => {
			if (openedImportId === undefined) setStep(next);
		},
		file,
		check,
		refusal,
		refuse: setRefusal,
		templateDownloading: template.isPending,
		templateFailed: template.isError,
		downloadTemplate: (): void => {
			template.mutate();
		},
		checking: checking.isPending,
		choose: (chosen): void => {
			const problem = clientFileProblem(chosen);
			setRefusal(problem);
			if (problem) return;
			setFile(chosen);
			checking.mutate(chosen);
		},
		confirming,
		openConfirm: (): void => {
			setRefusal(undefined);
			setConfirming(true);
		},
		closeConfirm: (): void => {
			setConfirming(false);
		},
		startOver: (): void => {
			setStep(UPLOAD_STEP);
			setCheck(undefined);
			setRefusal(undefined);
			clearShownImport();
		},
	};
};
