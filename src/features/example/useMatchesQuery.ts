import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { fetchMatches, type Match } from "@/features/example/api";

export const useMatchesQuery = (): UseQueryResult<Array<Match>, Error> => {
	return useQuery({
		queryKey: ["matches"],
		queryFn: (): Promise<Array<Match>> => fetchMatches(),
	});
};
