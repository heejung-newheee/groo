import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAnalysis,
  getTodayUsage,
  listAnalyzedPhotoIds,
  requestAnalysis,
  sendFeedback,
} from '../api/ai';
import { qk } from '../api/keys';
import { AI } from '../lib/constants';
import { useUserId } from './useSession';

/**
 * 분석은 Edge Function 이 비동기로 처리하므로 결과를 폴링한다.
 * status 가 pending 인 동안만 3초 간격, 그 외에는 멈춘다.
 */
export function useAnalysis(photoId: string | undefined) {
  return useQuery({
    queryKey: qk.analysis(photoId ?? ''),
    queryFn: () => getAnalysis(photoId as string),
    enabled: Boolean(photoId),
    refetchInterval: (query) =>
      query.state.data?.status === 'pending' ? AI.pollIntervalMs : false,
  });
}

export function useTodayUsage() {
  const userId = useUserId();
  return useQuery({
    queryKey: qk.aiQuota,
    queryFn: () => getTodayUsage(userId as string),
    enabled: userId !== null,
  });
}

export function useRequestAnalysis(photoId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (force: boolean = false) => requestAnalysis(photoId, force),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.analysis(photoId) });
      void qc.invalidateQueries({ queryKey: qk.aiQuota });
    },
  });
}

export function useAnalysisFeedback(photoId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, helpful }: { id: string; helpful: boolean }) => sendFeedback(id, helpful),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.analysis(photoId) }),
  });
}

export function useAnalyzedPhotoIds() {
  return useQuery({
    queryKey: ['ai', 'analyzed-photos'],
    queryFn: listAnalyzedPhotoIds,
  });
}
