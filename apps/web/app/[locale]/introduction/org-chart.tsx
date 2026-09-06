"use client";

import type { ReactNode, Ref, RefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import { useT } from "@/lib/i18n/locale-provider";

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
  nodeRef?: Ref<HTMLDivElement>;
  className?: string;
  highlighted?: boolean;
}) {
  return (
    <div
      ref={nodeRef}
      className={`flex flex-col items-center justify-center rounded-lg bg-card px-4 py-3 text-center min-w-[110px] border transition-[border-color,box-shadow,transform] duration-200 ${
        highlighted
          ? "border-foreground/40 border-2 shadow-sm"
          : "border-border"
      } ${className}`}
    >
      <div className={`text-sm tracking-wide whitespace-nowrap ${highlighted ? "font-bold text-foreground" : "font-medium text-muted-foreground"}`}>{title}</div>
      {person && (
        <div className={`text-base mt-1 ${highlighted ? "font-extrabold text-foreground" : "font-bold text-foreground"}`}>{person}</div>
      )}
      {sub && (
        <div className={`text-sm mt-0.5 whitespace-nowrap ${highlighted ? "text-muted-foreground" : "text-muted-foreground/80"}`}>{sub}</div>
      )}
    </div>
  );
}

/**
 * The 法人／合作夥伴 nodes. Collapsed by default — the member list is long
 * enough to drown the chart, so it only appears once the visitor asks for it.
 * The count keeps the collapsed state informative.
 */
function WingNode({
  title,
  count,
  expanded,
  onToggle,
  controls,
  nodeRef,
  highlighted = false,
  className = "",
}: {
  title: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  controls: string;
  nodeRef?: Ref<HTMLButtonElement>;
  highlighted?: boolean;
  className?: string;
}) {
  return (
    <button
      ref={nodeRef}
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      aria-controls={controls}
      className={`flex flex-col items-center justify-center gap-1 rounded-lg bg-card px-4 py-3 text-center min-w-[110px] border cursor-pointer interactive-scale transition-[border-color,box-shadow,transform] duration-200 hover:border-foreground/30 ${
        highlighted ? "border-foreground/40 border-2 shadow-sm" : "border-border"
      } ${className}`}
    >
      <span className={`text-sm tracking-wide ${highlighted ? "font-bold text-foreground" : "font-medium text-muted-foreground"}`}>
        {title}
      </span>
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        {count}
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </span>
    </button>
  );
}

/** Compact leaf node for the partner names hanging off each wing. */
function BranchNode({
  label,
  nodeRef,
  highlighted = false,
}: {
  label: string;
  nodeRef?: Ref<HTMLDivElement>;
  highlighted?: boolean;
}) {
  return (
    <div
      ref={nodeRef}
      className={`rounded-md bg-card px-2 py-1.5 text-center text-xs leading-tight border transition-[border-color] duration-200 ${
        highlighted ? "border-foreground/40 text-foreground" : "border-border text-muted-foreground"
      }`}
    >
      {label}
    </div>
  );
}

type ActiveTab = "core" | "legal_entity" | "industry";

const LEGAL_PANEL_ID = "org-chart-legal-entities";
const INDUSTRY_PANEL_ID = "org-chart-industry-partners";

export function OrgChart({
  activeTab = "core",
  legalEntityNames = [],
  industryNames = [],
  onSelectCategory,
}: {
  activeTab?: ActiveTab;
  legalEntityNames?: string[];
  industryNames?: string[];
  /** Clicking a wing also moves the member tabs below to that category. */
  onSelectCategory?: (category: ActiveTab) => void;
}) {
  const t = useT();
  const containerRef = useRef<HTMLDivElement>(null!);
  const directorRef = useRef<HTMLDivElement>(null!);
  const boyaRef = useRef<HTMLDivElement>(null!);
  const northRef = useRef<HTMLDivElement>(null!);
  const southRef = useRef<HTMLDivElement>(null!);
  const trainingRef = useRef<HTMLDivElement>(null!);
  const applyRef = useRef<HTMLDivElement>(null!);
  const legalRef = useRef<HTMLButtonElement>(null!);
  const industryRef = useRef<HTMLButtonElement>(null!);
  const legalItemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const industryItemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [legalOpen, setLegalOpen] = useState(false);
  const [industryOpen, setIndustryOpen] = useState(false);

  const toggleLegal = () => {
    setLegalOpen((v) => !v);
    onSelectCategory?.("legal_entity");
  };
  const toggleIndustry = () => {
    setIndustryOpen((v) => !v);
    onSelectCategory?.("industry");
  };

  const [lines, setLines] = useState<ReactNode[]>([]);
  const [svgSize, setSvgSize] = useState({ w: 0, h: 0 });

  const recalculate = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const cRect = container.getBoundingClientRect();
    if (cRect.width === 0) return; // hidden on mobile
    setSvgSize({ w: cRect.width, h: cRect.height });

    const allRefs: RefObject<HTMLElement | null>[] = [
      directorRef,
      boyaRef,
      northRef,
      southRef,
      trainingRef,
      applyRef,
      legalRef,
      industryRef,
    ];
    if (allRefs.some((r) => !r.current)) return;

    const [dir, boya, north, south, tr, ap, le, ind] = allRefs.map((r) =>
      getRelativeRect(r.current!, container)
    );

    const elements: ReactNode[] = [];
    const stroke = "var(--border)";
    const sw = 1.5;

    // ── Central spine ──
    // The three deputies cannot straddle a single axis, so the spine runs in the
    // narrow gutter column between 博雅 and 北部校區 (same as the source deck).
    // Its x is the midpoint of that gutter.
    const hubX = (boya.left + boya.width + north.left) / 2;

    const dirBot = bottomCenter(dir);
    const boyaTop = topCenter(boya);
    const northTop = topCenter(north);
    const southTop = topCenter(south);

    // Deputy cross bar sits halfway between 主任 and the deputy row.
    const crossY = dirBot.y + (boyaTop.y - dirBot.y) / 2;

    // ── 主任 → cross bar ──
    elements.push(
      <line key="dir-cross" x1={hubX} y1={dirBot.y} x2={hubX} y2={crossY} stroke={stroke} strokeWidth={sw} />,
    );

    // ── Cross bar spanning the three deputies, plus a drop into each ──
    elements.push(
      <line key="cross-h" x1={boyaTop.x} y1={crossY} x2={southTop.x} y2={crossY} stroke={stroke} strokeWidth={sw} />,
      <line key="cross-boya" x1={boyaTop.x} y1={crossY} x2={boyaTop.x} y2={boyaTop.y} stroke={stroke} strokeWidth={sw} />,
      <line key="cross-north" x1={northTop.x} y1={crossY} x2={northTop.x} y2={northTop.y} stroke={stroke} strokeWidth={sw} />,
      <line key="cross-south" x1={southTop.x} y1={crossY} x2={southTop.x} y2={southTop.y} stroke={stroke} strokeWidth={sw} />,
    );

    // ── Alliance row: 法人 ┈┈ spine ┈┈ 合作夥伴 ──
    // le and ind share a row of equal-height nodes, so their centers share a y.
    const leR = rightCenter(le);
    const indL = leftCenter(ind);
    const allianceY = leR.y;

    elements.push(
      <line key="spine-upper" x1={hubX} y1={crossY} x2={hubX} y2={allianceY} stroke={stroke} strokeWidth={sw} />,
      <line key="le-hub" x1={leR.x} y1={allianceY} x2={hubX} y2={allianceY} stroke={stroke} strokeWidth={sw} strokeDasharray="6 4" />,
      <line key="hub-ind" x1={hubX} y1={allianceY} x2={indL.x} y2={allianceY} stroke={stroke} strokeWidth={sw} strokeDasharray="6 4" />,
      <text key="lbl-left" x={(leR.x + hubX) / 2} y={allianceY - 6} textAnchor="middle" fontSize="11" fill="var(--muted-foreground)" fontWeight="bold">{t.introduction.orgChart.alliance}</text>,
      <text key="lbl-right" x={(hubX + indL.x) / 2} y={allianceY - 6} textAnchor="middle" fontSize="11" fill="var(--muted-foreground)" fontWeight="bold">{t.introduction.orgChart.alliance}</text>,
    );

    // ── Wing brackets — only drawn for a wing the visitor has expanded ──
    const legalItems = legalItemRefs.current
      .filter((el): el is HTMLDivElement => el !== null)
      .map((el) => getRelativeRect(el, container));
    if (legalItems.length > 0) {
      const leL = leftCenter(le);
      const busX = (Math.max(...legalItems.map((r) => r.left + r.width)) + leL.x) / 2;
      const ys = legalItems.map((r) => r.top + r.height / 2);
      elements.push(
        <line key="legal-bus" x1={busX} y1={Math.min(...ys)} x2={busX} y2={Math.max(...ys)} stroke={stroke} strokeWidth={sw} />,
        <line key="legal-tap" x1={busX} y1={leL.y} x2={leL.x} y2={leL.y} stroke={stroke} strokeWidth={sw} />,
      );
      legalItems.forEach((r, i) => {
        const p = rightCenter(r);
        elements.push(
          <line key={`legal-leaf-${i}`} x1={p.x} y1={p.y} x2={busX} y2={p.y} stroke={stroke} strokeWidth={sw} />,
        );
      });
    }

    const industryItems = industryItemRefs.current
      .filter((el): el is HTMLDivElement => el !== null)
      .map((el) => getRelativeRect(el, container));
    if (industryItems.length > 0) {
      const indR = rightCenter(ind);
      const busX = (indR.x + Math.min(...industryItems.map((r) => r.left))) / 2;
      const ys = industryItems.map((r) => r.top + r.height / 2);
      elements.push(
        <line key="ind-bus" x1={busX} y1={Math.min(...ys)} x2={busX} y2={Math.max(...ys)} stroke={stroke} strokeWidth={sw} />,
        <line key="ind-tap" x1={indR.x} y1={indR.y} x2={busX} y2={indR.y} stroke={stroke} strokeWidth={sw} />,
      );
      industryItems.forEach((r, i) => {
        const p = leftCenter(r);
        elements.push(
          <line key={`ind-leaf-${i}`} x1={busX} y1={p.y} x2={p.x} y2={p.y} stroke={stroke} strokeWidth={sw} />,
        );
      });
    }

    // ── Spine → bus bar → 應用團隊 / 培訓團隊 ──
    const apTop = topCenter(ap);
    const trTop = topCenter(tr);
    const barY = allianceY + (apTop.y - allianceY) / 2;
    elements.push(
      <line key="spine-lower" x1={hubX} y1={allianceY} x2={hubX} y2={barY} stroke={stroke} strokeWidth={sw} />,
      <line key="bar-h" x1={apTop.x} y1={barY} x2={trTop.x} y2={barY} stroke={stroke} strokeWidth={sw} />,
      <line key="bar-ap" x1={apTop.x} y1={barY} x2={apTop.x} y2={apTop.y} stroke={stroke} strokeWidth={sw} />,
      <line key="bar-tr" x1={trTop.x} y1={barY} x2={trTop.x} y2={trTop.y} stroke={stroke} strokeWidth={sw} />,
    );

    setLines(elements);
  }, [t]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    recalculate();
    const observer = new ResizeObserver(recalculate);
    observer.observe(container);
    return () => observer.disconnect();
    // Expanding a wing adds leaf nodes and moves the alliance row, so the
    // lines must be redrawn even when the container itself hasn't resized.
  }, [recalculate, legalOpen, industryOpen, legalEntityNames.length, industryNames.length]);

  return (
    <div className="w-full bg-background rounded-xl select-none">
      <h1 className="text-3xl font-bold">{t.introduction.orgChart.heading}</h1>

      {/* ── Desktop (md+): SVG org chart with horizontal scroll fallback ── */}
      <div className="hidden md:block overflow-x-auto px-6 pb-8">
        <div className="min-w-[1040px]">
          {/* Reserve vertical space so the lines drawing after mount
              don't push surrounding content around (CLS). */}
          <div ref={containerRef} className="relative min-h-[420px]">
            <svg
              className="absolute inset-0 pointer-events-none"
              style={{ overflow: "visible" }}
              width={svgSize.w}
              height={svgSize.h}
            >
              {lines}
            </svg>

            {/*
            Grid layout (8 cols); col4 is the narrow gutter the spine runs down:
              col1      col2      col3      col4     col5      col6      col7      col8
            Row1:  _         _         _       主任       _         _         _         _
            Row2:  _         _       博雅    (gutter)   北部      南部        _         _
            Row3: 法人清單   法人       _         _         _         _       夥伴     夥伴清單
            Row4:  _         _       應用    (gutter)   培訓       _         _         _
          */}
            <div
              className="grid gap-x-4 gap-y-6"
              style={{
                gridTemplateColumns:
                  "0.85fr 0.75fr 1.3fr 0.12fr 1.3fr 1.3fr 0.75fr 0.85fr",
                gridTemplateRows: "auto auto auto auto",
              }}
            >
              {/* Row 1: 主任 — centered on the gutter column, overflowing both sides */}
              <div /><div /><div />
              <div className="justify-self-center w-max">
                <OrgNode nodeRef={directorRef} title={t.introduction.orgChart.director} person={t.introduction.orgChart.directorName} sub={t.introduction.orgChart.collegeCS} className="min-w-[150px]" highlighted={activeTab === "core"} />
              </div>
              <div /><div /><div /><div />

              {/* Row 2: 博雅(col3) · gutter(col4) · 北部(col5) · 南部(col6) */}
              <div /><div />
              <div className="flex justify-center">
                <OrgNode nodeRef={boyaRef} title={t.introduction.orgChart.deputyBoya} person={t.introduction.orgChart.deputyBoyaName} sub={t.introduction.orgChart.collegeBoya} className="w-full" highlighted={activeTab === "core"} />
              </div>
              <div />
              <div className="flex justify-center">
                <OrgNode nodeRef={northRef} title={t.introduction.orgChart.deputyNorth} person={t.introduction.orgChart.deputyNorthName} sub={t.introduction.orgChart.collegeCS} className="w-full" highlighted={activeTab === "core"} />
              </div>
              <div className="flex justify-center">
                <OrgNode nodeRef={southRef} title={t.introduction.orgChart.deputySouth} person={t.introduction.orgChart.deputySouthName} sub={t.introduction.orgChart.collegeGreenEnergy} className="w-full" highlighted={activeTab === "core"} />
              </div>
              <div /><div />

              {/* Row 3: 法人清單(col1) 法人(col2) … 夥伴(col7) 夥伴清單(col8) */}
              <div id={LEGAL_PANEL_ID} className="flex flex-col justify-center gap-2">
                {legalOpen &&
                  legalEntityNames.map((label, i) => (
                    <BranchNode
                      key={`${label}-${i}`}
                      label={label}
                      nodeRef={(el) => {
                        legalItemRefs.current[i] = el;
                      }}
                      highlighted={activeTab === "legal_entity"}
                    />
                  ))}
              </div>
              <div className="flex justify-center items-center">
                <WingNode
                  nodeRef={legalRef}
                  title={t.introduction.category.legalEntity}
                  count={legalEntityNames.length}
                  expanded={legalOpen}
                  onToggle={toggleLegal}
                  controls={LEGAL_PANEL_ID}
                  className="w-full"
                  highlighted={activeTab === "legal_entity"}
                />
              </div>
              <div /><div /><div /><div />
              <div className="flex justify-center items-center">
                <WingNode
                  nodeRef={industryRef}
                  title={t.introduction.category.industry}
                  count={industryNames.length}
                  expanded={industryOpen}
                  onToggle={toggleIndustry}
                  controls={INDUSTRY_PANEL_ID}
                  className="w-full"
                  highlighted={activeTab === "industry"}
                />
              </div>
              <div id={INDUSTRY_PANEL_ID} className="flex flex-col justify-center gap-2">
                {industryOpen &&
                  industryNames.map((label, i) => (
                    <BranchNode
                      key={`${label}-${i}`}
                      label={label}
                      nodeRef={(el) => {
                        industryItemRefs.current[i] = el;
                      }}
                      highlighted={activeTab === "industry"}
                    />
                  ))}
              </div>

              {/* Row 4: 應用(col3) · gutter(col4) · 培訓(col5) — symmetric about the spine */}
              <div /><div />
              <div className="flex justify-center">
                <OrgNode nodeRef={applyRef} title={t.introduction.orgChart.applicationTeam} sub={t.introduction.orgChart.applicationSub} className="w-full" highlighted={activeTab === "core"} />
              </div>
              <div />
              <div className="flex justify-center">
                <OrgNode nodeRef={trainingRef} title={t.introduction.orgChart.trainingTeam} sub={t.introduction.orgChart.trainingSub} className="w-full" highlighted={activeTab === "core"} />
              </div>
              <div /><div /><div />
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile (<md): simple stacked layout, no SVG ── */}
      <div className="md:hidden px-4 pb-6 flex flex-col gap-3 min-h-[420px]">
        {/* Row 1: 主任 */}
        <div className="flex justify-center">
          <OrgNode title={t.introduction.orgChart.director} person={t.introduction.orgChart.directorName} sub={t.introduction.orgChart.collegeCS} className="w-52" highlighted={activeTab === "core"} />
        </div>
        {/* Row 2: 副主任×3 */}
        <div className="flex gap-2">
          <OrgNode title={t.introduction.orgChart.deputyBoya} person={t.introduction.orgChart.deputyBoyaName} sub={t.introduction.orgChart.collegeBoya} className="flex-1 !min-w-0 !px-2" highlighted={activeTab === "core"} />
          <OrgNode title={t.introduction.orgChart.deputyNorth} person={t.introduction.orgChart.deputyNorthName} sub={t.introduction.orgChart.collegeCS} className="flex-1 !min-w-0 !px-2" highlighted={activeTab === "core"} />
          <OrgNode title={t.introduction.orgChart.deputySouth} person={t.introduction.orgChart.deputySouthName} sub={t.introduction.orgChart.collegeGreenEnergy} className="flex-1 !min-w-0 !px-2" highlighted={activeTab === "core"} />
        </div>
        {/* Row 3: 法人 & 合作夥伴 (dashed alliance), each expandable */}
        <div className="flex items-start gap-2">
          <div className="flex-1 flex flex-col gap-1.5">
            <WingNode
              title={t.introduction.category.legalEntity}
              count={legalEntityNames.length}
              expanded={legalOpen}
              onToggle={toggleLegal}
              controls={`${LEGAL_PANEL_ID}-mobile`}
              className="border-dashed !min-w-0"
              highlighted={activeTab === "legal_entity"}
            />
            <div id={`${LEGAL_PANEL_ID}-mobile`} className="flex flex-col gap-1.5">
              {legalOpen &&
                legalEntityNames.map((label, i) => (
                  <BranchNode key={`${label}-${i}`} label={label} highlighted={activeTab === "legal_entity"} />
                ))}
            </div>
          </div>
          <span className="text-xs text-muted-foreground shrink-0 self-start pt-4">⋯ {t.introduction.orgChart.alliance} ⋯</span>
          <div className="flex-1 flex flex-col gap-1.5">
            <WingNode
              title={t.introduction.category.industry}
              count={industryNames.length}
              expanded={industryOpen}
              onToggle={toggleIndustry}
              controls={`${INDUSTRY_PANEL_ID}-mobile`}
              className="border-dashed !min-w-0"
              highlighted={activeTab === "industry"}
            />
            <div id={`${INDUSTRY_PANEL_ID}-mobile`} className="flex flex-col gap-1.5">
              {industryOpen &&
                industryNames.map((label, i) => (
                  <BranchNode key={`${label}-${i}`} label={label} highlighted={activeTab === "industry"} />
                ))}
            </div>
          </div>
        </div>
        {/* Row 4: 應用/培訓 */}
        <div className="flex gap-3">
          <OrgNode title={t.introduction.orgChart.applicationTeam} sub={t.introduction.orgChart.applicationSub} className="flex-1 !min-w-0" highlighted={activeTab === "core"} />
          <OrgNode title={t.introduction.orgChart.trainingTeam} sub={t.introduction.orgChart.trainingSub} className="flex-1 !min-w-0" highlighted={activeTab === "core"} />
        </div>
      </div>
    </div>
  );
}
