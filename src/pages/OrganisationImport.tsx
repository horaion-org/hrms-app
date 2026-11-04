import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toCsvBlob } from "@/common/csv";
import { saveFile } from "@/common/saveFile";
import type { FunctionComponent } from "@/common/types";
import { FileDrop } from "@/components/forms/FileDrop";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DownloadIcon } from "@/components/ui/Icon";
import { Stepper, StepperStep } from "@/components/ui/Stepper";
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
import { useCurrentCompanyId } from "@/features/organisation/useCurrentCompanyId";
import { useAccess } from "@/features/workspace/useAccess";

const route = getRouteApi(
	"/_authenticated/_app/settings_/data/import-organisation"
);

const STEPS = ["template", "upload", "check", "import"] as const;
const TEMPLATE_STEP = 0;
const UPLOAD_STEP = 1;
const CHECK_STEP = 2;
const IMPORT_STEP = 3;

const linkClasses =
	"font-semibold text-ink-blue-700 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-blue-500";

/** Where a running people import is followed; without its id, the People import page lists it. */
const RunningPeopleImport = ({
	importId,
}: {
	importId: string | undefined;
}): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<Callout className="mt-6" role="alert" tone="warning">
			<span className="block">{t("organisation.import.check.running")}</span>
			<Link
				className={linkClasses}
				search={importId ? { import: importId } : {}}
				to="/settings/data/import-people"
			>
				{t("organisation.import.check.viewRunning")}
			</Link>
		</Callout>
	);
};

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
	const navigate = route.useNavigate();
	const search = route.useSearch();
	const client = useQueryClient();
	const access = useAccess();
	const [step, setStep] = useState(TEMPLATE_STEP);
	const [file, setFile] = useState<File | undefined>(undefined);
	const [check, setCheck] = useState<OrganisationCheck | undefined>(undefined);
	const [refusal, setRefusal] = useState<OrganisationRefusalCode | undefined>(
		undefined
	);
	const [confirming, setConfirming] = useState(false);
	const shown = search.import;
	const current = useQuery({
		...organisationImportQuery(companyId, shown ?? ""),
		enabled: shown !== undefined,
	});
	const template = useMutation({
		mutationFn: () => downloadOrganisationTemplate(companyId),
		onSuccess: ({ blob, fileName }) => {
			saveFile(blob, fileName);
		},
	});
	const checking = useMutation({
		mutationFn: (chosen: File) => checkOrganisationFile(companyId, chosen),
		onSuccess: (result) => {
			setCheck(result);
			setStep(CHECK_STEP);
		},
		onError: (error) => {
			setRefusal(refusalCode(error));
		},
	});
	const starting = useMutation({
		mutationFn: (chosen: File) => startOrganisationImport(companyId, chosen),
		onSuccess: (finished) => {
			setConfirming(false);
			// The new units change the Organisation counts, its lists and Import history.
			void client.invalidateQueries({ queryKey: ["organisation", companyId] });
			// The answer is the result, so it is shown without reading it again.
			client.setQueryData(
				organisationImportQuery(companyId, finished.importId).queryKey,
				finished
			);
			void navigate({ search: { import: finished.importId } });
		},
		onError: (error) => {
			setConfirming(false);
			setRefusal(refusalCode(error));
		},
	});

	const choose = (chosen: File): void => {
		const problem = clientFileProblem(chosen);
		setRefusal(problem);
		if (problem) return;
		setFile(chosen);
		checking.mutate(chosen);
	};
	const startOver = (): void => {
		setStep(UPLOAD_STEP);
		setCheck(undefined);
		setRefusal(undefined);
		void navigate({ search: {} });
	};
	const currentStep = shown === undefined ? step : IMPORT_STEP;
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
				onStepClick={(index) => {
					if (shown === undefined) setStep(index);
				}}
			>
				{STEPS.map((name) => (
					<StepperStep
						key={name}
						label={t(`organisation.import.steps.${name}`)}
					/>
				))}
			</Stepper>
			<div className="mt-10">
				{currentStep === TEMPLATE_STEP && (
					<section>
						<h2 className="text-xl font-semibold text-neutral-900">
							{t("organisation.import.template.heading")}
						</h2>
						<p className="mt-2 max-w-2xl text-sm text-neutral-800">
							{t("organisation.import.template.body")}
						</p>
						<p className="mt-2 max-w-2xl text-sm text-neutral-800">
							{t("organisation.import.template.rules")}
						</p>
						{template.isError && (
							<p className="mt-4 text-sm text-error-700" role="alert">
								{t("organisation.import.template.downloadFailed")}
							</p>
						)}
						<div className="mt-6 flex flex-wrap gap-3">
							<Button
								leadingIcon={<DownloadIcon />}
								loading={template.isPending}
								variant="secondary"
								onClick={() => {
									template.mutate();
								}}
							>
								{template.isPending
									? t("organisation.import.template.downloading")
									: t("organisation.import.template.download")}
							</Button>
							<Button
								onClick={() => {
									setStep(UPLOAD_STEP);
								}}
							>
								{t("organisation.import.template.next")}
							</Button>
						</div>
					</section>
				)}
				{currentStep === UPLOAD_STEP && (
					<section>
						<FileDrop
							accept={ORGANISATION_IMPORT_EXTENSIONS}
							chooseLabel={t("organisation.import.upload.choose")}
							disabled={checking.isPending}
							hint={t("organisation.import.upload.hint")}
							prompt={t("organisation.import.upload.prompt")}
							onFileChange={choose}
						/>
						{checking.isPending && (
							<p aria-live="polite" className="mt-4 text-sm text-neutral-800">
								{t("organisation.import.upload.checking")}
							</p>
						)}
						{refusal && (
							<p className="mt-4 text-sm text-error-700" role="alert">
								{t(`organisation.import.refusals.${refusal}`)}
							</p>
						)}
						<h2 className="mt-8 text-base font-semibold text-neutral-900">
							{t("organisation.import.upload.helpHeading")}
						</h2>
						<ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm text-neutral-800">
							{ORGANISATION_SHEETS.map((sheet) => (
								<li key={sheet}>{t(`organisation.import.help.${sheet}`)}</li>
							))}
							<li>{t("organisation.import.help.general")}</li>
						</ul>
						<Button
							className="mt-6"
							variant="secondary"
							onClick={() => {
								setStep(TEMPLATE_STEP);
							}}
						>
							{t("organisation.import.upload.back")}
						</Button>
					</section>
				)}
				{currentStep === CHECK_STEP && check && (
					<section>
						<OrganisationCheckPanel
							check={check}
							onUploadAgain={startOver}
							onDownloadErrors={() => {
								saveFile(
									toCsvBlob(errorRowsCsv(check.rows, t)),
									"organisation-to-fix.csv"
								);
							}}
						/>
						{check.runningImportId !== null && (
							<RunningPeopleImport importId={check.runningImportId} />
						)}
						{refusal === "IMPORT_RUNNING" && check.runningImportId === null && (
							<RunningPeopleImport importId={undefined} />
						)}
						{refusal && refusal !== "IMPORT_RUNNING" && (
							<p className="mt-6 text-sm text-error-700" role="alert">
								{t(`organisation.import.refusals.${refusal}`)}
							</p>
						)}
						<Button
							className="mt-8"
							disabled={blocked}
							onClick={() => {
								setRefusal(undefined);
								setConfirming(true);
							}}
						>
							{t("organisation.import.check.create")}
						</Button>
						{confirming && file && (
							<ConfirmDialog
								cancelLabel={t("organisation.import.confirm.cancel")}
								confirmLabel={t("organisation.import.confirm.confirm")}
								description={t("organisation.import.confirm.body")}
								submitting={starting.isPending}
								title={t("organisation.import.confirm.title", {
									units: unitCountsText(check.toCreate, t),
								})}
								onClose={() => {
									setConfirming(false);
								}}
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
									<Button variant="secondary" onClick={startOver}>
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
