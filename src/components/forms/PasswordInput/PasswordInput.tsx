import { useState } from "react";
import { useTranslation } from "react-i18next";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import type { FunctionComponent } from "@/common/types";
import { Input, type InputProps } from "@/components/forms/Input";
import { Button } from "@/components/ui/Button";

export type PasswordInputProps = Omit<InputProps, "trailingIcon" | "type"> & {
	toggleLabels?: { show: string; hide: string };
};

export const PasswordInput = ({
	disabled,
	toggleLabels,
	...rest
}: PasswordInputProps): FunctionComponent => {
	const { t } = useTranslation();
	const [visible, setVisible] = useState(false);

	return (
		<Input
			{...rest}
			disabled={disabled}
			type={visible ? "text" : "password"}
			trailingIcon={
				<Button
					aria-pressed={visible}
					disabled={disabled}
					variant="icon"
					aria-label={
						visible
							? (toggleLabels?.hide ?? t("passwordInput.hide"))
							: (toggleLabels?.show ?? t("passwordInput.show"))
					}
					onClick={(): void => {
						setVisible((current) => !current);
					}}
				>
					{visible ? (
						<EyeSlashIcon aria-hidden="true" />
					) : (
						<EyeIcon aria-hidden="true" />
					)}
				</Button>
			}
		/>
	);
};
