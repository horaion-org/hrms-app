import { useMutation } from "@tanstack/react-query";
import {
	type DatesGeneration,
	generateDates,
	type GenerateDatesBody,
} from "@/features/scheduling/dates/api";
import { useReloadScheduling } from "@/features/scheduling/schedules/useSchedule";

export type GenerateDates = {
	/** Posts the dates; the page builds the body from the plan. */
	generate: (body: GenerateDatesBody) => Promise<DatesGeneration>;
	isPending: boolean;
};

/**
 * Generates one Department's dates through the dates route (API ADR-0114),
 * as `useGenerateMonth` generates a month. After the post, every scheduling
 * query reloads, as after any schedule write.
 */
export const useGenerateDates = (
	companyId: string,
	departmentId: string
): GenerateDates => {
	const reload = useReloadScheduling(companyId);
	const mutation = useMutation({
		meta: { successMessage: false },
		mutationFn: (body: GenerateDatesBody): Promise<DatesGeneration> =>
			generateDates(companyId, departmentId, body),
		onSettled: reload,
	});
	return { generate: mutation.mutateAsync, isPending: mutation.isPending };
};
