import { useEffect, useRef, useState } from 'react';

const DEFAULT_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export function TextScramble({
  children,
  duration = 0.8,
  speed = 0.04,
  characterSet = DEFAULT_CHARS,
  className,
  as: Component = 'p',
  trigger = true,
  onScrambleComplete,
  ...props
}) {
  const [displayText, setDisplayText] = useState(children);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!trigger) return;

    // Clear any running animation before starting a new one
    if (intervalRef.current) clearInterval(intervalRef.current);

    const text = children;
    const steps = Math.ceil(duration / speed);
    let step = 0;

    intervalRef.current = setInterval(() => {
      const progress = step / steps;
      let scrambled = '';

      for (let i = 0; i < text.length; i++) {
        if (text[i] === ' ') { scrambled += ' '; continue; }
        if (progress * text.length > i) {
          scrambled += text[i];
        } else {
          scrambled += characterSet[Math.floor(Math.random() * characterSet.length)];
        }
      }

      setDisplayText(scrambled);
      step++;

      if (step > steps) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        setDisplayText(text);
        onScrambleComplete?.();
      }
    }, speed * 1000);

    // Cleanup on unmount or when trigger changes
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [trigger, children, duration, speed, characterSet]);

  return (
    <Component className={className} {...props}>
      {displayText}
    </Component>
  );
}

export default TextScramble;
