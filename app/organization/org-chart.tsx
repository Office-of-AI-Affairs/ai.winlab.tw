"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { RefObject, ReactNode } from "react";

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
}: {
  title: string;
  person?: string;
  sub?: string;
  nodeRef: RefObject<HTMLDivElement>;
  className?: string;
}) {
  return (
    <div
      ref={nodeRef}
      className={`flex flex-col items-center justify-center text-center px-3 py-2 rounded border-2 min-w-[110px] ${className}`}
    >
      <div className="text-xs font-semibold text-yellow-300">{title}</div>
      {person && (
        <div className="text-xs font-bold text-yellow-300 mt-0.5">{person}</div>
      )}
      {sub && (
        <div className="text-[10px] text-yellow-200 mt-0.5">{sub}</div>
      )}
    </div>
  );
}

export function OrgChart() {
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
    const stroke = "rgba(255,255,255,0.7)";
    const sw = 1.5;

    // 主任 → 副主任(左) and 副主任(右) via shared midpoint
    const dirBot = bottomCenter(dir);
    const vlTop = topCenter(vl);
    const vrTop = topCenter(vr);
    const midY = dirBot.y + (vlTop.y - dirBot.y) / 2;

    elements.push(
      <polyline
        key="dir-vl"
        points={`${dirBot.x},${dirBot.y} ${dirBot.x},${midY} ${vlTop.x},${midY} ${vlTop.x},${vlTop.y}`}
        fill="none"
        stroke={stroke}
        strokeWidth={sw}
      />,
      <polyline
        key="dir-vr"
        points={`${dirBot.x},${dirBot.y} ${dirBot.x},${midY} ${vrTop.x},${midY} ${vrTop.x},${vrTop.y}`}
        fill="none"
        stroke={stroke}
        strokeWidth={sw}
      />
    );

    // 副主任(左/右) → horizontal bar → 合聘/培訓/應用
    const vlBot = bottomCenter(vl);
    const vrBot = bottomCenter(vr);
    const jtTop = topCenter(jt);
    const trTop = topCenter(tr);
    const apTop = topCenter(ap);
    const barY = vlBot.y + (jtTop.y - vlBot.y) / 2;

    elements.push(
      <line key="vl-bar" x1={vlBot.x} y1={vlBot.y} x2={vlBot.x} y2={barY} stroke={stroke} strokeWidth={sw} />,
      <line key="vr-bar" x1={vrBot.x} y1={vrBot.y} x2={vrBot.x} y2={barY} stroke={stroke} strokeWidth={sw} />,
      <line key="bar-h" x1={jtTop.x} y1={barY} x2={apTop.x} y2={barY} stroke={stroke} strokeWidth={sw} />,
      <line key="bar-jt" x1={jtTop.x} y1={barY} x2={jtTop.x} y2={jtTop.y} stroke={stroke} strokeWidth={sw} />,
      <line key="bar-tr" x1={trTop.x} y1={barY} x2={trTop.x} y2={trTop.y} stroke={stroke} strokeWidth={sw} />,
      <line key="bar-ap" x1={apTop.x} y1={barY} x2={apTop.x} y2={apTop.y} stroke={stroke} strokeWidth={sw} />
    );

    // 虛線聯盟: 法人 → 產業
    const leR = rightCenter(le);
    const indL = leftCenter(ind);
    elements.push(
      <line
        key="alliance"
        x1={leR.x}
        y1={leR.y}
        x2={indL.x}
        y2={indL.y}
        stroke={stroke}
        strokeWidth={sw}
        strokeDasharray="6 4"
      />,
      <text key="lbl-left" x={leR.x + 28} y={leR.y - 10} textAnchor="middle" fontSize="11" fill={stroke} fontWeight="bold">
        聯盟
      </text>,
      <text key="lbl-right" x={indL.x - 28} y={indL.y - 10} textAnchor="middle" fontSize="11" fill={stroke} fontWeight="bold">
        聯盟
      </text>
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
    <div className="w-full rounded-xl bg-[#1a3a8f] p-6 select-none">
      <h2 className="text-center text-xl font-bold text-white mb-6">
        AI專責辦公室組織架構
      </h2>
      <div ref={containerRef} className="relative" style={{ minHeight: 260 }}>
        <svg
          className="absolute inset-0 pointer-events-none overflow-visible"
          width={svgSize.w}
          height={svgSize.h}
        >
          {lines}
        </svg>

        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: "1fr 1.5fr 1.5fr 1.5fr 1fr",
            gridTemplateRows: "auto auto auto",
          }}
        >
          {/* Row 1: 主任 at col 3 */}
          <div />
          <div />
          <div className="flex justify-center">
            <OrgNode
              nodeRef={directorRef}
              title="主任"
              person="曾建超教授"
              sub="資訊學院"
              className="bg-[#2a4fa8] border-blue-300"
            />
          </div>
          <div />
          <div />

          {/* Row 2: 法人, 副主任×2, 產業 */}
          <div className="flex justify-center items-center">
            <OrgNode
              nodeRef={legalRef}
              title="法人"
              className="bg-[#6b3fa0] border-purple-300 w-full"
            />
          </div>
          <div className="flex justify-center">
            <OrgNode
              nodeRef={viceLeftRef}
              title="副主任"
              person="黃俊龍副院長"
              sub="資訊學院"
              className="bg-[#2a4fa8] border-blue-300"
            />
          </div>
          <div />
          <div className="flex justify-center">
            <OrgNode
              nodeRef={viceRightRef}
              title="副主任"
              person="陳建志所長"
              sub="智慧綠能學院"
              className="bg-[#1a7a4a] border-green-300"
            />
          </div>
          <div className="flex justify-center items-center">
            <OrgNode
              nodeRef={industryRef}
              title="產業"
              className="bg-[#c04a10] border-orange-300 w-full"
            />
          </div>

          {/* Row 3: 合聘, 培訓, 應用 */}
          <div />
          <div className="flex justify-center">
            <OrgNode
              nodeRef={jointRef}
              title="合聘專家"
              person="許懷中教授"
              sub="逢甲AI中心主任"
              className="bg-[#2a4fa8] border-blue-300"
            />
          </div>
          <div className="flex justify-center">
            <OrgNode
              nodeRef={trainingRef}
              title="培訓團隊"
              sub="（資訊技術中心）"
              className="bg-[#3a5fc0] border-blue-200"
            />
          </div>
          <div className="flex justify-center">
            <OrgNode
              nodeRef={applyRef}
              title="應用團隊"
              sub="（教授與實驗室）"
              className="bg-[#3a5fc0] border-blue-200"
            />
          </div>
          <div />
        </div>
      </div>
    </div>
  );
}
