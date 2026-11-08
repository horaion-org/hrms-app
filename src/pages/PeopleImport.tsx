import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toCsvBlob } from "@/common/csv";
import { saveFile } from "@/common/saveFile";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DownloadIcon } from "@/components/ui/Icon";
import { Stepper, StepperStep } from "@/components/ui/Stepper";
import { Toast } from "@/components/ui/Toast";
import { ImportHistory } from "@/features/imports/ImportHistory";
import { mergeImportHistory } from "@/features/imports/importHistory";
import { ImportTemplateStep } from "@/features/imports/ImportTemplateStep";
import { ImportUploadStep } from "@/features/imports/ImportUploadStep";
import {
	CHECK_STEP,
	IMPORT_STEP,
	IMPORT_STEPS,
	TEMPLATE_STEP,
	UPLOAD_STEP,
} from "@/features/imports/importWizard";
import { useImportWizard } from "@/features/imports/useImportWizard";
import { useCurrentCompanyId } from "@/features/organisation/useCurrentCompanyId";
import { ImportCheckPanel } from "@/features/people/ImportCheckPanel";
import { ImportResultPanel } from "@/features/people/ImportResultPanel";
import {
	checkImportFile,
	downloadImportTemplate,
	IMPORT_COLUMNS,
	IMPORT_EXTENSIONS,
	memberImportQuery,
	recentImportsQuery,
	startImport,
	type ImportCheck,
} from "@/features/people/import/api";
import {
	clientFileProblem,
	errorRowsCsv,
	importInvitations,
	refusalCode,
	resultRowsCsv,
	type RefusalCode,
} from "@/features/people/import/importText";
import { useImportInvitations } from "@/features/people/import/useImportInvitations";
import { useAccess } from "@/features/workspace/useAccess";

const route = getRouteApi("/_authenticated/_app/settings_/data/import-people");

/**
 * Importing people from a spreadsheet in four steps: download the template,
 * upload a file, read its check (nothing saved yet) and import it, then follow
 * the import in the background. The import being followed lives in the URL,
 * so leaving and coming back, or a link from Import history, reopens it.
 * Once it ends, everyone it added who has not signed in yet can be invited in
 * one go, within the day's invitation limit.
 */
export const PeopleImport = (): FunctionComponent => {
	const companyId = useCurrentCompanyId();
	const { t, i18n } = useTranslation();
	const navigate = route.useNavigate();
	const search = route.useSearch();
	const client = useQueryClient();
	const [sendInvitations, setSendInvitations] = useState(false);
	// Set when the person chose to import the valid rows only.
	const [skipInvalid, setSkipInvalid] = useState(false);
	const openedImportId = search.import;
	const wizard = useImportWizard<ImportCheck, RefusalCode>({
		openedImportId,
		downloadTemplate: () => downloadImportTemplate(companyId),
		checkFile: (chosen) => checkImportFile(companyId, chosen),
		clientFileProblem,
		refusalCode,
		clearShownImport: () => {
			void navigate({ search: {} });
		},
		onChecked: (result) => {
			setSendInvitations(result.invitationsAvailable);
		},
	});
	const current = useQuery({
		...memberImportQuery(companyId, openedImportId ?? ""),
		enabled: openedImportId !== undefined,
	});
	const recent = useQuery(recentImportsQuery(companyId));
	// Whoever may add people may invite the ones an import added.
	const canInvite = useAccess().canAnywhere("member_profile:create");
	const invitations = current.data && importInvitations(current.data);
	const inviting = useImportInvitations(companyId, openedImportId ?? "");
	const [confirmingInvite, setConfirmingInvite] = useState(false);
	const [inviteToast, setInviteToast] = useState<{
		id: number;
		text: string;
	}>();
	const starting = useMutation({
		mutationFn: (chosen: File) =>
			startImport(companyId, chosen, { sendInvitations, skipInvalid }),
		onSuccess: (started) => {
			wizard.closeConfirm();
			void navigate({ search: { import: started.importId } });
		},
		onError: (error) => {
			wizard.closeConfirm();
			wizard.refuse(refusalCode(error));
		},
	});
	const ended =
		current.data?.status === "COMPLETED" || current.data?.status === "FAILED";
	// Once an import ends, the People list and Import history show what it added.
	useEffect(() => {
		if (ended)
			void client.invalidateQueries({ queryKey: ["people", companyId] });
	}, [ended, client, companyId]);

	const { check, currentStep, file, refusal } = wizard;
	const refusalText = refusal && t(`people.importPage.refusals.${refusal}`);
	const blocked =
		!check ||
		check.errorRows > 0 ||
		check.readyRows === 0 ||
		check.runningImportId !== null;
	const hasErrors = check !== undefined && check.errorRows > 0;
	const canImportValidRowsOnly =
		hasErrors && check.partialImportAllowed && check.runningImportId === null;
	// Some rows are ready, but more than half have errors: likely the wrong file or columns.
	const mostlyInvalid =
		hasErrors && !check.partialImportAllowed && check.readyRows > 0;
	const openConfirm = (validRowsOnly: boolean): void => {
		setSkipInvalid(validRowsOnly);
		wizard.openConfirm();
	};

	return (
		<>
			<h1 className="text-4xl font-medium text-neutral-900">
				{t("people.importPage.title")}
			</h1>
			<p className="mt-4 text-sm text-neutral-800">
				{t("people.importPage.subtitle")}
			</p>
			<Stepper
				className="mt-10"
				currentStep={currentStep}
				onStepClick={wizard.goTo}
			>
				{IMPORT_STEPS.map((name) => (
					<StepperStep
						key={name}
						label={t(`people.importPage.steps.${name}`)}
					/>
				))}
			</Stepper>
			<div className="mt-10">
				{currentStep === TEMPLATE_STEP && (
					<ImportTemplateStep
						downloadFailed={wizard.templateFailed}
						downloading={wizard.templateDownloading}
						textPrefix="people.importPage"
						onDownload={wizard.downloadTemplate}
						onNext={() => {
							wizard.goTo(UPLOAD_STEP);
						}}
					/>
				)}
				{currentStep === UPLOAD_STEP && (
					<ImportUploadStep
						accept={IMPORT_EXTENSIONS}
						checking={wizard.checking}
						refusalText={refusalText}
						textPrefix="people.importPage"
						helpItems={IMPORT_COLUMNS.map((column) =>
							t(`people.importPage.help.${column}`)
						)}
						onFileChange={wizard.choose}
						onBack={() => {
							wizard.goTo(TEMPLATE_STEP);
						}}
					/>
				)}
				{currentStep === CHECK_STEP && check && (
					<section>
						<ImportCheckPanel
							check={check}
							onUploadAgain={wizard.startOver}
							onDownloadErrors={() => {
								saveFile(
									toCsvBlob(errorRowsCsv(check.rows, t)),
									"people-to-fix.csv"
								);
							}}
						/>
						{check.runningImportId !== null && (
							<p className="mt-6 text-sm text-error-700" role="alert">
								{t("people.importPage.check.running")}
							</p>
						)}
						{refusalText && (
							<p className="mt-6 text-sm text-error-700" role="alert">
								{refusalText}
							</p>
						)}
						<Checkbox
							checked={sendInvitations}
							className="mt-8"
							disabled={!check.invitationsAvailable}
							label={t("people.importPage.check.sendInvitations")}
							description={
								check.invitationsAvailable
									? t("people.importPage.check.invitationsOn")
									: t("people.importPage.check.invitationsOff")
							}
							onChange={(event) => {
								setSendInvitations(event.target.checked);
							}}
						/>
						{hasErrors ? (
							<>
								<div className="mt-6 flex flex-wrap gap-3">
									<Button onClick={wizard.startOver}>
										{t("people.importPage.check.fixAndReupload")}
									</Button>
									{canImportValidRowsOnly && (
										<Button
											aria-describedby="import-valid-rows-hint"
											variant="secondary"
											onClick={() => {
												openConfirm(true);
											}}
										>
											{t("people.importPage.check.importValidOnly", {
												count: check.readyRows,
											})}
										</Button>
									)}
								</div>
								{canImportValidRowsOnly && (
									<p
										className="mt-2 text-sm text-neutral-700"
										id="import-valid-rows-hint"
									>
										{t("people.importPage.check.validOnlyHint")}
									</p>
								)}
								{mostlyInvalid && (
									<p className="mt-2 text-sm text-neutral-700">
										{t("people.importPage.check.mostlyInvalid")}
									</p>
								)}
							</>
						) : (
							<Button
								className="mt-6"
								disabled={blocked}
								onClick={() => {
									openConfirm(false);
								}}
							>
								{t("people.importPage.check.import", {
									count: check.readyRows,
								})}
							</Button>
						)}
						{wizard.confirming && file && (
							<ConfirmDialog
								cancelLabel={t("people.importPage.confirm.cancel")}
								confirmLabel={t("people.importPage.confirm.confirm")}
								submitting={starting.isPending}
								description={[
									t("people.importPage.confirm.body"),
									sendInvitations
										? t("people.importPage.confirm.invite")
										: t("people.importPage.confirm.noInvite"),
									...(skipInvalid
										? [
												t("people.importPage.confirm.leftOut", {
													count: check.errorRows,
												}),
											]
										: []),
								].join(" ")}
								title={t("people.importPage.confirm.title", {
									count: check.readyRows,
								})}
								onClose={wizard.closeConfirm}
								onConfirm={() => {
									starting.mutate(file);
								}}
							/>
						)}
					</section>
				)}
				{currentStep === IMPORT_STEP &&
					(current.data ? (
						<ImportResultPanel
							memberImport={current.data}
							actions={
								<>
									<Button
										leadingIcon={<DownloadIcon />}
										variant="secondary"
										onClick={() => {
											saveFile(
												toCsvBlob(
													resultRowsCsv(current.data, t, i18n.language)
												),
												"people-import-results.csv"
											);
										}}
									>
										{t("people.importPage.result.download")}
									</Button>
									<Button
										variant="secondary"
										onClick={() => {
											void navigate({ to: "/people" });
										}}
									>
										{t("people.importPage.result.toPeople")}
									</Button>
									{canInvite && invitations && (
										<Button
											variant="secondary"
											onClick={() => {
												inviting.reset();
												setConfirmingInvite(true);
											}}
										>
											{t("people.importPage.result.invite", {
												count: invitations.count,
											})}
										</Button>
									)}
									<Button onClick={wizard.startOver}>
										{t("people.importPage.result.another")}
									</Button>
								</>
							}
						/>
					) : (
						current.isError && (
							<p className="text-sm text-error-700" role="alert">
								{t("people.importPage.result.loadFailed")}
							</p>
						)
					))}
			</div>
			{confirmingInvite && invitations && (
				<ConfirmDialog
					cancelLabel={t("people.importPage.result.inviteConfirm.cancel")}
					confirmDisabled={!invitations.fits}
					confirmLabel={t("people.importPage.result.inviteConfirm.confirm")}
					description={t("people.importPage.result.inviteConfirm.body")}
					submitting={inviting.isPending}
					error={
						inviting.isError
							? t(`people.importPage.refusals.${refusalCode(inviting.error)}`)
							: undefined
					}
					title={t("people.importPage.result.inviteConfirm.title", {
						count: invitations.count,
					})}
					onClose={() => {
						setConfirmingInvite(false);
					}}
					onConfirm={() => {
						inviting.mutate(undefined, {
							onSuccess: (sent) => {
								setConfirmingInvite(false);
								setInviteToast({
									id: Date.now(),
									text: t("people.importPage.result.invited", sent),
								});
							},
						});
					}}
				>
					<p className="text-sm text-neutral-800">
						{invitations.fits
							? t("people.importPage.result.inviteConfirm.left", {
									count: invitations.left,
								})
							: t("people.importPage.result.inviteConfirm.overLimit", {
									left: invitations.left,
								})}
					</p>
				</ConfirmDialog>
			)}
			{inviteToast && (
				<Toast
					key={inviteToast.id}
					onDismiss={() => {
						setInviteToast(undefined);
					}}
				>
					{inviteToast.text}
				</Toast>
			)}
			{(currentStep === TEMPLATE_STEP || currentStep === IMPORT_STEP) &&
				recent.data && (
					<ImportHistory
						className="mt-12"
						entries={mergeImportHistory([], recent.data)}
						headingLevel={2}
						onOpen={(entry) => {
							void navigate({
								search: { import: entry.importRecord.importId },
							});
						}}
					/>
				)}
		</>
	);
};
