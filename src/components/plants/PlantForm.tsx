import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { plantFormSchema, type PlantFormValues } from '../../lib/schemas/plant';
import type { PlantInput } from '../../api/plants';
import { Button } from '../ui/Button';
import { Field, Input } from '../ui/Field';
import type { Plant } from '../../types/models';

function toInput(values: PlantFormValues): PlantInput {
  const interval = values.watering_interval_days.trim();
  return {
    nickname: values.nickname.trim(),
    species: values.species.trim() || null,
    adopted_at: values.adopted_at,
    location: values.location.trim() || null,
    watering_interval_days: interval === '' ? null : Number(interval),
  };
}

export function PlantForm({
  plant,
  submitting,
  onSubmit,
}: {
  plant?: Plant;
  submitting: boolean;
  onSubmit: (input: PlantInput) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PlantFormValues>({
    resolver: zodResolver(plantFormSchema),
    defaultValues: {
      nickname: plant?.nickname ?? '',
      species: plant?.species ?? '',
      adopted_at: plant?.adopted_at ?? format(new Date(), 'yyyy-MM-dd'),
      location: plant?.location ?? '',
      watering_interval_days: plant?.watering_interval_days?.toString() ?? '',
    },
  });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        void handleSubmit((values) => onSubmit(toInput(values)))(e);
      }}
    >
      <Field label="애칭" error={errors.nickname?.message}>
        <Input {...register('nickname')} placeholder="몬스테라" autoFocus />
      </Field>

      <Field label="종류 (선택)" error={errors.species?.message}>
        <Input {...register('species')} placeholder="몬스테라 델리시오사" />
      </Field>

      <Field label="입양일" error={errors.adopted_at?.message}>
        <Input type="date" {...register('adopted_at')} />
      </Field>

      <Field label="장소 (선택)" error={errors.location?.message}>
        <Input {...register('location')} placeholder="거실 창가" />
      </Field>

      <Field
        label="물주기 주기 (선택)"
        error={errors.watering_interval_days?.message}
        hint="비워두면 물주기 알림을 받지 않아요. 선인장처럼 주기가 불규칙한 식물에 좋아요."
      >
        <Input type="number" min={1} max={365} {...register('watering_interval_days')} placeholder="7" />
      </Field>

      <Button type="submit" disabled={submitting}>
        {submitting ? '저장 중…' : '저장'}
      </Button>
    </form>
  );
}
