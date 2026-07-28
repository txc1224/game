import { useEffect, useRef, useState } from 'react';

interface TypewriterOptions {
  /** 每字间隔 ms(默认 40) */
  speed?: number;
  /** 是否启用(false 则直接显示全文) */
  enabled?: boolean;
}

/**
 * 逐字机 hook:文本逐字打出,点击/再次推进可跳过直接显示全文。
 * 返回 { display(当前应显示文本), done(是否打完), skip(跳过), typing(正在打) }。
 */
export function useTypewriter(text: string, opts: TypewriterOptions = {}) {
  const { speed = 40, enabled = true } = opts;
  const [len, setLen] = useState(enabled ? 0 : text.length);
  const timer = useRef<number | null>(null);

  // 文本变化时重置
  useEffect(() => {
    if (!enabled) {
      setLen(text.length);
      return;
    }
    setLen(0);
    if (timer.current) window.clearInterval(timer.current);
    timer.current = window.setInterval(() => {
      setLen((n) => {
        if (n >= text.length) {
          if (timer.current) window.clearInterval(timer.current);
          return n;
        }
        return n + 1;
      });
    }, speed);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [text, speed, enabled]);

  const done = len >= text.length;
  const skip = () => {
    if (timer.current) window.clearInterval(timer.current);
    setLen(text.length);
  };

  return {
    display: text.slice(0, len),
    done,
    skip,
    typing: !done,
  };
}
