import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

interface Tip {
  text: string;
  shortcut?: string;
  anchorX: number;
  anchorY: number;
  placement: 'top' | 'bottom';
}

const GAP = 8;
const EDGE = 8;

/**
 * Instant, styled tooltips for every element with a `title`, on mouse devices.
 * While an element is hovered its title is parked in `data-tip`, so the browser's own
 * (slow, plain) tooltip never shows; it's put back as soon as the pointer leaves.
 */
export const HoverTooltips: React.FC = () => {
  const [tip, setTip] = useState<Tip | null>(null);
  const [left, setLeft] = useState(0);
  const tipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    let current: HTMLElement | null = null;
    let observer: MutationObserver | null = null;

    const place = (el: HTMLElement, text: string) => {
      const r = el.getBoundingClientRect();
      // Prefer above; go below when there's no room (e.g. the fixed header)
      const below = r.top < 48;
      // elements can name their keyboard shortcut with data-shortcut; it's shown as a key badge
      setTip({ text, shortcut: el.dataset.shortcut, anchorX: r.left + r.width / 2, anchorY: below ? r.bottom + GAP : r.top - GAP, placement: below ? 'bottom' : 'top' });
    };

    // Keep the browser tooltip suppressed if React re-renders the title while hovered (e.g. Expand -> Collapse)
    const parkTitle = (el: HTMLElement) => {
      const text = el.getAttribute('title');
      if (text === null) return el.dataset.tip ?? null;
      el.dataset.tip = text;
      el.removeAttribute('title');
      return text;
    };

    const release = () => {
      observer?.disconnect();
      observer = null;
      if (current && current.dataset.tip !== undefined) {
        current.setAttribute('title', current.dataset.tip);
        delete current.dataset.tip;
      }
      current = null;
      setTip(null);
    };

    const onPointerOver = (e: PointerEvent) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[title], [data-tip]');
      if (el === current) return;
      release();
      if (!el) return;
      const text = parkTitle(el);
      if (!text) return;
      current = el;
      place(el, text);
      observer = new MutationObserver(() => {
        if (!current) return;
        if (current.hasAttribute('title')) {
          const updated = parkTitle(current);
          if (updated) place(current, updated);
        }
      });
      observer.observe(el, { attributes: true, attributeFilter: ['title'] });
    };

    const onPointerOut = (e: PointerEvent) => {
      if (!current) return;
      const to = e.relatedTarget as Node | null;
      if (to && current.contains(to)) return;
      release();
    };

    // Pressing or typing dismisses the tip; scrolling keeps it on its element
    const hide = () => setTip(null);
    let frame = 0;
    const follow = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (current?.isConnected && current.dataset.tip) place(current, current.dataset.tip);
      });
    };

    document.addEventListener('pointerover', onPointerOver);
    document.addEventListener('pointerout', onPointerOut);
    document.addEventListener('pointerdown', hide, true);
    document.addEventListener('keydown', hide, true);
    window.addEventListener('scroll', follow, { passive: true, capture: true });
    return () => {
      release();
      document.removeEventListener('pointerover', onPointerOver);
      document.removeEventListener('pointerout', onPointerOut);
      document.removeEventListener('pointerdown', hide, true);
      document.removeEventListener('keydown', hide, true);
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', follow, { capture: true });
    };
  }, []);

  // Center on the element, but keep the whole tip on screen
  useLayoutEffect(() => {
    if (!tip || !tipRef.current) return;
    const width = tipRef.current.offsetWidth;
    setLeft(Math.min(Math.max(tip.anchorX - width / 2, EDGE), window.innerWidth - width - EDGE));
  }, [tip]);

  if (!tip) return null;
  return (
    <div
      ref={tipRef}
      className={`hover-tip hover-tip-${tip.placement}`}
      role="tooltip"
      style={{
        left,
        top: tip.anchorY,
        '--arrow-x': `${tip.anchorX - left}px`,
      } as React.CSSProperties}
    >
      {tip.text}
      {tip.shortcut && tip.shortcut.split(' ').map(k => <kbd key={k} className="hover-tip-kbd">{k}</kbd>)}
    </div>
  );
};
