import { ResponsiveBar } from "@nivo/bar";
import type { FunctionComponent } from "@/common/types";
import type { Match } from "@/features/example/api";

interface MatchesChartProps {
	data: Array<Match>;
}

export const MatchesChart = ({
	data,
}: MatchesChartProps): FunctionComponent => {
	const chartData = data.map((match) => ({
		match: `${match.homeTeam.slice(0, 3)} v ${match.awayTeam.slice(0, 3)}`,
		goals: match.homeScore + match.awayScore,
	}));

	return (
		<div className="h-72 w-full">
			<ResponsiveBar
				axisBottom={{ tickRotation: -45 }}
				colors={{ scheme: "blues" }}
				data={chartData}
				indexBy="match"
				keys={["goals"]}
				margin={{ top: 16, right: 16, bottom: 64, left: 40 }}
				padding={0.3}
				role="img"
			/>
		</div>
	);
};
