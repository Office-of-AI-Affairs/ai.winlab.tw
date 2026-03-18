"use client";

import type { ReactNode, RefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

type Rect = { top: number; left: number; width: number; height: number };

function topCenter(r: Rect) {
  return { x: r.left + r.width / 2, y: r.top };
}
function bottomCenter(r: Rect) {
  return { x: r.left + r.width / 2, y: r.top + r.height };
}
function leftCenter(r: Rect) {
  return { x: r.left, y: r.top + r.height / 2 };
}
function rightCenter(r: Rect) {
  return { x: r.left + r.width, y: r.top + r.height / 2 };
}

function getRelativeRect(el: HTMLElement, container: HTMLElement): Rect {
  const elRect = el.getBoundingClientRect();
  const conRect = container.getBoundingClientRect();
  return {
    top: elRect.top - conRect.top,
    left: elRect.left - conRect.left,
    width: elRect.width,
    height: elRect.height,
  };
}

function OrgNode({
  title,
  person,
  sub,
  nodeRef,
  className = "",
  highlighted = false,
}: {
  title: string;
  person?: string;
  sub?: string;
  nodeRef?: RefObject<HTMLDivElement | null>;
  className?: string;
  highlighted?: boolean;
}) {
  return (
    <div
      ref={nodeRef}
      className={`flex flex-col items-center justify-center rounded-[1rem] bg-card px-4 py-3 text-center min-w-[110px] border transition-all duration-200 ${
        highlighted
          ? "border-foreground/40 border-2 shadow-sm"
          : "border-border"
      } ${className}`}
    >
      <div className={`text-sm tracking-wide ${highlighted ? "font-bold text-foreground" : "font-medium text-muted-foreground"}`}>{title}</div>
      {person && (
        <div className={`text-base mt-1 ${highlighted ? "font-extrabold text-foreground" : "font-bold text-foreground"}`}>{person}</div>
      )}
      {sub && (
        <div className={`text-sm mt-0.5 ${highlighted ? "text-muted-foreground" : "text-muted-foreground/80"}`}>{sub}</div>
      )}
    </div>
  );
}

type ActiveTab = "core" | "legal_entity" | "industry";

export function OrgChart({ activeTab = "core" }: { activeTab?: ActiveTab }) {
  const containerRef = useRef<HTMLDivElement>(null!);
  const directorRef = useRef<HTMLDivElement>(null!);
  const viceLeftRef = useRef<HTMLDivElement>(null!);
  const viceRightRef = useRef<HTMLDivElement>(null!);
  const jointRef = useRef<HTMLDivElement>(null!);
  const trainingRef = useRef<HTMLDivElement>(null!);
  const applyRef = useRef<HTMLDivElement>(null!);
  const legalRef = useRef<HTMLDivElement>(null!);
  const industryRef = useRef<HTMLDivElement>(null!);

  const [lines, setLines] = useState<ReactNode[]>([]);
  const [svgSize, setSvgSize] = useState({ w: 0, h: 0 });

  const recalculate = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const cRect = container.getBoundingClientRect();
    if (cRect.width === 0) return; // hidden on mobile
    setSvgSize({ w: cRect.width, h: cRect.height });

    const allRefs = [
      directorRef,
      viceLeftRef,
      viceRightRef,
      jointRef,
      trainingRef,
      applyRef,
      legalRef,
      industryRef,
    ];
    if (allRefs.some((r) => !r.current)) return;

    const [dir, vl, vr, jt, tr, ap, le, ind] = allRefs.map((r) =>
      getRelativeRect(r.current, container)
    );

    const elements: ReactNode[] = [];
    const stroke = "var(--border)";
    const sw = 1.5;

    // ── Two hub points ──
    // Upper hub: cross between 主任 (above) and 副主任左/右 (horizontal)
    const vlR = rightCenter(vl);
    const vrL = leftCenter(vr);
    const hubX = (vlR.x + vrL.x) / 2;  // center x (same column as 主任)
    const upperHubY = vlR.y;               // same y as vice directors

    // Lower hub: horizontal junction for 法人 ─── X ─── 産業
    // leR.y == indL.y because 法人 & 産業 are the same row with equal-height nodes
    const leR = rightCenter(le);
    const indL = leftCenter(ind);
    const lowerHubY = leR.y;              // horizontal dashed lines at this y

    const dirBot = bottomCenter(dir);
    const jtTop = topCenter(jt);
    const trTop = topCenter(tr);
    const apTop = topCenter(ap);

    // ── 主任 → upper hub (vertical) ──
    elements.push(
      <line key="dir-hub" x1={hubX} y1={dirBot.y} x2={hubX} y2={upperHubY} stroke={stroke} strokeWidth={sw} />,
    );

    // ── Cross bar: 副主任左 ←→ upper hub ←→ 副主任右 (horizontal) ──
    elements.push(
      <line key="cross-h" x1={vlR.x} y1={upperHubY} x2={vrL.x} y2={upperHubY} stroke={stroke} strokeWidth={sw} />,
    );

    // ── Upper hub → lower hub (vertical spine) ──
    elements.push(
      <line key="hub-spine" x1={hubX} y1={upperHubY} x2={hubX} y2={lowerHubY} stroke={stroke} strokeWidth={sw} />,
    );

    // ── Horizontal dashed: 法人 ─── lower hub ─── 産業 ──
    elements.push(
      <line key="le-hub" x1={leR.x} y1={lowerHubY} x2={hubX} y2={lowerHubY} stroke={stroke} strokeWidth={sw} strokeDasharray="6 4" />,
      <line key="hub-ind" x1={hubX} y1={lowerHubY} x2={indL.x} y2={lowerHubY} stroke={stroke} strokeWidth={sw} strokeDasharray="6 4" />,
      <text key="lbl-left" x={(leR.x + hubX) / 2} y={lowerHubY - 6} textAnchor="middle" fontSize="11" fill="var(--muted-foreground)" fontWeight="bold">聯盟</text>,
      <text key="lbl-right" x={(hubX + indL.x) / 2} y={lowerHubY - 6} textAnchor="middle" fontSize="11" fill="var(--muted-foreground)" fontWeight="bold">聯盟</text>,
    );

    // ── Lower hub → bus bar → 合聘 / 培訓 / 應用 ──
    const barY = lowerHubY + (jtTop.y - lowerHubY) / 2;
    elements.push(
      <line key="hub-bar" x1={hubX} y1={lowerHubY} x2={hubX} y2={barY} stroke={stroke} strokeWidth={sw} />,
      <line key="bar-h" x1={jtTop.x} y1={barY} x2={apTop.x} y2={barY} stroke={stroke} strokeWidth={sw} />,
      <line key="bar-jt" x1={jtTop.x} y1={barY} x2={jtTop.x} y2={jtTop.y} stroke={stroke} strokeWidth={sw} />,
      <line key="bar-tr" x1={trTop.x} y1={barY} x2={trTop.x} y2={trTop.y} stroke={stroke} strokeWidth={sw} />,
      <line key="bar-ap" x1={apTop.x} y1={barY} x2={apTop.x} y2={apTop.y} stroke={stroke} strokeWidth={sw} />,
    );

    setLines(elements);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    recalculate();
    const observer = new ResizeObserver(recalculate);
    observer.observe(container);
    return () => observer.disconnect();
  }, [recalculate]);

  return (
    <div className="w-full bg-background rounded-xl select-none">
      <h1 className="text-3xl font-bold">組織架構</h1>

      {/* ── Desktop (md+): SVG org chart with horizontal scroll fallback ── */}
      <div className="hidden md:block overflow-x-auto px-6 pb-8">
        <div className="min-w-[780px]">
          <div ref={containerRef} className="relative">
            <svg
              className="absolute inset-0 pointer-events-none"
              style={{ overflow: "visible" }}
              width={svgSize.w}
              height={svgSize.h}
            >
              {lines}
            </svg>

            {/*
            Grid layout (5 equal cols):
              col1      col2        col3(hub)   col4        col5
            Row1:  _         _         主任        _           _
            Row2:  _       副主任左   (hub x)   副主任右      _
            Row3: 法人       _           _         _         産業
            Row4:  _       合聘         培訓       應用        _
          */}
            <div
              className="grid gap-x-4 gap-y-6"
              style={{
                gridTemplateColumns: "1fr 1.5fr 1fr 1.5fr 1fr",
                gridTemplateRows: "auto auto auto auto",
              }}
            >
              {/* Row 1: 主任 at col 3 */}
              <div /><div />
              <div className="flex justify-center">
                <OrgNode nodeRef={directorRef} title="主任" person="曾建超教授" sub="資訊學院" className="min-w-[130px]" highlighted={activeTab === "core"} />
              </div>
              <div /><div />

              {/* Row 2: 副主任左(col2), hub-space(col3), 副主任右(col4) */}
              <div />
              <div className="flex justify-center">
                <OrgNode nodeRef={viceLeftRef} title="副主任" person="黃俊龍副院長" sub="資訊學院" className="w-full" highlighted={activeTab === "core"} />
              </div>
              <div /> {/* hub occupies this column – position derived by SVG calc */}
              <div className="flex justify-center">
                <OrgNode nodeRef={viceRightRef} title="副主任" person="陳建志所長" sub="智慧綠能學院" className="w-full" highlighted={activeTab === "core"} />
              </div>
              <div />

              {/* Row 3: 法人(col1), 産業(col5) – dashed alliance to hub */}
              <div className="flex justify-center items-center">
                <OrgNode nodeRef={legalRef} title="法人" className="w-full" highlighted={activeTab === "legal_entity"} />
              </div>
              <div /><div /><div />
              <div className="flex justify-center items-center">
                <OrgNode nodeRef={industryRef} title="產業" className="w-full" highlighted={activeTab === "industry"} />
              </div>

              {/* Row 4: 合聘(col2), 培訓(col3), 應用(col4) */}
              <div />
              <div className="flex justify-center">
                <OrgNode nodeRef={jointRef} title="合聘專家" person="許懷中教授" sub="逢甲AI中心主任" className="w-full" highlighted={activeTab === "core"} />
              </div>
              <div className="flex justify-center">
                <OrgNode nodeRef={trainingRef} title="培訓團隊" sub="（資訊技術中心）" className="w-full" highlighted={activeTab === "core"} />
              </div>
              <div className="flex justify-center">
                <OrgNode nodeRef={applyRef} title="應用團隊" sub="（教授與實驗室）" className="w-full" highlighted={activeTab === "core"} />
              </div>
              <div />
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile (<md): simple stacked layout, no SVG ── */}
      <div className="md:hidden px-4 pb-6 flex flex-col gap-3">
        {/* Row 1: 主任 */}
        <div className="flex justify-center">
          <OrgNode title="主任" person="曾建超教授" sub="資訊學院" className="w-48" highlighted={activeTab === "core"} />
        </div>
        {/* Row 2: 副主任×2 */}
        <div className="flex gap-3">
          <OrgNode title="副主任" person="黃俊龍副院長" sub="資訊學院" className="flex-1" highlighted={activeTab === "core"} />
          <OrgNode title="副主任" person="陳建志所長" sub="智慧綠能學院" className="flex-1" highlighted={activeTab === "core"} />
        </div>
        {/* Row 3: 法人 & 産業 (dashed alliance) */}
        <div className="flex items-center gap-2">
          <OrgNode title="法人" className="flex-1 border-dashed" highlighted={activeTab === "legal_entity"} />
          <span className="text-xs text-gray-400 shrink-0 px-1">⋯ 聯盟 ⋯</span>
          <OrgNode title="產業" className="flex-1 border-dashed" highlighted={activeTab === "industry"} />
        </div>
        {/* Row 4: 合聘/培訓/應用 */}
        <div className="flex gap-3">
          <OrgNode title="合聘專家" person="許懷中教授" sub="逢甲AI中心主任" className="flex-1" highlighted={activeTab === "core"} />
          <OrgNode title="培訓團隊" sub="（資訊技術中心）" className="flex-1" highlighted={activeTab === "core"} />
          <OrgNode title="應用團隊" sub="（教授與實驗室）" className="flex-1" highlighted={activeTab === "core"} />
        </div>
      </div>
    </div>
  );
}
