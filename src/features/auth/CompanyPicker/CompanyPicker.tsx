import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import type { Membership } from "@/features/auth/api";
import { rememberCompany } from "@/features/auth/currentCompany";

export type CompanyPickerProps = {
	companies: Array<Pick<Membership, "companyId" | "companyName" | "subdomain">>;
	onChoose: (companyId: string) => void;
};

export const CompanyPicker = ({
	companies,
	onChoose,
}: CompanyPickerProps): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<>
			<h1 className="text-[32px] leading-12 font-medium text-ink-blue-900">
				{t("auth.company.title")}
			</h1>
			<p className="mt-3 text-base leading-6 text-neutral-800">
				{t("auth.company.description")}
			</p>
			<ul className="mt-9 space-y-4">
				{companies.map((company) => (
					<li key={company.companyId}>
						<Button
							className="h-auto min-h-14 w-full flex-col items-start gap-1 py-3 text-left whitespace-normal"
							variant="secondary"
							onClick={() => {
								rememberCompany(company.companyId);
								onChoose(company.companyId);
							}}
						>
							<span className="w-full break-words">{company.companyName}</span>{" "}
							<span className="w-full text-sm font-normal break-words text-neutral-700">
								{company.subdomain}
							</span>
						</Button>
					</li>
				))}
			</ul>
		</>
	);
};
