import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Input, type InputProps } from "@/components/forms/Input";
import { Button } from "@/components/ui/Button";
import { ViewIcon } from "@/components/ui/Icon";

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
					{/* The icon set has no "hide" eye, so the pressed state and label carry the toggle. */}
					<ViewIcon aria-hidden="true" />
				</Button>
			}
		/>
	);
};
