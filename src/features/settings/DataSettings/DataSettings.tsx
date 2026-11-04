import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ApiProblemError } from "@/common/problem";
import { saveFile } from "@/common/saveFile";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { DownloadIcon, UploadIcon } from "@/components/ui/Icon";
import { recentOrganisationImportsQuery } from "@/features/organisation/import/api";
import type { PeopleQuery } from "@/features/people/api";
import { exportPeople, recentImportsQuery } from "@/features/people/import/api";
import type { DataItems } from "@/features/settings/dataAccess";
import { ImportHistory } from "@/features/settings/ImportHistory";
import {
	mergeImportHistory,
	type ImportHistoryEntry,
} from "@/features/settings/importHistory";

export type DataSettingsProps = {
	companyId: string;
	/** The items the person is offered; the section is shown only with one. */
	items: DataItems;
};

/** Everyone the person can see: the People list with no filter. */
const EVERYONE: PeopleQuery = {
	page: 1,
	sort: { field: "displayName", desc: false },
	search: "",
};

/** One item of the section: what it does, and its action on the right. */
const DataItem = ({
	title,
	body,
	action,
}: {
	title: string;
	body: string;
	action: ReactNode;
}): FunctionComponent => (
	<li className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h3 className="text-base font-semibold text-neutral-900">{title}</h3>
			<p className="mt-1 text-sm text-neutral-800">{body}</p>
		</div>
		<div className="shrink-0">{action}</div>
	</li>
);

/**
 * Settings › Data: the permanent home for bulk data. Importing the
 * organisation or people opens its flow; exporting people downloads
 * everyone the person can see; Import history lists both kinds of import,
 * each opening its result. Every item is offered on its own key.
 */
export const DataSettings = ({
	companyId,
	items,
}: DataSettingsProps): FunctionComponent => {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const organisationImports = useQuery({
		...recentOrganisationImportsQuery(companyId),
		enabled: items.importOrganisation,
	});
	const peopleImports = useQuery({
		...recentImportsQuery(companyId),
		enabled: items.importPeople,
	});
	const exporting = useMutation({
		mutationFn: () => exportPeople(companyId, EVERYONE),
		onSuccess: ({ blob, fileName }) => {
			saveFile(blob, fileName);
		},
	});
	const exportTooLarge =
		exporting.error instanceof ApiProblemError &&
		exporting.error.errorCode === "EXPORT_TOO_LARGE";
	const openResult = (entry: ImportHistoryEntry): void => {
		const search = { import: entry.importRecord.importId };
		void navigate(
			entry.kind === "ORGANISATION"
				? { to: "/settings/data/import-organisation", search }
				: { to: "/settings/data/import-people", search }
		);
	};

	return (
		<>
			<h2 className="text-xl font-semibold text-neutral-900">
				{t("settings.data.title")}
			</h2>
			<p className="mt-3 text-sm text-neutral-800">
				{t("settings.data.subtitle")}
			</p>
			<ul className="mt-6 divide-y divide-neutral-400">
				{items.importOrganisation && (
					<DataItem
						body={t("settings.data.importOrganisation.body")}
						title={t("settings.data.importOrganisation.title")}
						action={
							<Button
								aria-label={t("settings.data.importOrganisation.title")}
								leadingIcon={<UploadIcon />}
								size="sm"
								to="/settings/data/import-organisation"
								variant="secondary"
							>
								{t("settings.data.import")}
							</Button>
						}
					/>
				)}
				{items.importPeople && (
					<DataItem
						body={t("settings.data.importPeople.body")}
						title={t("settings.data.importPeople.title")}
						action={
							<Button
								aria-label={t("settings.data.importPeople.title")}
								leadingIcon={<UploadIcon />}
								size="sm"
								to="/settings/data/import-people"
								variant="secondary"
							>
								{t("settings.data.import")}
							</Button>
						}
					/>
				)}
				{items.exportPeople && (
					<DataItem
						body={t("settings.data.exportPeople.body")}
						title={t("settings.data.exportPeople.title")}
						action={
							<Button
								aria-label={t("settings.data.exportPeople.title")}
								leadingIcon={<DownloadIcon />}
								loading={exporting.isPending}
								size="sm"
								variant="secondary"
								onClick={() => {
									exporting.mutate();
								}}
							>
								{exporting.isPending
									? t("settings.data.exportPeople.exporting")
									: t("settings.data.export")}
							</Button>
						}
					/>
				)}
			</ul>
			{exporting.isError && (
				<p className="mt-2 text-sm text-error-700" role="alert">
					{exportTooLarge
						? t("settings.data.exportPeople.tooLarge")
						: t("settings.data.exportPeople.failed")}
				</p>
			)}
			{items.importHistory && (
				<ImportHistory
					className="mt-6 border-t border-neutral-400 pt-6"
					failed={organisationImports.isError || peopleImports.isError}
					entries={mergeImportHistory(
						organisationImports.data ?? [],
						peopleImports.data ?? []
					)}
					onOpen={openResult}
				/>
			)}
		</>
	);
};
