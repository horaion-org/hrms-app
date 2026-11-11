import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import type {
	FixSearch,
	Gate,
} from "@/features/scheduling/readiness/readinessCopy";

/** The setup tab that fixes the department, remembering where to return. */
export type FixLink = { to: "/scheduling"; search: FixSearch };

export type ReadinessGateCalloutProps = {
	/** Why the wizard stops here, as `gateOf` words it. */
	gate: Gate;
	/** Where the gate's link goes; left out where the person may not open that tab. */
	link?: FixLink;
	className?: string;
};

/**
 * Warns that the department can't roster anyone yet, so the wizard stops
 * here, with a link to the setup tab that fixes it, or only shows it.
 */
export const ReadinessGateCallout = ({
	gate,
	link,
	className,
}: ReadinessGateCalloutProps): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<Callout className={className} tone="warning">
			{t(gate.messageKey, { department: gate.department })}
			{link && gate.linkKey && (
				<>
					{" "}
					<Button search={link.search} to={link.to} variant="textlink">
						{t(gate.linkKey, { department: gate.department })}
					</Button>
				</>
			)}
		</Callout>
	);
};
