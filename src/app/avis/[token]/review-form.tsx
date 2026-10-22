'use client';

import { Send } from 'lucide-react';
import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { submitReviewAction, type ReviewActionState } from '@/modules/avis/actions';

export function ReviewForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<ReviewActionState, FormData>(
    submitReviewAction,
    {},
  );
  const [rating, setRating] = useState(5);

  if (state.success) {
    return (
      <p
        role="status"
        className="rounded-[var(--radius-md)] border border-success bg-success-soft p-6 text-success"
      >
        {state.success}
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <fieldset>
        <legend className="text-sm font-semibold text-fg">Votre note</legend>
        <div className="mt-2 flex gap-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <label key={value} className="flex items-center gap-1">
              <input
                type="radio"
                name="rating"
                value={value}
                checked={rating === value}
                onChange={() => setRating(value)}
                className="size-4"
              />
              {value}
            </label>
          ))}
        </div>
      </fieldset>
      <Textarea label="Votre commentaire (facultatif)" name="comment" maxLength={1500} rows={5} />
      {state.error ? (
        <p role="alert" className="text-sm font-medium text-alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" icon={Send} loading={pending}>
        Envoyer mon avis
      </Button>
    </form>
  );
}
