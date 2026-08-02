import { useEffect, useEffectEvent, useRef, type RefObject } from 'react';

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

export function useModalFocus<T extends HTMLElement>(
  active: boolean,
  onClose: () => void,
  restoreTarget?: RefObject<HTMLElement | null>
) {
  const containerRef = useRef<T | null>(null);
  const closeModal = useEffectEvent(onClose);

  useEffect(() => {
    if (!active) return;

    const container = containerRef.current;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const restoreElement = restoreTarget?.current ?? previouslyFocused;
    const initialFocus = container?.querySelector<HTMLElement>(focusableSelector) ?? container;
    initialFocus?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeModal();
        return;
      }

      if (event.key !== 'Tab' || !container) return;
      const controls = Array.from(container.querySelectorAll<HTMLElement>(focusableSelector));
      if (controls.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }

      const first = controls[0];
      const last = controls.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      restoreElement?.focus();
    };
  }, [active, restoreTarget]);

  return containerRef;
}
