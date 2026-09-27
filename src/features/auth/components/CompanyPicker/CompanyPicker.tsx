import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/Button";
import type { Membership } from "@/features/auth/api";

export type CompanyPickerProps = {
	/** The Companies the person may work in; empty when there are none. */
	companies: Array<Pick<Membership, "companyId" | "companyName" | "subdomain">>;
	onChoose: (companyId: string) => void;
	onSignOut: () => void;
};

/**
 * Asks a person who belongs to several Companies which one to work in. With
 * no Company to open, it says so and offers only signing out.
 */
export const CompanyPicker = ({
	companies,
	onChoose,
	onSignOut,
}: CompanyPickerProps): FunctionComponent => {
	const { t } = useTranslation();
	const none = companies.length === 0;

	return (
		<AuthLayout
			description={t(
				none ? "auth.companyPicker.noneSubtitle" : "auth.companyPicker.subtitle"
			)}
			title={t(
				none ? "auth.companyPicker.noneTitle" : "auth.companyPicker.title"
			)}
		>
			{none ? null : (
				<ul className="space-y-3">
					{companies.map((company) => (
						<li key={company.companyId}>
							<Button
								className="w-full justify-between"
								size="sm"
								variant="secondary"
								onClick={() => {
									onChoose(company.companyId);
								}}
							>
								<span className="truncate">{company.companyName}</span>
								<span className="text-neutral-500">{company.subdomain}</span>
							</Button>
						</li>
					))}
				</ul>
			)}
			<Button
				className={none ? undefined : "mt-6"}
				variant="textlink"
				onClick={onSignOut}
			>
				{t("auth.signOut")}
			</Button>
		</AuthLayout>
	);
};
