import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Dialog } from "@/components/ui/Dialog";
import type { PlanPerson } from "@/features/scheduling/dates/api";
import type { ChosenPeople } from "@/features/scheduling/dates/people";

export type PeopleChoiceDialogProps = {
	/** The Department whose people are listed. */
	departmentName: string;
	/** Everyone the Department can roster on the first day, as the dates plan lists them. */
	people: ReadonlyArray<PlanPerson>;
	/** Who is chosen now; undefined is everyone. */
	value: ChosenPeople;
	/** Called with the ticked ids; the caller closes the dialog. */
	onApply: (memberProfileIds: Array<string>) => void;
	onClose: () => void;
};

const key = "scheduling.dates.people";

/**
 * Which of a Department's people a schedule by dates rosters: a box per
 * person and one for everyone. "Use these people" waits for at least one
 * ticked person. One choice in, one out, as WeekChoiceDialog does.
 */
export const PeopleChoiceDialog = ({
	departmentName,
	people,
	value,
	onApply,
	onClose,
}: PeopleChoiceDialogProps): FunctionComponent => {
	const { t } = useTranslation();
	const [working, setWorking] = useState<Array<string>>(() =>
		value === undefined
			? people.map((person) => person.memberProfileId)
			: [...value]
	);
	const nobodyChosen = working.length === 0;
	const columns: Array<DataTableColumn<PlanPerson>> = [
		{
			id: "name",
			header: t(`${key}.name`),
			cell: (person) => person.displayName,
			cellClassName: "font-semibold",
		},
		{
			id: "jobTitle",
			header: t(`${key}.jobTitle`),
			cell: (person) => person.jobTitleName ?? "",
		},
	];

	return (
		<Dialog
			open
			description={t(`${key}.intro`)}
			title={t(`${key}.title`)}
			footer={
				<div className="grid gap-6 sm:grid-cols-2">
					<Button variant="secondary" onClick={onClose}>
						{t(`${key}.cancel`)}
					</Button>
					<Button
						disabled={nobodyChosen}
						onClick={() => {
							onApply(working);
						}}
					>
						{t(`${key}.apply`)}
					</Button>
				</div>
			}
			onClose={onClose}
		>
			<DataTable
				columns={columns}
				data={[...people]}
				getRowId={(person) => person.memberProfileId}
				label={t(`${key}.tableLabel`, { department: departmentName })}
				selection={{
					rowLabel: (person) => person.displayName,
					selectedIds: working,
					onChange: setWorking,
				}}
			/>
			{nobodyChosen && (
				<p className="mt-6 text-sm text-error-700" role="alert">
					{t(`${key}.nobodyChosen`)}
				</p>
			)}
		</Dialog>
	);
};
