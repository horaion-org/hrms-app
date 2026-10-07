import {
	useInfiniteQuery,
	useMutation,
	useQueryClient,
	type InfiniteData,
	type UseInfiniteQueryResult,
	type UseMutationResult,
} from "@tanstack/react-query";
import type { ListPage } from "@/features/organisation/api";
import {
	createMemberNote,
	deleteMemberNote,
	memberNotesQuery,
	updateMemberNote,
	type MemberNote,
} from "@/features/people/api";

/** A person's notes, a page at a time; `allowed` false asks for nothing. */
export const useMemberNotes = (
	companyId: string,
	membershipId: string,
	allowed: boolean
): UseInfiniteQueryResult<InfiniteData<ListPage<MemberNote>>> =>
	useInfiniteQuery({
		...memberNotesQuery(companyId, membershipId),
		enabled: allowed,
	});

/** Reloads every page of the notes, so the list and its count stay right after any change. */
const useReloadNotes = (
	companyId: string,
	membershipId: string
): (() => Promise<void>) => {
	const client = useQueryClient();
	return () =>
		client.invalidateQueries({
			queryKey: memberNotesQuery(companyId, membershipId).queryKey,
		});
};

/** Adds a note, or with `noteId` rewrites one. */
export const useSaveNote = (
	companyId: string,
	membershipId: string
): UseMutationResult<
	MemberNote,
	Error,
	{ noteId: string | undefined; body: string }
> => {
	const reload = useReloadNotes(companyId, membershipId);
	return useMutation({
		mutationFn: ({ noteId, body }) =>
			noteId
				? updateMemberNote(companyId, membershipId, noteId, body)
				: createMemberNote(companyId, membershipId, body),
		// A refusal may mean the note is gone, so the list reloads either way.
		onSettled: reload,
	});
};

/** Deletes a note. */
export const useDeleteNote = (
	companyId: string,
	membershipId: string
): UseMutationResult<void, Error, string> => {
	const reload = useReloadNotes(companyId, membershipId);
	return useMutation({
		mutationFn: (noteId) => deleteMemberNote(companyId, membershipId, noteId),
		onSettled: reload,
	});
};
