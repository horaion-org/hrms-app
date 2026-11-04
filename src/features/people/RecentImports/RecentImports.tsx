import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import type { MemberImport } from "@/features/people/import/api";

export type RecentImportsProps = {
	imports: ReadonlyArray<MemberImport>;
	onOpen: (importId: string) => void;
};

/** The company's recent imports the person may read: when, who, and how they ended. */
export const RecentImports = ({
	imports,
	onOpen,
}: RecentImportsProps): FunctionComponent => {
	const { t, i18n } = useTranslation();

	return (
		<section aria-labelledby="recent-imports-heading">
			<h2
				className="text-xl font-semibold text-neutral-900"
				id="recent-imports-heading"
			>
				{t("people.importPage.recent.heading")}
			</h2>
			{imports.length === 0 ? (
				<p className="mt-2 text-sm text-neutral-700">
					{t("people.importPage.recent.empty")}
				</p>
			) : (
				<ul className="mt-2 flex flex-col gap-2">
					{imports.map((memberImport) => (
						<li
							key={memberImport.importId}
							className="flex flex-wrap items-center gap-3 text-sm"
						>
							<span className="font-semibold">
								{t(`people.importPage.recent.status.${memberImport.status}`)}
							</span>
							<span className="text-neutral-700">
								{t("people.importPage.recent.item", {
									date: new Date(memberImport.createdAt).toLocaleString(
										i18n.language
									),
									name: memberImport.requestedBy,
									added: memberImport.addedRows,
									failed: memberImport.failedRows,
								})}
							</span>
							<Button
								size="sm"
								variant="textlink"
								onClick={() => {
									onOpen(memberImport.importId);
								}}
							>
								{t("people.importPage.recent.open")}
							</Button>
						</li>
					))}
				</ul>
			)}
		</section>
	);
};
