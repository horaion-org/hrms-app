import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import type { Match } from "@/features/example/api";
import { MatchForm, type MatchFormValues } from "@/features/example/MatchForm";
import { MatchesChart } from "@/features/example/MatchesChart";
import { MatchesTable } from "@/features/example/MatchesTable";
import { useMatchesQuery } from "@/features/example/useMatchesQuery";

/**
 * Reference page wiring together TanStack Query + Table, React Hook Form + Zod,
 * a Nivo chart, a Zustand store and i18n. Self-contained and safe to delete:
 * remove `src/features/example`, `src/routes/example.ts`, `src/store/useExampleStore.ts`,
 * the `/example` link in `src/pages/Home.tsx`, and the `example` translation keys.
 */
export const ExamplePage = (): FunctionComponent => {
	const { t } = useTranslation();
	const matchesQuery = useMatchesQuery();
	const [created, setCreated] = useState<Array<Match>>([]);

	const handleCreate = (values: MatchFormValues): void => {
		setCreated((previous) => [
			{
				id: `local-${previous.length.toString()}`,
				homeTeam: values.homeTeam,
				awayTeam: values.awayTeam,
				homeScore: 0,
				awayScore: 0,
				playedOn: "",
			},
			...previous,
		]);
	};

	if (matchesQuery.isPending) {
		return <p className="p-8">{t("example.loading")}</p>;
	}

	if (matchesQuery.isError) {
		return <p className="p-8 text-red-600">{t("example.error")}</p>;
	}

	const matches = [...created, ...matchesQuery.data];

	return (
		<main className="flex flex-col gap-8 p-8">
			<h1 className="text-2xl font-bold">{t("example.title")}</h1>
			<section className="flex flex-col gap-6 lg:flex-row">
				<div className="flex-1">
					<h2 className="mb-2 font-semibold">{t("example.tableHeading")}</h2>
					<MatchesTable data={matches} />
				</div>
				<div className="flex-1">
					<h2 className="mb-2 font-semibold">{t("example.formHeading")}</h2>
					<MatchForm onCreate={handleCreate} />
				</div>
			</section>
			<section>
				<h2 className="mb-2 font-semibold">{t("example.chartHeading")}</h2>
				<MatchesChart data={matches} />
			</section>
		</main>
	);
};
