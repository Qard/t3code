import { useEffect, useState, type ReactNode } from "react";

const MAX_CACHED_DIAGRAMS = 50;
const MAX_DIAGRAM_SOURCE_LENGTH = 50_000;

const renderedDiagramCache = new Map<string, string>();
let nextDiagramId = 0;

function cacheDiagram(key: string, svg: string): void {
  renderedDiagramCache.delete(key);
  renderedDiagramCache.set(key, svg);
  if (renderedDiagramCache.size > MAX_CACHED_DIAGRAMS) {
    const oldestKey = renderedDiagramCache.keys().next().value;
    if (oldestKey !== undefined) renderedDiagramCache.delete(oldestKey);
  }
}

export function MermaidDiagram(props: {
  readonly source: string;
  readonly theme: "light" | "dark";
  readonly fallback: ReactNode;
}) {
  const cacheKey = `${props.theme}\0${props.source}`;
  const [result, setResult] = useState<{
    readonly cacheKey: string;
    readonly svg: string | null;
  } | null>(null);
  const cachedSvg = renderedDiagramCache.get(cacheKey);
  const svg = cachedSvg ?? (result?.cacheKey === cacheKey ? result.svg : null);
  const failed =
    props.source.length > MAX_DIAGRAM_SOURCE_LENGTH ||
    (result?.cacheKey === cacheKey && result.svg === null);

  useEffect(() => {
    if (renderedDiagramCache.has(cacheKey) || props.source.length > MAX_DIAGRAM_SOURCE_LENGTH)
      return;

    let current = true;
    const diagramId = `t3-mermaid-${++nextDiagramId}`;

    void import("mermaid")
      .then(async ({ default: mermaid }) => {
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          suppressErrorRendering: true,
          theme: props.theme === "dark" ? "dark" : "default",
          maxTextSize: MAX_DIAGRAM_SOURCE_LENGTH,
        });
        return mermaid.render(diagramId, props.source);
      })
      .then(({ svg: renderedSvg }) => {
        if (!current) return;
        cacheDiagram(cacheKey, renderedSvg);
        setResult({ cacheKey, svg: renderedSvg });
      })
      .catch((cause: unknown) => {
        if (!current) return;
        console.warn(
          "Mermaid rendering failed; showing diagram source instead.",
          cause instanceof Error ? cause.message : cause,
        );
        setResult({ cacheKey, svg: null });
      });

    return () => {
      current = false;
    };
  }, [cacheKey, props.source, props.theme]);

  if (failed) return props.fallback;
  if (svg === null) {
    return (
      <div
        role="status"
        aria-label="Rendering Mermaid diagram"
        className="flex min-h-24 items-center justify-center p-6 text-xs text-muted-foreground"
      >
        Rendering diagram…
      </div>
    );
  }

  return (
    <div
      data-mermaid-diagram=""
      role="img"
      aria-label="Mermaid diagram"
      className="overflow-auto bg-background p-4 [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
