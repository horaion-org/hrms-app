import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toCsvBlob } from "@/common/csv";
import { saveFile } from "@/common/saveFile";
import type { FunctionComponent } from "@/common/types";
import { FileDrop } from "@/components/forms/FileDrop";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DownloadIcon } from "@/components/ui/Icon";
import { Stepper, StepperStep } from "@/components/ui/Stepper";
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
	refusalCode,
	resultRowsCsv,
	type RefusalCode,
} from "@/features/people/import/importText";
import { RecentImports } from "@/features/people/RecentImports";

const route = getRouteApi("/_authenticated/_app/settings_/data/import-people");

const STEPS = ["template", "upload", "check", "import"] as const;
const TEMPLATE_STEP = 0;
const UPLOAD_STEP = 1;
const CHECK_STEP = 2;
const IMPORT_STEP = 3;

/**
 * Importing people from a spreadsheet in four steps: download the template,
 * upload a file, read its check (nothing saved yet) and import it, then follow
 * the import in the background. The import being followed lives in the URL,
 * so leaving and coming back, or a link from Recent imports, reopens it.
 */
export const PeopleImport = (): FunctionComponent => {
	const companyId = useCurrentCompanyId();
	const { t } = useTranslation();
	const navigate = route.useNavigate();
	const search = route.useSearch();
	const client = useQueryClient();
	const [step, setStep] = useState(TEMPLATE_STEP);
	const [file, setFile] = useState<File | undefined>(undefined);
	const [check, setCheck] = useState<ImportCheck | undefined>(undefined);
	const [refusal, setRefusal] = useState<RefusalCode | undefined>(undefined);
	const [sendInvitations, setSendInvitations] = useState(false);
	const [confirming, setConfirming] = useState(false);
	const followed = search.import;
	const current = useQuery({
		...memberImportQuery(companyId, followed ?? ""),
		enabled: followed !== undefined,
	});
	const recent = useQuery(recentImportsQuery(companyId));
	const template = useMutation({
		mutationFn: () => downloadImportTemplate(companyId),
		onSuccess: ({ blob, fileName }) => {
			saveFile(blob, fileName);
		},
	});
	const checking = useMutation({
		mutationFn: (chosen: File) => checkImportFile(companyId, chosen),
		onSuccess: (result) => {
			setCheck(result);
			setSendInvitations(result.invitationsAvailable);
			setStep(CHECK_STEP);
		},
		onError: (error) => {
			setRefusal(refusalCode(error));
		},
	});
	const starting = useMutation({
		mutationFn: (chosen: File) =>
			startImport(companyId, chosen, sendInvitations),
		onSuccess: (started) => {
			setConfirming(false);
			void navigate({ search: { import: started.importId } });
		},
		onError: (error) => {
			setConfirming(false);
			setRefusal(refusalCode(error));
		},
	});
	const ended =
		current.data?.status === "COMPLETED" || current.data?.status === "FAILED";
	// Once an import ends, the People list and Recent imports show what it added.
	useEffect(() => {
		if (ended)
			void client.invalidateQueries({ queryKey: ["people", companyId] });
	}, [ended, client, companyId]);

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
	const currentStep = followed === undefined ? step : IMPORT_STEP;
	const blocked =
		!check ||
		check.errorRows > 0 ||
		check.readyRows === 0 ||
		check.runningImportId !== null;

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
				onStepClick={(index) => {
					if (followed === undefined) setStep(index);
				}}
			>
				{STEPS.map((name) => (
					<StepperStep
						key={name}
						label={t(`people.importPage.steps.${name}`)}
					/>
				))}
			</Stepper>
			<div className="mt-10">
				{currentStep === TEMPLATE_STEP && (
					<section>
						<h2 className="text-xl font-semibold text-neutral-900">
							{t("people.importPage.template.heading")}
						</h2>
						<p className="mt-2 max-w-2xl text-sm text-neutral-800">
							{t("people.importPage.template.body")}
						</p>
						<p className="mt-2 max-w-2xl text-sm text-neutral-800">
							{t("people.importPage.template.rules")}
						</p>
						{template.isError && (
							<p className="mt-4 text-sm text-error-700" role="alert">
								{t("people.importPage.template.downloadFailed")}
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
									? t("people.importPage.template.downloading")
									: t("people.importPage.template.download")}
							</Button>
							<Button
								onClick={() => {
									setStep(UPLOAD_STEP);
								}}
							>
								{t("people.importPage.template.next")}
							</Button>
						</div>
					</section>
				)}
				{currentStep === UPLOAD_STEP && (
					<section>
						<FileDrop
							accept={IMPORT_EXTENSIONS}
							chooseLabel={t("people.importPage.upload.choose")}
							disabled={checking.isPending}
							hint={t("people.importPage.upload.hint")}
							prompt={t("people.importPage.upload.prompt")}
							onFileChange={choose}
						/>
						{checking.isPending && (
							<p aria-live="polite" className="mt-4 text-sm text-neutral-800">
								{t("people.importPage.upload.checking")}
							</p>
						)}
						{refusal && (
							<p className="mt-4 text-sm text-error-700" role="alert">
								{t(`people.importPage.refusals.${refusal}`)}
							</p>
						)}
						<h2 className="mt-8 text-base font-semibold text-neutral-900">
							{t("people.importPage.upload.helpHeading")}
						</h2>
						<ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm text-neutral-800">
							{IMPORT_COLUMNS.map((column) => (
								<li key={column}>{t(`people.importPage.help.${column}`)}</li>
							))}
							<li>{t("people.importPage.help.general")}</li>
						</ul>
						<Button
							className="mt-6"
							variant="secondary"
							onClick={() => {
								setStep(TEMPLATE_STEP);
							}}
						>
							{t("people.importPage.upload.back")}
						</Button>
					</section>
				)}
				{currentStep === CHECK_STEP && check && (
					<section>
						<ImportCheckPanel
							check={check}
							onUploadAgain={startOver}
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
						{refusal && (
							<p className="mt-6 text-sm text-error-700" role="alert">
								{t(`people.importPage.refusals.${refusal}`)}
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
						<Button
							className="mt-6"
							disabled={blocked}
							onClick={() => {
								setRefusal(undefined);
								setConfirming(true);
							}}
						>
							{t("people.importPage.check.import", { count: check.readyRows })}
						</Button>
						{confirming && file && (
							<ConfirmDialog
								cancelLabel={t("people.importPage.confirm.cancel")}
								confirmLabel={t("people.importPage.confirm.confirm")}
								submitting={starting.isPending}
								description={`${t("people.importPage.confirm.body")} ${
									sendInvitations
										? t("people.importPage.confirm.invite")
										: t("people.importPage.confirm.noInvite")
								}`}
								title={t("people.importPage.confirm.title", {
									count: check.readyRows,
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
						<ImportResultPanel
							memberImport={current.data}
							actions={
								<>
									<Button
										leadingIcon={<DownloadIcon />}
										variant="secondary"
										onClick={() => {
											saveFile(
												toCsvBlob(resultRowsCsv(current.data, t)),
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
									<Button onClick={startOver}>
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
			{(currentStep === TEMPLATE_STEP || currentStep === IMPORT_STEP) &&
				recent.data && (
					<div className="mt-12">
						<RecentImports
							imports={recent.data}
							onOpen={(importId) => {
								void navigate({ search: { import: importId } });
							}}
						/>
					</div>
				)}
		</>
	);
};
