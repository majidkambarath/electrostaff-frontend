import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';

// Motion is short, small and optional: nothing animates when the device asks for reduced motion.
const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const CLEAR = 'opacity,visibility,transform';

// Wraps a routed page. The page fades in, and its top-level sections cascade in as they appear —
// including when data replaces the loading skeleton.
export function MotionPage({ children, className }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || reduced()) return undefined;
    const seen = new WeakSet();
    const reveal = (nodes) => {
      const fresh = [...nodes].filter((n) => n.nodeType === 1 && !seen.has(n) && !n.dataset?.noMotion);
      fresh.forEach((n) => seen.add(n));
      if (fresh.length) {
        gsap.fromTo(fresh, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.06, ease: 'power3.out', clearProps: CLEAR });
      }
    };

    let page = null;
    const pageObserver = new MutationObserver((records) => records.forEach((r) => reveal(r.addedNodes)));
    const attach = () => {
      const next = root.firstElementChild;
      if (next === page) return;
      pageObserver.disconnect();
      page = next;
      if (page) {
        reveal(page.children);
        pageObserver.observe(page, { childList: true });
      }
    };
    const rootObserver = new MutationObserver(attach);
    rootObserver.observe(root, { childList: true });
    attach();
    gsap.fromTo(root, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25, ease: 'power1.out', clearProps: CLEAR });
    return () => {
      rootObserver.disconnect();
      pageObserver.disconnect();
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

const NUMBER = /^([^\d-]*)(-?[\d,]*\.?\d+)(.*)$/;
const toParts = (value) => {
  const m = NUMBER.exec(String(value ?? ''));
  if (!m) return null;
  const raw = m[2].replace(/,/g, '');
  return { prefix: m[1], number: Number(raw), decimals: raw.includes('.') ? raw.split('.')[1].length : 0, suffix: m[3], grouped: m[2].includes(',') };
};

// A formatted value ("₹43,900", "30.5", "12 staff") that counts up to its number when it appears
// or changes. Anything without a number is shown as is. The span's text is owned by the effect
// (React renders it empty), so React never fights the animation.
export function AnimatedNumber({ value, className }) {
  const ref = useRef(null);
  const shown = useRef(null); // number currently on screen

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const text = String(value ?? '');
    const parts = toParts(text);
    if (!parts || reduced()) {
      el.textContent = text;
      if (parts) shown.current = parts.number;
      return undefined;
    }
    const fmt = new Intl.NumberFormat('en-IN', { minimumFractionDigits: parts.decimals, maximumFractionDigits: parts.decimals, useGrouping: parts.grouped });
    const first = shown.current === null;
    const state = { v: shown.current ?? 0 };
    const render = () => {
      el.textContent = `${parts.prefix}${fmt.format(state.v)}${parts.suffix}`;
    };
    render();
    const tween = gsap.to(state, {
      v: parts.number,
      duration: first ? 0.9 : 0.5,
      ease: 'power2.out',
      onUpdate: render,
      onComplete: () => {
        el.textContent = text;
      },
    });
    return () => {
      tween.kill();
      shown.current = state.v;
    };
  }, [value]);

  return <span ref={ref} className={className} />;
}

// One-off entrance for a screen: children marked data-enter rise in, in order.
export function useEntrance(ref) {
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || reduced()) return undefined;
    const ctx = gsap.context(() => {
      gsap.fromTo('[data-enter]', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.08, ease: 'power3.out', clearProps: CLEAR });
      gsap.fromTo('[data-enter-pop]', { scale: 0.6, rotate: -12, autoAlpha: 0 }, { scale: 1, rotate: 0, autoAlpha: 1, duration: 0.6, ease: 'back.out(2)', clearProps: CLEAR });
    }, root);
    return () => ctx.revert();
  }, [ref]);
}
