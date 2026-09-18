import { Link } from 'react-router';
import { EmptyState } from '../components/ui/States';

export function NotFound() {
  return (
    <EmptyState
      title="페이지를 찾을 수 없어요"
      action={
        <Link to="/home" className="text-sm font-medium text-leaf-600">
          홈으로 가기
        </Link>
      }
    />
  );
}
