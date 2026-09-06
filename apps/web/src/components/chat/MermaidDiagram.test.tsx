import { act, type ReactNode } from "react";
import { create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

const mermaid = vi.hoisted(() => ({
  initialize: vi.fn(),
  render: vi.fn(),
}));

vi.mock("mermaid", () => ({ default: mermaid }));

import { MermaidDiagram } from "./MermaidDiagram";

function fallback(): ReactNode {
  return <pre data-mermaid-fallback="">diagram source</pre>;
}

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("MermaidDiagram", () => {
  it("renders settled diagram source with strict security and the current theme", async () => {
    mermaid.render.mockResolvedValue({ svg: '<svg aria-label="diagram"></svg>' });
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    let renderer: ReactTestRenderer | undefined;

    await act(async () => {
      renderer = create(
        <MermaidDiagram source={"flowchart LR\nA --> B"} theme="dark" fallback={fallback()} />,
      );
    });

    expect(mermaid.initialize).toHaveBeenCalledWith(
      expect.objectContaining({ securityLevel: "strict", startOnLoad: false, theme: "dark" }),
    );
    expect(mermaid.render).toHaveBeenCalledWith(
      expect.stringMatching(/^t3-mermaid-/),
      "flowchart LR\nA --> B",
    );
    expect(
      renderer!.root.findByProps({ "data-mermaid-diagram": "" }).props.dangerouslySetInnerHTML,
    ).toEqual({ __html: '<svg aria-label="diagram"></svg>' });

    await act(async () => renderer?.unmount());
  });

  it("keeps the source fallback when rendering fails", async () => {
    mermaid.render.mockRejectedValue(new Error("bad diagram"));
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    let renderer: ReactTestRenderer | undefined;

    await act(async () => {
      renderer = create(<MermaidDiagram source="not valid" theme="light" fallback={fallback()} />);
    });

    expect(renderer!.root.findAllByProps({ "data-mermaid-fallback": "" })).toHaveLength(1);
    expect(renderer!.root.findAllByProps({ "data-mermaid-diagram": "" })).toHaveLength(0);

    await act(async () => renderer?.unmount());
  });
});
