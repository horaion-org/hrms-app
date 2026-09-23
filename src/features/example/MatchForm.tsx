import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Control, type FieldValues } from "react-hook-form";
import { z } from "zod";
import type { FunctionComponent } from "@/common/types";
import { ReactHookFormDevelopmentTools } from "@/components/utils/development-tools/ReactHookFormDevelopmentTools";

const matchSchema = z.object({
	homeTeam: z.string().min(1, "Home team is required"),
	awayTeam: z.string().min(1, "Away team is required"),
});

export type MatchFormValues = z.infer<typeof matchSchema>;

interface MatchFormProps {
	onCreate: (values: MatchFormValues) => void;
}

export const MatchForm = ({ onCreate }: MatchFormProps): FunctionComponent => {
	const {
		control,
		register,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm<MatchFormValues>({
		resolver: zodResolver(matchSchema),
		defaultValues: { homeTeam: "", awayTeam: "" },
	});

	const onSubmit = handleSubmit((values): void => {
		onCreate(values);
		reset();
	});

	return (
		<form className="flex max-w-sm flex-col gap-3" onSubmit={onSubmit}>
			<label className="flex flex-col gap-1 text-sm">
				Home team
				<input className="rounded border px-2 py-1" {...register("homeTeam")} />
				{errors.homeTeam ? (
					<span className="text-red-600">{errors.homeTeam.message}</span>
				) : null}
			</label>
			<label className="flex flex-col gap-1 text-sm">
				Away team
				<input className="rounded border px-2 py-1" {...register("awayTeam")} />
				{errors.awayTeam ? (
					<span className="text-red-600">{errors.awayTeam.message}</span>
				) : null}
			</label>
			<button
				className="rounded bg-blue-600 px-3 py-1 text-white"
				type="submit"
			>
				Add match
			</button>
			{/* The lazy DevTool wrapper resolves to the default `FieldValues`
			    generic, so the strongly-typed control is widened here. */}
			<ReactHookFormDevelopmentTools
				control={control as unknown as Control<FieldValues>}
			/>
		</form>
	);
};
