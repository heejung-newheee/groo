import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { qk } from '../api/keys';
import {
  createComment,
  createPost,
  deleteComment,
  deletePost,
  getAuthor,
  getPost,
  listComments,
  listPosts,
  report,
  setLike,
  POST_PAGE_SIZE,
  type FeedFilter,
  type PostInput,
  type ReportTarget,
} from '../api/community';
import type { PostWithMeta, ReportReason } from '../types/models';
import { useUserId } from './useSession';

/** 전체 피드와 프로필 피드 — 무한스크롤 */
export function usePostFeed(filter: FeedFilter) {
  const me = useUserId();
  return useInfiniteQuery({
    queryKey: qk.postFeed(filter.kind, filter.authorId ?? ''),
    queryFn: ({ pageParam }) => listPosts(me as string, filter, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, all) =>
      last.length < POST_PAGE_SIZE ? undefined : all.length,
    enabled: me !== null,
  });
}

export function usePost(id: string | undefined) {
  const me = useUserId();
  return useQuery({
    queryKey: qk.post(id ?? ''),
    queryFn: () => getPost(me as string, id as string),
    enabled: me !== null && Boolean(id),
  });
}

export function useAuthor(id: string | undefined) {
  return useQuery({
    queryKey: qk.author(id ?? ''),
    queryFn: () => getAuthor(id as string),
    enabled: Boolean(id),
  });
}

export function useCreatePost() {
  const qc = useQueryClient();
  const me = useUserId();
  return useMutation({
    mutationFn: (input: PostInput) => createPost(me as string, input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.posts }),
  });
}

export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (post: PostWithMeta) => deletePost(post),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.posts }),
  });
}

/** 캐시에 있는 같은 글(피드 여러 개 + 상세)을 한 번에 고친다 */
function patchPost(
  qc: ReturnType<typeof useQueryClient>,
  postId: string,
  patch: (post: PostWithMeta) => PostWithMeta,
) {
  qc.setQueriesData<InfiniteData<PostWithMeta[]>>(
    { queryKey: ['posts', 'feed'] },
    (data) =>
      data
        ? {
            ...data,
            pages: data.pages.map((page) =>
              page.map((p) => (p.id === postId ? patch(p) : p)),
            ),
          }
        : data,
  );
  qc.setQueryData<PostWithMeta | null>(qk.post(postId), (post) =>
    post ? patch(post) : post,
  );
}

/** 좋아요는 누르자마자 반영한다. 실패하면 되돌린다. */
export function useToggleLike() {
  const qc = useQueryClient();
  const me = useUserId();

  return useMutation({
    mutationFn: ({ postId, liked }: { postId: string; liked: boolean }) =>
      setLike(me as string, postId, liked),
    onMutate: ({ postId, liked }) => {
      patchPost(qc, postId, (p) => ({
        ...p,
        liked_by_me: liked,
        like_count: p.like_count + (liked ? 1 : -1),
      }));
    },
    onError: (_err, { postId, liked }) => {
      patchPost(qc, postId, (p) => ({
        ...p,
        liked_by_me: !liked,
        like_count: p.like_count + (liked ? -1 : 1),
      }));
    },
  });
}

export function useComments(postId: string | undefined) {
  return useQuery({
    queryKey: qk.comments(postId ?? ''),
    queryFn: () => listComments(postId as string),
    enabled: Boolean(postId),
  });
}

export function useCreateComment(postId: string) {
  const qc = useQueryClient();
  const me = useUserId();
  return useMutation({
    mutationFn: (body: string) => createComment(me as string, postId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.comments(postId) });
      patchPost(qc, postId, (p) => ({ ...p, comment_count: p.comment_count + 1 }));
    },
  });
}

export function useDeleteComment(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteComment(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.comments(postId) });
      patchPost(qc, postId, (p) => ({
        ...p,
        comment_count: Math.max(0, p.comment_count - 1),
      }));
    },
  });
}

export function useReport() {
  const me = useUserId();
  return useMutation({
    mutationFn: ({ target, reason }: { target: ReportTarget; reason: ReportReason }) =>
      report(me as string, target, reason),
  });
}
