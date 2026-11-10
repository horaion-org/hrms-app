import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toCsvBlob } from "@/common/csv";
import { saveFile } from "@/common/saveFile";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DownloadIcon } from "@/components/ui/Icon";
import { Stepper, StepperStep } from "@/components/ui/Stepper";
import { ImportTemplateStep } from "@/features/imports/ImportTemplateStep";
import { ImportUploadStep } from "@/features/imports/ImportUploadStep";
import {
	CHECK_STEP,
	IMPORT_STEP,
	IMPORT_STEPS,
	TEMPLATE_STEP,
	UPLOAD_STEP,
} from "@/features/imports/importWizard";
import { RunningPeopleImport } from "@/features/imports/RunningPeopleImport";
import { useImportWizard } from "@/features/imports/useImportWizard";
import {
	checkOrganisationFile,
	downloadOrganisationTemplate,
	ORGANISATION_IMPORT_EXTENSIONS,
	ORGANISATION_SHEETS,
	organisationImportQuery,
	startOrganisationImport,
	type OrganisationCheck,
} from "@/features/organisation/import/api";
import {
	clientFileProblem,
	createsAnything,
	errorRowsCsv,
	refusalCode,
	resultRowsCsv,
	unitCountsText,
	type OrganisationRefusalCode,
} from "@/features/organisation/import/importText";
import { OrganisationCheckPanel } from "@/features/organisation/OrganisationCheckPanel";
import { OrganisationImportResultPanel } from "@/features/organisation/OrganisationImportResultPanel";
import { useAccess } from "@/features/workspace/useAccess";
import { useCurrentCompanyId } from "@/features/workspace/useCurrentCompany";
import { organisationKeys } from "@/features/organisation/api";

const route = getRouteApi(
	"/_authenticated/_app/settings_/data/import-organisation"
);

/**
 * Creating branches, departments and job titles from one workbook in four
 * steps: download the template, upload a file, read its check (nothing saved
 * yet) and create everything in it at once. Nothing is created while any row
 * has an error. The import is synchronous; its result lives in the URL, so a
 * refresh or a link from Import history reopens it.
 */
export const OrganisationImport = (): FunctionComponent => {
	const companyId = useCurrentCompanyId();
	const { t } = useTranslation();
	const access = useAccess();
	const navigate = route.useNavigate();
	const search = route.useSearch();
	const client = useQueryClient();
	const openedImportId = search.import;
	const wizard = useImportWizard<OrganisationCheck, OrganisationRefusalCode>({
		openedImportId,
		downloadTemplate: () => downloadOrganisationTemplate(companyId),
		checkFile: (chosen) => checkOrganisationFile(companyId, chosen),
		clientFileProblem,
		refusalCode,
		clearShownImport: () => {
			void navigate({ search: {} });
		},
	});
	const current = useQuery({
		...organisationImportQuery(companyId, openedImportId ?? ""),
		enabled: openedImportId !== undefined,
	});
	const starting = useMutation({
		mutationFn: (chosen: File) => startOrganisationImport(companyId, chosen),
		onSuccess: (finished) => {
			wizard.closeConfirm();
			// The new units change the organisation counts, its lists and Import history.
			void client.invalidateQueries({
				queryKey: organisationKeys.all(companyId),
			});
			// The answer is the result, so it is shown without reading it again.
			client.setQueryData(
				organisationImportQuery(companyId, finished.importId).queryKey,
				finished
			);
			void navigate({ search: { import: finished.importId } });
		},
		onError: (error) => {
			wizard.closeConfirm();
			wizard.refuse(refusalCode(error));
		},
	});

	const { check, currentStep, file, refusal } = wizard;
	const blocked =
		!check ||
		check.errorRows > 0 ||
		check.runningImportId !== null ||
		!createsAnything(check);

	return (
		<>
			<h1 className="text-4xl font-medium text-neutral-900">
				{t("organisation.import.title")}
			</h1>
			<p className="mt-4 text-sm text-neutral-800">
				{t("organisation.import.subtitle")}
			</p>
			<Stepper
				className="mt-10"
				currentStep={currentStep}
				onStepClick={wizard.goTo}
			>
				{IMPORT_STEPS.map((name) => (
					<StepperStep
						key={name}
						label={t(`organisation.import.steps.${name}`)}
					/>
				))}
			</Stepper>
			<div className="mt-10">
				{currentStep === TEMPLATE_STEP && (
					<ImportTemplateStep
						downloadFailed={wizard.templateFailed}
						downloading={wizard.templateDownloading}
						textPrefix="organisation.import"
						onDownload={wizard.downloadTemplate}
						onNext={() => {
							wizard.goTo(UPLOAD_STEP);
						}}
					/>
				)}
				{currentStep === UPLOAD_STEP && (
					<ImportUploadStep
						accept={ORGANISATION_IMPORT_EXTENSIONS}
						checking={wizard.checking}
						textPrefix="organisation.import"
						helpItems={ORGANISATION_SHEETS.map((sheet) =>
							t(`organisation.import.help.${sheet}`)
						)}
						refusalText={
							refusal && t(`organisation.import.refusals.${refusal}`)
						}
						onFileChange={wizard.choose}
						onBack={() => {
							wizard.goTo(TEMPLATE_STEP);
						}}
					/>
				)}
				{currentStep === CHECK_STEP && check && (
					<section>
						<OrganisationCheckPanel
							check={check}
							onUploadAgain={wizard.startOver}
							onDownloadErrors={() => {
								saveFile(
									toCsvBlob(errorRowsCsv(check.rows, t)),
									"organisation-to-fix.csv"
								);
							}}
						/>
						{check.runningImportId !== null && (
							<RunningPeopleImport
								className="mt-6"
								importId={check.runningImportId}
							/>
						)}
						{refusal === "IMPORT_RUNNING" && check.runningImportId === null && (
							<RunningPeopleImport className="mt-6" importId={undefined} />
						)}
						{refusal && refusal !== "IMPORT_RUNNING" && (
							<p className="mt-6 text-sm text-error-700" role="alert">
								{t(`organisation.import.refusals.${refusal}`)}
							</p>
						)}
						<Button
							className="mt-8"
							disabled={blocked}
							onClick={wizard.openConfirm}
						>
							{t("organisation.import.check.create")}
						</Button>
						{wizard.confirming && file && (
							<ConfirmDialog
								cancelLabel={t("organisation.import.confirm.cancel")}
								confirmLabel={t("organisation.import.confirm.confirm")}
								description={t("organisation.import.confirm.body")}
								submitting={starting.isPending}
								title={t("organisation.import.confirm.title", {
									units: unitCountsText(check.toCreate, t),
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
						<OrganisationImportResultPanel
							organisationImport={current.data}
							actions={
								<>
									{access.canAnywhere("member_profile:create") && (
										<Button to="/settings/data/import-people">
											{t("organisation.import.result.toPeople")}
										</Button>
									)}
									<Button to="/organisation/branches" variant="secondary">
										{t("organisation.import.result.viewBranches")}
									</Button>
									<Button
										leadingIcon={<DownloadIcon />}
										variant="secondary"
										onClick={() => {
											saveFile(
												toCsvBlob(resultRowsCsv(current.data, t)),
												"organisation-import-results.csv"
											);
										}}
									>
										{t("organisation.import.result.download")}
									</Button>
									<Button variant="secondary" onClick={wizard.startOver}>
										{t("organisation.import.result.another")}
									</Button>
								</>
							}
						/>
					) : (
						current.isError && (
							<p className="text-sm text-error-700" role="alert">
								{t("organisation.import.result.loadFailed")}
							</p>
						)
					))}
			</div>
		</>
	);
};
