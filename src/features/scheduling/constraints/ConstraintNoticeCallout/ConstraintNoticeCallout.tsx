import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";

/** A constraint the notice names: its id and name. */
export type NoticedConstraint = { constraintId: string; name: string };

export type ConstraintNoticeCalloutProps<Constraint extends NoticedConstraint> =
	{
		/** Error for rules a roster can't use; warning for rules it uses that leave shifts short. */
		tone: "error" | "warning";
		/** What is wrong with the named constraints and what to do, ending where the names begin; left out with none. */
		lead: string;
		constraints: ReadonlyArray<Constraint>;
		/** Shows the constraint's row. */
		onShow: (constraint: Constraint) => void;
		/** A last line, e.g. how many more the filter leaves out. */
		footnote?: string;
	};

/**
 * The Constraints tab's notice over its list: what is wrong, then each
 * constraint it concerns as a link to its row.
 */
export const ConstraintNoticeCallout = <Constraint extends NoticedConstraint>({
	tone,
	lead,
	constraints,
	onShow,
	footnote,
}: ConstraintNoticeCalloutProps<Constraint>): FunctionComponent => (
	<Callout tone={tone}>
		{constraints.length > 0 && `${lead} `}
		{constraints.map((constraint, index) => (
			<span key={constraint.constraintId}>
				{index > 0 && " · "}
				<Button
					variant="textlink"
					onClick={() => {
						onShow(constraint);
					}}
				>
					{constraint.name}
				</Button>
			</span>
		))}
		{footnote && <span className="block">{footnote}</span>}
	</Callout>
);
