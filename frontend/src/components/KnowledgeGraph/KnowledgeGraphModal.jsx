import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import * as d3 from "d3";
import {
  Network,
  GitFork,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  X,
  Sparkles,
  BookOpen,
  ArrowRight,
  ExternalLink,
  Layers,
  CheckCircle2,
  HelpCircle,
  Cpu,
  Boxes,
  Zap,
  Tag,
  ChevronRight,
  ChevronDown,
  Quote,
  FileText,
  ShieldCheck,
  Compass
} from "lucide-react";
import { getKnowledgeGraph, generateKnowledgeGraph } from "../../services/api";

const TYPE_CONFIG = {
  root: { label: "Root Document", color: "#a855f7", border: "#9333ea", bg: "#150a26", radius: 32 },
  topic: { label: "Major Topic", color: "#818cf8", border: "#6366f1", bg: "#0d132c", radius: 24 },
  subtopic: { label: "Subtopic", color: "#38bdf8", border: "#0284c7", bg: "#081a2e", radius: 19 },
  concept: { label: "Concept", color: "#34d399", border: "#059669", bg: "#062018", radius: 16 },
  entity: { label: "Entity", color: "#fbbf24", border: "#d97706", bg: "#241505", radius: 16 },
  technology: { label: "Technology", color: "#60a5fa", border: "#2563eb", bg: "#091b38", radius: 16 },
  method: { label: "Method / Algo", color: "#f472b6", border: "#db2777", bg: "#260b19", radius: 16 },
  process: { label: "Process", color: "#fb7185", border: "#e11d48", bg: "#260812", radius: 16 },
  definition: { label: "Definition", color: "#94a3b8", border: "#64748b", bg: "#101726", radius: 15 },
  metric: { label: "Metric", color: "#c084fc", border: "#7e22ce", bg: "#1f0b2e", radius: 15 },
};

export default function KnowledgeGraphModal({ documentId, documentTitle, isOpen, onClose, onAskAi, userId }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const zoomBehaviorRef = useRef(null);
  const gRef = useRef(null);

  // Data states
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  // View & Filter states
  const [viewMode, setViewMode] = useState("graph"); // "graph" | "tree"
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [highImportanceOnly, setHighImportanceOnly] = useState(false);
  const [maxDepth, setMaxDepth] = useState(3); // 1 = Topics, 2 = Subtopics, 3 = All Concepts

  // Selected node for Inspector
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);

  // Tree collapsed nodes set
  const [collapsedNodeIds, setCollapsedNodeIds] = useState(new Set());

  // Load Graph Data
  const loadGraph = useCallback(async (force = false) => {
    if (!documentId) return;
    try {
      if (force) setGenerating(true);
      else setLoading(true);
      setError(null);
      const data = force ? await generateKnowledgeGraph(documentId) : await getKnowledgeGraph(documentId, false, userId);
      setGraphData(data);
      if (data?.nodes?.length) {
        const root = data.nodes.find((n) => n.type === "root") || data.nodes[0];
        setSelectedNode(root);
      }
    } catch (err) {
      console.error("Failed to load Knowledge Graph:", err);
      setError(err?.response?.data?.detail || "Failed to load knowledge graph from document.");
    } finally {
      setLoading(false);
      setGenerating(false);
    }
  }, [documentId]);

  useEffect(() => {
    if (isOpen && documentId) {
      loadGraph(false);
    }
  }, [isOpen, documentId, loadGraph]);

  // Compute active filtered nodes & edges (STRICTLY HIERARCHICAL - NO CONGESTING CROSS-LINKS)
  const { filteredNodes, filteredEdges, nodeById } = useMemo(() => {
    if (!graphData || !graphData.nodes) {
      return { filteredNodes: [], filteredEdges: [], nodeById: new Map() };
    }

    const map = new Map(graphData.nodes.map((n) => [n.id, n]));

    let visibleNodes = graphData.nodes.filter((n) => {
      // Level depth filter
      if (n.level > maxDepth) return false;

      // Type filter (always keep root so graph is anchored)
      if (selectedType !== "all" && n.type !== selectedType && n.type !== "root") {
        return false;
      }

      // High importance filter
      if (highImportanceOnly && (n.importance || 0.7) < 0.8 && n.type !== "root") {
        return false;
      }

      // Tree View collapsed parent pruning
      if (viewMode === "tree") {
        let curr = n;
        while (curr.parent_id) {
          if (collapsedNodeIds.has(curr.parent_id)) {
            return false;
          }
          curr = map.get(curr.parent_id) || {};
        }
      }

      return true;
    });

    const visibleNodeIds = new Set(visibleNodes.map((n) => n.id));

    // STRICTLY HIERARCHICAL EDGES ONLY - No cross-links to ensure clean, readable structure
    let visibleEdges = (graphData.edges || []).filter((e) => {
      const src = typeof e.source === "object" ? e.source.id : e.source;
      const tgt = typeof e.target === "object" ? e.target.id : e.target;

      if (!visibleNodeIds.has(src) || !visibleNodeIds.has(tgt)) {
        return false;
      }

      return Boolean(e.is_hierarchical);
    });

    return { filteredNodes: visibleNodes, filteredEdges: visibleEdges, nodeById: map };
  }, [graphData, maxDepth, selectedType, highImportanceOnly, viewMode, collapsedNodeIds]);

  // Compute Inspector details for selected node (Declared unconditionally before any return)
  const nodeOutgoing = useMemo(() => {
    if (!selectedNode || !graphData?.edges) return [];
    return graphData.edges
      .filter((e) => (typeof e.source === "object" ? e.source.id : e.source) === selectedNode.id && e.is_hierarchical)
      .map((e) => ({
        ...e,
        targetNode: nodeById.get(typeof e.target === "object" ? e.target.id : e.target),
      }));
  }, [selectedNode, graphData, nodeById]);

  const nodeIncoming = useMemo(() => {
    if (!selectedNode || !graphData?.edges) return [];
    return graphData.edges
      .filter((e) => (typeof e.target === "object" ? e.target.id : e.target) === selectedNode.id && e.is_hierarchical)
      .map((e) => ({
        ...e,
        sourceNode: nodeById.get(typeof e.source === "object" ? e.source.id : e.source),
      }));
  }, [selectedNode, graphData, nodeById]);

  const parentTopic = selectedNode?.parent_id ? nodeById.get(selectedNode.parent_id) : null;

  // Handle Search jump & zoom
  const handleSearchSelect = (node) => {
    setSelectedNode(node);
    setSearchQuery("");

    if (svgRef.current && zoomBehaviorRef.current && gRef.current) {
      const svg = d3.select(svgRef.current);
      const width = svgRef.current.clientWidth;
      const height = svgRef.current.clientHeight;

      const scale = 1.3;
      const x = -(node.x || width / 2) * scale + width / 2;
      const y = -(node.y || height / 2) * scale + height / 2;

      svg.transition()
        .duration(750)
        .call(
          zoomBehaviorRef.current.transform,
          d3.zoomIdentity.translate(x, y).scale(scale)
        );
    }
  };

  // Zoom controls
  const handleZoomIn = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(zoomBehaviorRef.current.scaleBy, 1.3);
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(zoomBehaviorRef.current.scaleBy, 0.7);
    }
  };

  const handleZoomReset = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(500).call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
    }
  };

  // Toggle node collapse in Tree View
  const toggleNodeCollapse = (nodeId) => {
    setCollapsedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  // Trigger AI inquiry grounded on this node
  const handleAskAiAboutNode = () => {
    if (!selectedNode) return;
    const prompt = `Can you provide an in-depth explanation of "${selectedNode.label}" (${selectedNode.type}) based on the document "${documentTitle || "this document"}", including its source grounding and key takeaways?`;
    if (onAskAi) {
      onAskAi(prompt, documentId);
    }
  };

  // ─── D3 RENDERING EFFECT ───
  useEffect(() => {
    if (!svgRef.current || !filteredNodes.length) return;

    const width = svgRef.current.clientWidth || 900;
    const height = svgRef.current.clientHeight || 650;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // 1. Defs: Gradients and Markers (NO GRID PATTERN)
    const defs = svg.append("defs");

    // Sleek Dark Canvas Radial Vignette
    const bgGradient = defs.append("radialGradient")
      .attr("id", "kg-canvas-bg")
      .attr("cx", "50%")
      .attr("cy", "50%")
      .attr("r", "75%");
    bgGradient.append("stop").attr("offset", "0%").attr("stop-color", "#0b101d");
    bgGradient.append("stop").attr("offset", "100%").attr("stop-color", "#05070d");

    // Clean, refined Arrowhead for edges
    defs.append("marker")
      .attr("id", "arrow-hierarchical")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 26)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-3.5L7,0L0,3.5")
      .attr("fill", "#475569");

    // Subtle Halo Filter
    const filter = defs.append("filter").attr("id", "node-glow").attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
    filter.append("feGaussianBlur").attr("stdDeviation", "3").attr("result", "coloredBlur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Clean background without any dots or grid lines
    svg.append("rect")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("fill", "url(#kg-canvas-bg)");

    // Main Zoom Container
    const g = svg.append("g");
    gRef.current = g.node();

    const zoom = d3.zoom()
      .scaleExtent([0.15, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    zoomBehaviorRef.current = zoom;
    svg.call(zoom);

    // ─────────────────────────────────────────────
    // A) GRAPH VIEW (SPACIOUS FORCE-DIRECTED LAYOUT)
    // ─────────────────────────────────────────────
    if (viewMode === "graph") {
      const nodes = filteredNodes.map((d) => ({ ...d }));
      const edges = filteredEdges.map((d) => ({ ...d }));

      // High distance, strong repulsion, and large collision buffer to eliminate congestion
      const simulation = d3.forceSimulation(nodes)
        .force(
          "link",
          d3.forceLink(edges)
            .id((d) => d.id)
            .distance((d) => {
              if (d.source.type === "root" || d.target.type === "root") return 290;
              if (d.source.type === "topic" || d.target.type === "topic") return 220;
              return 170;
            })
            .strength(0.85)
        )
        .force(
          "charge",
          d3.forceManyBody().strength((d) => {
            if (d.type === "root") return -3600;
            if (d.type === "topic") return -1900;
            return -900;
          })
        )
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force(
          "collision",
          d3.forceCollide().radius((d) => (TYPE_CONFIG[d.type]?.radius || 18) + 75).iterations(3)
        );

      // Edges Layer: Clean subtle links
      const linkGroup = g.append("g").attr("class", "links");
      const link = linkGroup.selectAll("g")
        .data(edges)
        .enter()
        .append("g")
        .attr("class", "link");

      const linkPath = link.append("line")
        .attr("stroke", "#334155")
        .attr("stroke-opacity", 0.6)
        .attr("stroke-width", 1.5)
        .attr("marker-end", "url(#arrow-hierarchical)");

      // Relationship label placed along edge
      const linkText = link.append("text")
        .attr("fill", "#64748b")
        .attr("font-size", "10px")
        .attr("font-weight", "500")
        .attr("text-anchor", "middle")
        .attr("dy", -5)
        .text((d) => (d.relationship ? d.relationship.replace(/_/g, " ") : ""));

      // Nodes Layer
      const nodeGroup = g.append("g").attr("class", "nodes");
      const node = nodeGroup.selectAll("g")
        .data(nodes)
        .enter()
        .append("g")
        .attr("class", "node")
        .attr("cursor", "pointer")
        .call(
          d3.drag()
            .on("start", (event, d) => {
              if (!event.active) simulation.alphaTarget(0.3).restart();
              d.fx = d.x;
              d.fy = d.y;
            })
            .on("drag", (event, d) => {
              d.fx = event.x;
              d.fy = event.y;
            })
            .on("end", (event, d) => {
              if (!event.active) simulation.alphaTarget(0);
              d.fx = null;
              d.fy = null;
            })
        );

      // Node Halo
      node.append("circle")
        .attr("r", (d) => (TYPE_CONFIG[d.type]?.radius || 18) + (d.importance ? d.importance * 6 : 4))
        .attr("fill", (d) => TYPE_CONFIG[d.type]?.color || "#a855f7")
        .attr("opacity", 0.12)
        .attr("filter", "url(#node-glow)");

      // Main Node Orb
      node.append("circle")
        .attr("r", (d) => TYPE_CONFIG[d.type]?.radius || 18)
        .attr("fill", (d) => TYPE_CONFIG[d.type]?.bg || "#0d132c")
        .attr("stroke", (d) => TYPE_CONFIG[d.type]?.border || "#6366f1")
        .attr("stroke-width", (d) => (d.type === "root" ? 3 : 2));

      // Type initial inside node
      node.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", 4)
        .attr("fill", (d) => TYPE_CONFIG[d.type]?.color || "#818cf8")
        .attr("font-size", (d) => (d.type === "root" ? "14px" : "10px"))
        .attr("font-weight", "bold")
        .text((d) => (d.type === "root" ? "🧠" : d.type.charAt(0).toUpperCase()));

      // Label with clean dark pill backdrop to guarantee crisp legibility and zero overlap
      const labelGroup = node.append("g")
        .attr("class", "node-label")
        .attr("transform", (d) => `translate(0, ${(TYPE_CONFIG[d.type]?.radius || 18) + 16})`);

      const labelRect = labelGroup.append("rect")
        .attr("class", "label-pill")
        .attr("rx", 6)
        .attr("ry", 6)
        .attr("fill", "#070b14ea")
        .attr("stroke", (d) => (d.type === "root" ? "#9333ea66" : d.type === "topic" ? "#6366f144" : "#1e293b"))
        .attr("stroke-width", 1);

      const labelText = labelGroup.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", 3)
        .attr("fill", (d) => (d.type === "root" ? "#ffffff" : d.type === "topic" ? "#f8fafc" : "#cbd5e1"))
        .attr("font-size", (d) => (d.type === "root" ? "12px" : d.type === "topic" ? "11px" : "10.5px"))
        .attr("font-weight", (d) => (d.type === "root" || d.type === "topic" ? "600" : "500"))
        .text((d) => {
          const lbl = d.label || d.id;
          return lbl.length > 26 ? lbl.slice(0, 24) + "…" : lbl;
        });

      // Size pill background precisely to text bounding box
      labelText.each(function () {
        const bbox = this.getBBox();
        const parent = d3.select(this.parentNode);
        parent.select("rect.label-pill")
          .attr("x", bbox.x - 7)
          .attr("y", bbox.y - 3)
          .attr("width", bbox.width + 14)
          .attr("height", bbox.height + 6);
      });

      // Node Hover & Click Interactions
      node.on("click", (event, d) => {
        event.stopPropagation();
        setSelectedNode(d);
      });

      node.on("mouseenter", (event, d) => {
        setHoveredNode(d);
        const connectedIds = new Set([d.id]);
        edges.forEach((e) => {
          const srcId = typeof e.source === "object" ? e.source.id : e.source;
          const tgtId = typeof e.target === "object" ? e.target.id : e.target;
          if (srcId === d.id) connectedIds.add(tgtId);
          if (tgtId === d.id) connectedIds.add(srcId);
        });

        node.transition().duration(200).attr("opacity", (n) => (connectedIds.has(n.id) ? 1 : 0.25));
        link.transition().duration(200).attr("opacity", (e) => {
          const srcId = typeof e.source === "object" ? e.source.id : e.source;
          const tgtId = typeof e.target === "object" ? e.target.id : e.target;
          return srcId === d.id || tgtId === d.id ? 1 : 0.15;
        });
      });

      node.on("mouseleave", () => {
        setHoveredNode(null);
        node.transition().duration(200).attr("opacity", 1);
        link.transition().duration(200).attr("opacity", 1);
      });

      // Simulation Ticks
      simulation.on("tick", () => {
        linkPath
          .attr("x1", (d) => d.source.x)
          .attr("y1", (d) => d.source.y)
          .attr("x2", (d) => d.target.x)
          .attr("y2", (d) => d.target.y);

        linkText
          .attr("x", (d) => (d.source.x + d.target.x) / 2)
          .attr("y", (d) => (d.source.y + d.target.y) / 2);

        node.attr("transform", (d) => `translate(${d.x},${d.y})`);
      });

      return () => simulation.stop();
    }

    // ─────────────────────────────────────────────
    // B) TREE VIEW (SPACIOUS HIERARCHICAL LAYOUT)
    // ─────────────────────────────────────────────
    if (viewMode === "tree") {
      const rootNodeData = filteredNodes.find((n) => n.type === "root") || filteredNodes[0];
      if (!rootNodeData) return;

      const childrenMap = new Map();
      filteredNodes.forEach((n) => {
        if (n.parent_id) {
          if (!childrenMap.has(n.parent_id)) childrenMap.set(n.parent_id, []);
          childrenMap.get(n.parent_id).push(n);
        }
      });

      const buildHierarchy = (node) => {
        const isCollapsed = collapsedNodeIds.has(node.id);
        const childList = isCollapsed ? [] : (childrenMap.get(node.id) || []);
        return {
          ...node,
          children: childList.map(buildHierarchy),
          hasChildren: (childrenMap.get(node.id) || []).length > 0,
        };
      };

      const treeData = d3.hierarchy(buildHierarchy(rootNodeData));
      // Generous tree spacing: 55px vertical distance, 260px horizontal level gap
      const treeLayout = d3.tree().nodeSize([55, 260]);
      treeLayout(treeData);

      const treeG = g.append("g").attr("transform", `translate(${140}, ${height / 2})`);

      // Tree Links
      treeG.append("g")
        .selectAll("path")
        .data(treeData.links())
        .enter()
        .append("path")
        .attr("fill", "none")
        .attr("stroke", "#334155")
        .attr("stroke-width", 1.5)
        .attr("d", d3.linkHorizontal().x((d) => d.y).y((d) => d.x));

      // Tree Nodes
      const treeNode = treeG.append("g")
        .selectAll("g")
        .data(treeData.descendants())
        .enter()
        .append("g")
        .attr("transform", (d) => `translate(${d.y},${d.x})`)
        .attr("cursor", "pointer");

      treeNode.append("circle")
        .attr("r", (d) => (d.data.type === "root" ? 16 : d.data.type === "topic" ? 12 : 8))
        .attr("fill", (d) => TYPE_CONFIG[d.data.type]?.bg || "#0d132c")
        .attr("stroke", (d) => TYPE_CONFIG[d.data.type]?.border || "#6366f1")
        .attr("stroke-width", 2);

      // Expand/Collapse Badge
      treeNode.filter((d) => d.data.hasChildren)
        .append("circle")
        .attr("r", 6)
        .attr("cx", 14)
        .attr("cy", 0)
        .attr("fill", (d) => (collapsedNodeIds.has(d.data.id) ? "#a855f7" : "#475569"));

      treeNode.filter((d) => d.data.hasChildren)
        .append("text")
        .attr("x", 14)
        .attr("y", 3.5)
        .attr("text-anchor", "middle")
        .attr("fill", "#ffffff")
        .attr("font-size", "9px")
        .attr("font-weight", "bold")
        .text((d) => (collapsedNodeIds.has(d.data.id) ? "+" : "-"));

      // Tree Node Label with readable styling
      treeNode.append("text")
        .attr("dy", 4)
        .attr("x", (d) => (d.data.hasChildren ? 26 : 16))
        .attr("text-anchor", "start")
        .attr("fill", "#f8fafc")
        .attr("font-size", (d) => (d.data.type === "root" ? "13px" : d.data.type === "topic" ? "12px" : "11px"))
        .attr("font-weight", (d) => (d.data.type === "root" || d.data.type === "topic" ? "600" : "400"))
        .text((d) => d.data.label);

      treeNode.on("click", (event, d) => {
        event.stopPropagation();
        if (d.data.hasChildren && event.target.tagName === "circle" && event.target.getAttribute("cx") === "14") {
          toggleNodeCollapse(d.data.id);
        } else {
          setSelectedNode(d.data);
        }
      });
    }
  }, [filteredNodes, filteredEdges, viewMode, collapsedNodeIds]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md animate-fade-in p-2 md:p-5 select-none">
      <div 
        ref={containerRef}
        className="w-full h-full max-w-[1780px] bg-[#07090e] border border-slate-800/90 rounded-2xl shadow-2xl flex flex-col overflow-hidden relative"
      >
        
        {/* ─── TOP TOOLBAR ─── */}
        <header className="h-16 border-b border-slate-800/80 bg-[#0a0f1d] px-6 flex items-center justify-between gap-4 shrink-0">
          
          {/* Left: Title & Identity */}
          <div className="flex items-center gap-3.5 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-purple-950/70 border border-purple-500/50 flex items-center justify-center text-purple-400 shadow-md shadow-purple-900/30 shrink-0">
              <Network className="w-5 h-5" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2.5">
                <h2 className="text-sm md:text-base font-bold text-white tracking-tight truncate">
                  {graphData?.document?.title || documentTitle || "Document Knowledge Graph"}
                </h2>
                {graphData?.document?.domain && (
                  <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-950/60 text-purple-300 border border-purple-700/60">
                    {graphData.document.domain}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-2">
                <span className="text-slate-300 font-medium">{filteredNodes.length} Concepts</span>
                <span>•</span>
                <span>{filteredEdges.length} Hierarchical Relations</span>
                <span>•</span>
                <span className="text-emerald-400 flex items-center gap-1 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" /> Source Grounded
                </span>
              </div>
            </div>
          </div>

          {/* Center: Search Box */}
          <div className="flex-1 max-w-md hidden lg:block relative">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search concepts, topics, methods..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#10172a] border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 transition shadow-inner"
              />
            </div>

            {searchQuery.trim().length > 1 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#0e1424] border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 max-h-60 overflow-y-auto">
                {graphData?.nodes
                  ?.filter((n) => n.label.toLowerCase().includes(searchQuery.toLowerCase()))
                  .slice(0, 8)
                  .map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleSearchSelect(n)}
                      className="px-4 py-2.5 hover:bg-purple-950/40 cursor-pointer flex items-center justify-between border-b border-slate-800/50 last:border-0 transition"
                    >
                      <div>
                        <div className="text-xs font-semibold text-white">{n.label}</div>
                        <div className="text-[10px] text-slate-400 capitalize">{n.type}</div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-purple-300 font-mono">
                        {Math.round((n.importance || 0.7) * 100)}%
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Right: View Toggle, Actions & Close */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* View Mode Toggle: Graph vs Tree */}
            <div className="flex bg-[#10172a] border border-slate-700/80 rounded-xl p-1 shrink-0 shadow-inner">
              <button
                onClick={() => setViewMode("graph")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  viewMode === "graph"
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Network className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Graph</span>
              </button>
              <button
                onClick={() => setViewMode("tree")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  viewMode === "tree"
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <GitFork className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tree</span>
              </button>
            </div>

            {/* Re-generate Graph with LLM */}
            <button
              onClick={() => loadGraph(true)}
              disabled={generating}
              title="Force re-analyze document with Gemini AI"
              className="p-2 rounded-xl bg-[#10172a] hover:bg-[#1a233a] border border-slate-700/80 text-slate-300 hover:text-purple-300 transition cursor-pointer flex items-center gap-1.5 text-xs font-medium"
            >
              <RefreshCw className={`w-4 h-4 ${generating ? "animate-spin text-purple-400" : ""}`} />
              <span className="hidden xl:inline">{generating ? "Analyzing..." : "Re-extract"}</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-[#10172a] hover:bg-rose-950/40 hover:border-rose-500/50 border border-slate-700/80 text-slate-400 hover:text-rose-400 transition cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* ─── SECONDARY FILTER BAR ─── */}
        <div className="h-12 border-b border-slate-800/80 bg-[#080d19] px-6 flex items-center justify-between gap-4 overflow-x-auto shrink-0 text-xs">
          
          {/* Type Filter Chips */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-slate-500 text-[11px] font-semibold mr-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" /> Filter:
            </span>
            {["all", "topic", "concept", "technology", "method", "entity"].map((t) => (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`px-3 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer capitalize ${
                  selectedType === t
                    ? "bg-purple-950/70 border border-purple-500/70 text-purple-200 shadow-sm"
                    : "bg-[#10172a]/90 text-slate-400 border border-slate-800 hover:text-slate-200"
                }`}
              >
                {t === "all" ? "All Concepts" : t}
              </button>
            ))}
          </div>

          {/* Depth / Progressive Exploration & Toggles */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1 bg-[#10172a] px-2.5 py-1 rounded-lg border border-slate-800">
              <span className="text-[11px] text-slate-400 mr-1">Hierarchy Depth:</span>
              {[1, 2, 3].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setMaxDepth(lvl)}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ${
                    maxDepth === lvl ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  L{lvl}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white transition">
              <input
                type="checkbox"
                checked={highImportanceOnly}
                onChange={(e) => setHighImportanceOnly(e.target.checked)}
                className="rounded accent-purple-500 cursor-pointer w-3.5 h-3.5"
              />
              <span className="text-[11px]">High Centrality Only (≥80%)</span>
            </label>
          </div>
        </div>

        {/* ─── CANVAS & EXPANSIVE CITATION INSPECTOR BODY ─── */}
        <div className="flex-1 flex overflow-hidden relative">
          
          {/* Main SVG Visualization Canvas (Clean, Spacious, No Grid) */}
          <div className="flex-1 h-full relative overflow-hidden bg-[#05070d]">
            {loading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3.5 text-slate-400">
                <RefreshCw className="w-9 h-9 animate-spin text-purple-500" />
                <div className="text-base font-semibold text-white">Extracting Knowledge Architecture...</div>
                <div className="text-xs text-slate-400 max-w-sm text-center">
                  Structuring document concepts, calculating centrality, and preparing hierarchical views.
                </div>
              </div>
            ) : error ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-red-400 p-6 text-center">
                <HelpCircle className="w-10 h-10 text-red-400" />
                <div className="text-base font-semibold text-white">Failed to load Knowledge Graph</div>
                <div className="text-xs text-red-300 max-w-md">{error}</div>
                <button
                  onClick={() => loadGraph(true)}
                  className="mt-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold cursor-pointer shadow-lg shadow-purple-600/30"
                >
                  Generate Graph with AI
                </button>
              </div>
            ) : (
              <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
            )}

            {/* Floating Zoom & Fit Controls */}
            <div className="absolute bottom-6 left-6 flex items-center gap-1.5 bg-[#0c1220]/90 backdrop-blur-md border border-slate-800 rounded-xl p-1.5 shadow-xl">
              <button
                onClick={handleZoomIn}
                title="Zoom In"
                className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={handleZoomOut}
                title="Zoom Out"
                className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={handleZoomReset}
                title="Fit to Center"
                className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>

            {/* Visual Legend */}
            <div className="absolute top-5 left-6 hidden sm:flex flex-wrap items-center gap-2.5 bg-[#0c1220]/90 backdrop-blur-md border border-slate-800/80 rounded-xl px-3.5 py-2 text-[11px] text-slate-400 pointer-events-none shadow-lg">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block shadow-sm" />
                <span className="font-medium text-slate-300">Topic</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block shadow-sm" />
                <span className="font-medium text-slate-300">Subtopic</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block shadow-sm" />
                <span className="font-medium text-slate-300">Concept</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block shadow-sm" />
                <span className="font-medium text-slate-300">Entity</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-pink-400 inline-block shadow-sm" />
                <span className="font-medium text-slate-300">Method</span>
              </div>
            </div>
          </div>

          {/* ─── EXPANSIVE PROFESSIONAL CITATION & CONCEPT INSPECTOR ─── */}
          {selectedNode && (
            <aside className="w-full sm:w-[480px] lg:w-[540px] xl:w-[580px] border-l border-slate-800/90 bg-[#070b16] flex flex-col h-full overflow-y-auto shrink-0 z-10 animate-fade-in shadow-2xl">
              
              {/* Inspector Header */}
              <div className="p-6 border-b border-slate-800/80 bg-[#0a1020]">
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <span 
                    className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm"
                    style={{
                      backgroundColor: TYPE_CONFIG[selectedNode.type]?.bg || "#0d132c",
                      color: TYPE_CONFIG[selectedNode.type]?.color || "#a855f7",
                      border: `1px solid ${TYPE_CONFIG[selectedNode.type]?.border || "#6366f1"}`,
                    }}
                  >
                    {selectedNode.type}
                  </span>
                  
                  {/* Centrality Score Badge */}
                  <div className="flex items-center gap-2 bg-[#10172a] px-3 py-1 rounded-full border border-slate-800">
                    <span className="text-[11px] text-slate-400">Centrality:</span>
                    <span className="text-xs font-bold text-emerald-400 font-mono">
                      {Math.round((selectedNode.importance || 0.7) * 100)}%
                    </span>
                  </div>
                </div>

                <h3 className="text-lg md:text-xl font-bold text-white tracking-tight leading-snug">
                  {selectedNode.label}
                </h3>

                {/* Parent Topic Hierarchy Breadcrumb */}
                {parentTopic && (
                  <div className="mt-2.5 text-xs text-slate-400 flex items-center gap-2">
                    <span className="text-slate-500 font-medium">Branch under:</span>
                    <button
                      onClick={() => setSelectedNode(parentTopic)}
                      className="text-purple-300 hover:text-purple-200 underline underline-offset-2 transition cursor-pointer truncate font-medium flex items-center gap-1"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>{parentTopic.label}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Inspector Body: Spacious & Luxurious Citation Grounding */}
              <div className="p-6 space-y-6 flex-1">
                
                {/* 1. SOURCE GROUNDING & CITATIONS (EXPANSIVE & PROMINENT) */}
                <div className="bg-[#0b1224] border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Verified Document Grounding</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800/70 text-emerald-300 font-medium">
                      High Confidence
                    </span>
                  </div>

                  {/* Document & Page Citations */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-[#0f172a] p-3 rounded-xl border border-slate-800/80">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                        <FileText className="w-3 h-3 text-purple-400" /> Document Reference
                      </div>
                      <div className="text-xs font-medium text-slate-200 truncate">
                        {graphData?.document?.title || documentTitle || "Active Document"}
                      </div>
                    </div>

                    <div className="bg-[#0f172a] p-3 rounded-xl border border-slate-800/80">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                        <BookOpen className="w-3 h-3 text-sky-400" /> Page Citations
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {selectedNode.source_pages && selectedNode.source_pages.length > 0 ? (
                          selectedNode.source_pages.map((p) => (
                            <span
                              key={p}
                              className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-950/80 border border-emerald-700/60 text-emerald-300"
                            >
                              Page {p}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400">Indexed from document</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Verbatim Excerpt Block (Spacious & Clean) */}
                  {selectedNode.source_excerpt && (
                    <div className="pt-1">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
                        <Quote className="w-3.5 h-3.5 text-purple-400" />
                        <span>Verbatim Document Citation</span>
                      </div>
                      <div className="bg-[#070d1a] border-l-4 border-purple-500 rounded-r-xl p-4 shadow-inner">
                        <blockquote className="text-sm text-slate-100 font-serif italic leading-relaxed">
                          "{selectedNode.source_excerpt}"
                        </blockquote>
                        <div className="mt-2 text-[10px] text-purple-300 font-sans font-medium flex items-center gap-1">
                          <span>•</span>
                          <span>Extracted verbatim from document content during knowledge synthesis</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Conceptual Explanation */}
                <div className="bg-[#0b1224] border border-slate-800 rounded-2xl p-5 shadow-lg space-y-2.5">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span>Conceptual Analysis</span>
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed font-sans">
                    {selectedNode.description || "Core conceptual element extracted from document analysis."}
                  </p>
                </div>

                {/* 3. Hierarchical Child Concepts */}
                {nodeOutgoing.length > 0 && (
                  <div className="bg-[#0b1224] border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Boxes className="w-4 h-4 text-sky-400" />
                        <span>Sub-Concepts & Details ({nodeOutgoing.length})</span>
                      </div>
                      <span className="text-[10px] text-slate-400">Click to explore</span>
                    </div>

                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {nodeOutgoing.map((e, idx) => (
                        <div
                          key={`out-${idx}`}
                          onClick={() => e.targetNode && setSelectedNode(e.targetNode)}
                          className="p-3 rounded-xl bg-[#0f172a] hover:bg-[#16223b] border border-slate-800/90 flex items-center justify-between cursor-pointer transition text-xs group"
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
                            <span className="text-slate-200 font-medium truncate group-hover:text-purple-300 text-sm">
                              {e.targetNode?.label || e.target}
                            </span>
                            {e.targetNode?.type && (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800/80 text-slate-400 capitalize">
                                {e.targetNode.type}
                              </span>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 shrink-0 transition" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>

              {/* Inspector Footer Action: Ask AI About This */}
              <div className="p-6 border-t border-slate-800/80 bg-[#0a1020] shrink-0">
                <button
                  onClick={handleAskAiAboutNode}
                  className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-purple-600/30 transition cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Ask AI About "{selectedNode.label}"</span>
                </button>
              </div>

            </aside>
          )}

        </div>
      </div>
    </div>
  );
}
