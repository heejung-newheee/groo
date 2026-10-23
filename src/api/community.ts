import { supabase } from '../lib/supabase';
import { buildStoragePath, processImage, thumbPath } from '../lib/image';
import { BUCKET, removeObjects } from './storage';
import { uploadThumb, type PendingPhoto } from './photos';
import type {
  Author,
  Comment,
  Photo,
  Plant,
  PostKind,
  PostWithMeta,
  ReportReason,
} from '../types/models';

export const POST_PAGE_SIZE = 20;

/** 개수는 PostgREST 의 embed count 로 받는다. my_like 는 아래에서 내 것만 남기도록 거른다. */
const POST_SELECT =
  '*, author:profiles(id, display_name, avatar_url), photos:post_photos(*), likes(count), comments(count), my_like:likes(user_id)';

interface PostRow extends Omit<
  PostWithMeta,
  'like_count' | 'comment_count' | 'liked_by_me'
> {
  likes: { count: number }[];
  comments: { count: number }[];
  my_like: { user_id: string }[];
}

function toPost(row: PostRow): PostWithMeta {
  const { likes, comments, my_like, ...post } = row;
  post.photos.sort((a, b) => a.sort_order - b.sort_order);
  return {
    ...post,
    like_count: likes[0]?.count ?? 0,
    comment_count: comments[0]?.count ?? 0,
    liked_by_me: my_like.length > 0,
  };
}

export interface FeedFilter {
  kind: PostKind | 'all';
  /** 프로필 피드면 그 사람 id */
  authorId: string | null;
}

export async function listPosts(
  me: string,
  filter: FeedFilter,
  page: number,
): Promise<PostWithMeta[]> {
  const from = page * POST_PAGE_SIZE;
  let query = supabase
    .from('posts')
    .select(POST_SELECT)
    .eq('my_like.user_id', me)
    .order('created_at', { ascending: false })
    .range(from, from + POST_PAGE_SIZE - 1);
  if (filter.kind !== 'all') query = query.eq('kind', filter.kind);
  if (filter.authorId) query = query.eq('user_id', filter.authorId);

  const { data, error } = await query;
  if (error) throw error;
  return (data as unknown as PostRow[]).map(toPost);
}

export async function getPost(me: string, id: string): Promise<PostWithMeta | null> {
  const { data, error } = await supabase
    .from('posts')
    .select(POST_SELECT)
    .eq('my_like.user_id', me)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? toPost(data as unknown as PostRow) : null;
}

export async function getAuthor(id: string): Promise<Author | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export interface PostInput {
  kind: PostKind;
  body: string;
  plant: Pick<Plant, 'id' | 'nickname' | 'species' | 'adopted_at'> | null;
  /** 새로 고른 사진 */
  photos: PendingPhoto[];
  /** 일지에서 가져온 사진. 파일을 복사한다 — 일지를 지워도 게시물이 깨지지 않게 */
  entryPhotos: Photo[];
}

/**
 * 게시물 → 사진 업로드 → post_photos 순으로 만든다.
 * 중간에 실패하면 게시물과 올린 파일을 지워 반쪽짜리 글이 피드에 남지 않게 한다.
 */
export async function createPost(userId: string, input: PostInput): Promise<string> {
  const { data: post, error } = await supabase
    .from('posts')
    .insert({
      user_id: userId,
      kind: input.kind,
      body: input.body,
      plant_id: input.plant?.id ?? null,
      plant_nickname: input.plant?.nickname ?? null,
      plant_species: input.plant?.species ?? null,
      plant_adopted_at: input.plant?.adopted_at ?? null,
    })
    .select('id')
    .single();
  if (error) throw error;

  const uploaded: string[] = [];
  try {
    const rows = [];

    for (const photo of input.entryPhotos) {
      const path = buildStoragePath(userId, 'posts');
      const { error: copyErr } = await supabase.storage
        .from(BUCKET)
        .copy(photo.storage_path, path);
      if (copyErr) throw copyErr;
      uploaded.push(path);
      // 썸네일이 없는 예전 사진이면 실패한다. 카드가 원본으로 대체하니 무시한다.
      const { error: thumbErr } = await supabase.storage
        .from(BUCKET)
        .copy(thumbPath(photo.storage_path), thumbPath(path));
      if (!thumbErr) uploaded.push(thumbPath(path));
      rows.push({ storage_path: path, width: photo.width, height: photo.height });
    }

    for (const pending of input.photos) {
      const { blob, width, height } = await processImage(pending.file);
      const path = buildStoragePath(userId, 'posts');
      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, { contentType: 'image/webp', upsert: false });
      if (uploadErr) throw uploadErr;
      uploaded.push(path, thumbPath(path));
      await uploadThumb(path, blob);
      rows.push({ storage_path: path, width, height });
    }

    if (rows.length > 0) {
      const { error: rowsErr } = await supabase
        .from('post_photos')
        .insert(
          rows.map((row, index) => ({ ...row, post_id: post.id, sort_order: index })),
        );
      if (rowsErr) throw rowsErr;
    }
  } catch (err) {
    await supabase.from('posts').delete().eq('id', post.id);
    await removeObjects(uploaded);
    throw err;
  }

  return post.id;
}

export async function deletePost(post: PostWithMeta): Promise<void> {
  const { error } = await supabase.from('posts').delete().eq('id', post.id);
  if (error) throw error;
  await removeObjects(
    post.photos.flatMap((p) => [p.storage_path, thumbPath(p.storage_path)]),
  );
}

export async function setLike(
  userId: string,
  postId: string,
  liked: boolean,
): Promise<void> {
  const { error } = liked
    ? await supabase.from('likes').insert({ post_id: postId, user_id: userId })
    : await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', userId);
  // 연타로 이미 눌린 상태면 PK 충돌(23505)이 난다 — 원하는 상태와 같으니 무시한다
  if (error && error.code !== '23505') throw error;
}

export async function listComments(postId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select('*, author:profiles(id, display_name, avatar_url)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as Comment[];
}

export async function createComment(
  userId: string,
  postId: string,
  body: string,
): Promise<void> {
  const { error } = await supabase
    .from('comments')
    .insert({ user_id: userId, post_id: postId, body });
  if (error) throw error;
}

export async function deleteComment(id: string): Promise<void> {
  const { error } = await supabase.from('comments').delete().eq('id', id);
  if (error) throw error;
}

export type ReportTarget = { postId: string } | { commentId: string };

/** 이미 신고했으면 false. 같은 사람이 여러 번 신고해도 한 번으로 친다. */
export async function report(
  userId: string,
  target: ReportTarget,
  reason: ReportReason,
): Promise<boolean> {
  const { error } = await supabase.from('reports').insert({
    reporter_id: userId,
    post_id: 'postId' in target ? target.postId : null,
    comment_id: 'commentId' in target ? target.commentId : null,
    reason,
  });
  if (error?.code === '23505') return false;
  if (error) throw error;
  return true;
}
