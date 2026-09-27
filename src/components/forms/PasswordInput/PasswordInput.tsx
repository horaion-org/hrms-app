import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Input, type InputProps } from "@/components/forms/Input";
import { Button } from "@/components/ui/Button";
import { ViewIcon } from "@/components/ui/Icon";

export type PasswordInputProps = Omit<InputProps, "trailingIcon" | "type">;

/**
 * An Input for secrets with a toggle that reveals what was typed. The toggle
 * keeps one name and reports its state through `aria-pressed`.
 */
export const PasswordInput = ({
	disabled,
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
					aria-label={t("passwordInput.show")}
					aria-pressed={visible}
					disabled={disabled}
					variant="textlink"
					className={
						visible ? "text-ink-blue-900 [&_svg]:text-ink-blue-900" : undefined
					}
					onClick={() => {
						setVisible((current) => !current);
					}}
				>
					<ViewIcon />
				</Button>
			}
		/>
	);
};
