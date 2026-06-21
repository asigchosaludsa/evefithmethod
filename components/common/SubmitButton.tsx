'use client';

import * as React from 'react';
import { useFormStatus } from 'react-dom';
import { Button, type ButtonProps } from './Button';

/**
 * Submit button that auto-shows a pending state inside a <form action={...}>.
 * Use within Server-Action forms.
 */
export function SubmitButton({ children, loading, ...props }: ButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={loading ?? pending} {...props}>
      {children}
    </Button>
  );
}
