import { useState, useEffect } from "react";

export function useSearchParam(key: string): string | null {
  const [value, setValue] = useState<string | null>(
    () => new URLSearchParams(window.location.search).get(key)
  );

  useEffect(() => {
    const update = () => {
      setValue(new URLSearchParams(window.location.search).get(key));
    };

    window.addEventListener("popstate", update);
    window.addEventListener("urlchange", update);

    return () => {
      window.removeEventListener("popstate", update);
      window.removeEventListener("urlchange", update);
    };
  }, [key]);

  return value;
}
