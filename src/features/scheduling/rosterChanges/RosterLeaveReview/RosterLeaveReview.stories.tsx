import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import type { FunctionComponent } from "@/common/types";
import { RosterLeaveReview } from "./RosterLeaveReview";
import "@/common/i18n";

const meta = {
	title: "Features/Scheduling/RosterLeaveReview",
	component: RosterLeaveReview,
} satisfies Meta<typeof RosterLeaveReview>;

export default meta;

const WithRemark = (): FunctionComponent => {
	const [remark, setRemark] = useState("");
	return (
		<RosterLeaveReview
			change={{ before: "Front Desk AM · 09:00 – 15:00", after: "Sick leave" }}
			name="Aisha Rahman"
			remark={remark}
			notes={[
				"Aisha Rahman comes off this shift, and it will need cover. Reverse this by cancelling the leave in Leave.",
			]}
			onRemarkChange={setRemark}
		/>
	);
};

export const ShiftToLeave: StoryObj = { render: () => <WithRemark /> };
