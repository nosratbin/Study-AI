import { useEffect, type RefObject } from "react";

/** Calls `callback` on a mouse/touch press outside `ref` (used by the VengeanceUI expandable bento grid). */
export function useOutsideClick(ref: RefObject<HTMLElement | null>, callback: (event: MouseEvent | TouchEvent) => void) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) return;
      callback(event);
    };
    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, callback]);
}
