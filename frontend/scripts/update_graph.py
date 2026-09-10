import json

target_file = r"c:/Users/Lenovo/Documents/AIML path/AI-learning/Documind/frontend/src/components/GraphExplorer.jsx"

with open(target_file, "r", encoding="utf-8") as f:
    content = f.read()

# Chunk 1
content = content.replace(
    'const [selectedEdge, setSelectedEdge] = useState(null);',
    'const [selectedEdge, setSelectedEdge] = useState(null);\n  const [viewMode, setViewMode] = useState("graph");'
)

# Chunk 2
old_header = '''        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* Build from Document Button */}'''

new_header = '''        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* View Mode Toggle */}
          <div className="flex bg-[#0c1222] border border-slate-800 round ed-xl p-1 shrink-0 shadow-inner mr-2">
            <button
              onClick={() => setViewMode("graph")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${viewMode === "graph" ? "bg-purple-600 text-white shadow-md" : "text-slate-400 hover:text-slate-200"}`}
            >
              <Network className="w-3.5 h-3.5" />
              Graph
            </button>
            <button
              onClick={() => setViewMode("tree")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${viewMode === "tree" ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-slate-200"}`}
            >
              <FileText className="w-3.5 h-3.5" />
              Tree
            </button>
          </div>

          {/* Build from Document Button */}'''

content = content.replace(old_header, new_header)


# Chunk 3: The huge useEffect replace
# First we find the start and end of the D3 render effect

import re
pattern = re.compile(r"  // D3 Render Effect\n  useEffect\(\(\) => \{.*?\}, \[graphData\]\);", re.DOTALL)

match = pattern.search(content)
if not match:
    print("Could not find useEffect!")
else:
    old_effect = match.group(0)
    
    new_effect = """  // D3 Render Effect
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    if (!graphData.nodes || graphData.nodes.length === 0) return;

    const width = svgRef.current.clientWidth || 700;
    const height = svgRef.current.clientHeight || 550;

    // SVG Gradients & Markers Definitions
    const defs = svg.append("defs");

    // Grid pattern
    const pattern = defs.append("pattern")
      .attr("id", "blueprint-grid")
      .attr("width", 40)
      .attr("height", 40)
      .attr("patternUnits", "userSpaceOnUse");

    pattern.append("path")
      .attr("d", "M 40 0 L 0 0 0 40")
      .attr("fill", "none")
      .attr("stroke", "rgba(148, 163, 184, 0.05)")
      .attr("stroke-width", 1);

    pattern.append("circle")
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("r", 1)
      .attr("fill", "rgba(148, 163, 184, 0.15)");

    // Linear Gradients for each Category
    const gradients = [
      { id: "grad-system", from: "#7c3aed", to: "#a855f7" },
      { id: "grad-hardware", from: "#0891b2", to: "#06b6d4" },
      { id: "grad-organization", from: "#d97706", to: "#f59e0b" },
      { id: "grad-process", from: "#059669", to: "#10b981" },
      { id: "grad-metric", from: "#e11d48", to: "#f43f5e" },
      { id: "grad-concept", from: "#4338ca", to: "#818cf8" },
    ];

    gradients.forEach(g => {
      const grad = defs.append("linearGradient")
        .attr("id", g.id)
        .attr("x1", "0%").attr("y1", "0%")
        .attr("x2", "100%").attr("y2", "100%");
      grad.append("stop").attr("offset", "0%").attr("stop-color", g.from);
      grad.append("stop").attr("offset", "100%").attr("stop-color", g.to);
    });

    // Arrow markers
    defs.append("marker")
      .attr("id", "arrow-default")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 28)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-4L8,0L0,4")
      .attr("fill", "#64748b");

    defs.append("marker")
      .attr("id", "arrow-active")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 28)
      .attr("refY", 0)
      .attr("markerWidth", 7)
      .attr("markerHeight", 7)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-4L8,0L0,4")
      .attr("fill", "#c084fc");

    // Background Grid
    svg.append("rect")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("fill", "url(#blueprint-grid)");

    // Zoom container
    const g = svg.append("g");

    const zoom = d3.zoom()
      .scaleExtent([0.1, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);
    zoomRef.current = zoom;

    // Deep copy nodes and edges for rendering
    const nodes = graphData.nodes.map(n => ({ ...n }));
    const links = graphData.edges.map(e => ({
      ...e,
      source: e.source,
      target: e.target
    }));

    if (viewMode === "tree") {
      // Build Tree Hierarchy
      const nodeMap = new Map();
      nodes.forEach(n => nodeMap.set(n.id, { ...n, children: [] }));
      
      const inDegree = new Map();
      nodes.forEach(n => inDegree.set(n.id, 0));
      
      links.forEach(e => {
        const srcId = e.source.id || e.source;
        const tgtId = e.target.id || e.target;
        if (nodeMap.has(srcId) && nodeMap.has(tgtId)) {
          inDegree.set(tgtId, inDegree.get(tgtId) + 1);
        }
      });

      const visited = new Set();
      
      function dfs(nodeId) {
        if (visited.has(nodeId)) return null; // Avoid cycles
        visited.add(nodeId);
        
        const nodeData = nodeMap.get(nodeId);
        const result = { ...nodeData, children: [] };
        
        const childrenIds = links
          .filter(e => (e.source.id || e.source) === nodeId)
          .map(e => e.target.id || e.target);
          
        childrenIds.forEach(childId => {
          const childTree = dfs(childId);
          if (childTree) {
            result.children.push(childTree);
          }
        });
        
        return result.children.length > 0 || inDegree.get(nodeId) === 0 ? result : result; 
      }
      
      const roots = [];
      inDegree.forEach((degree, id) => {
        if (degree === 0) roots.push(id);
      });
      
      if (roots.length === 0 && nodes.length > 0) {
        const outDegree = new Map();
        nodes.forEach(n => outDegree.set(n.id, 0));
        links.forEach(e => {
          const srcId = e.source.id || e.source;
          outDegree.set(srcId, (outDegree.get(srcId) || 0) + 1);
        });
        let maxId = nodes[0].id;
        let maxD = 0;
        outDegree.forEach((d, id) => { if (d > maxD) { maxD = d; maxId = id; } });
        roots.push(maxId);
      }
      
      const treeRoots = roots.map(rootId => dfs(rootId)).filter(Boolean);
      
      const hierarchyData = {
        id: 'root-document',
        label: activeDocName || 'Document Root',
        type: 'system',
        children: treeRoots
      };

      const root = d3.hierarchy(hierarchyData);
      const dx = 40; 
      const dy = 200; 
      
      const tree = d3.tree().nodeSize([dx, dy]);
      tree(root);

      let x0 = Infinity;
      let x1 = -x0;
      root.each(d => {
        if (d.x > x1) x1 = d.x;
        if (d.x < x0) x0 = d.x;
      });

      // Center the tree layout
      const defaultY = height / 2;
      g.attr("transform", `translate(120, ${defaultY})`);
      svg.call(zoom.transform, d3.zoomIdentity.translate(120, defaultY).scale(0.8));

      // Links
      const link = g.append("g")
        .attr("fill", "none")
        .attr("stroke", "#334155")
        .attr("stroke-opacity", 0.7)
        .attr("stroke-width", 1.8)
        .selectAll("path")
        .data(root.links())
        .join("path")
        .attr("d", d3.linkHorizontal()
            .x(d => d.y)
            .y(d => d.x))
        .attr("class", "transition-all hover:stroke-purple-400 hover:stroke-[2.5px]");

      // Nodes
      const node = g.append("g")
        .selectAll("g")
        .data(root.descendants())
        .join("g")
        .attr("transform", d => `translate(${d.y},${d.x})`)
        .attr("class", "cursor-pointer")
        .on("click", (event, d) => {
          event.stopPropagation();
          if (d.data.id !== 'root-document') {
            setSelectedNode(d.data);
            setSelectedEdge(null);
          }
        });

      node.each(function (d) {
        const el = d3.select(this);
        const cat = CATEGORY_CONFIG[d.data.type] || CATEGORY_CONFIG.concept;
        
        el.append("circle")
          .attr("fill", cat.color)
          .attr("stroke", cat.border)
          .attr("stroke-width", 1.5)
          .attr("r", d.data.id === 'root-document' ? 8 : 5)
          .style("filter", `drop-shadow(0 0 4px ${cat.glow})`);
          
        el.append("text")
          .attr("dy", "0.31em")
          .attr("x", d.children ? -10 : 10)
          .attr("text-anchor", d.children ? "end" : "start")
          .text(d.data.label || d.data.id)
          .attr("font-size", "11px")
          .attr("font-weight", "500")
          .attr("fill", "#f8fafc")
          .style("text-shadow", "0 2px 4px rgba(0,0,0,0.8)");
      });

      // Reset selection on background click
      svg.on("click", () => {
        setSelectedNode(null);
        setSelectedEdge(null);
      });

      return () => {}; // No simulation to stop
    } else {
      // Simulation Setup for Graph View
      const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(140))
        .force("charge", d3.forceManyBody().strength(-360))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide().radius(42));

      // Links Rendering
      const linkGroup = g.append("g").attr("class", "links");
      const link = linkGroup.selectAll("g")
        .data(links)
        .join("g")
        .attr("class", "link cursor-pointer")
        .on("click", (event, d) => {
          event.stopPropagation();
          setSelectedEdge(d);
          setSelectedNode(null);
        });

      const linkPath = link.append("line")
        .attr("stroke", "#334155")
        .attr("stroke-width", 1.8)
        .attr("stroke-opacity", 0.75)
        .attr("marker-end", "url(#arrow-default)")
        .attr("class", "transition-all hover:stroke-purple-400 hover:stroke-[2.5px]");

      // Relation badge background + text
      const labelGroup = link.append("g")
        .attr("class", "link-label select-none pointer-events-none");

      labelGroup.append("rect")
        .attr("rx", 5)
        .attr("ry", 5)
        .attr("fill", "#070c18")
        .attr("stroke", "#1e293b")
        .attr("stroke-width", 1)
        .attr("opacity", 0.92);

      const linkText = labelGroup.append("text")
        .text(d => (d.relationship || "relates_to").replace(/_/g, " "))
        .attr("font-size", "9.5px")
        .attr("font-weight", "500")
        .attr("fill", "#94a3b8")
        .attr("text-anchor", "middle")
        .attr("dy", 3.5);

      // Adjust badge rect padding
      labelGroup.each(function () {
        const bbox = d3.select(this).select("text").node().getBBox();
        d3.select(this).select("rect")
          .attr("x", bbox.x - 6)
          .attr("y", bbox.y - 3)
          .attr("width", bbox.width + 12)
          .attr("height", bbox.height + 6);
      });

      // Nodes Rendering
      const nodeGroup = g.append("g").attr("class", "nodes");
      const node = nodeGroup.selectAll("g")
        .data(nodes)
        .join("g")
        .attr("class", "node cursor-pointer")
        .call(d3.drag()
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
        )
        .on("click", (event, d) => {
          event.stopPropagation();
          setSelectedNode(d);
          setSelectedEdge(null);
        });

      // Render Geometric Shapes based on Category
      node.each(function (d) {
        const el = d3.select(this);
        const cat = CATEGORY_CONFIG[d.type] || CATEGORY_CONFIG.concept;
        const gradUrl = `url(#grad-${d.type in CATEGORY_CONFIG ? d.type : 'concept'})`;

        // Pulsing Halo Glow (outer)
        el.append("circle")
          .attr("r", 26)
          .attr("fill", "none")
          .attr("stroke", cat.border)
          .attr("stroke-width", 1.2)
          .attr("stroke-dasharray", "3,3")
          .attr("opacity", 0.4)
          .attr("class", "animate-pulse");

        // Custom Shapes
        if (cat.shape === "hexagon") {
          el.append("polygon")
            .attr("points", "0,-22 19,-11 19,11 0,22 -19,11 -19,-11")
            .attr("fill", gradUrl)
            .attr("stroke", cat.border)
            .attr("stroke-width", 2.2)
            .style("filter", `drop-shadow(0 0 8px ${cat.glow})`);
        } else if (cat.shape === "diamond") {
          el.append("polygon")
            .attr("points", "0,-24 24,0 0,24 -24,0")
            .attr("fill", gradUrl)
            .attr("stroke", cat.border)
            .attr("stroke-width", 2.2)
            .style("filter", `drop-shadow(0 0 8px ${cat.glow})`);
        } else if (cat.shape === "shield") {
          el.append("polygon")
            .attr("points", "0,-23 21,-8 13,22 -13,22 -21,-8")
            .attr("fill", gradUrl)
            .attr("stroke", cat.border)
            .attr("stroke-width", 2.2)
            .style("filter", `drop-shadow(0 0 8px ${cat.glow})`);
        } else if (cat.shape === "square") {
          el.append("rect")
            .attr("x", -19)
            .attr("y", -19)
            .attr("width", 38)
            .attr("height", 38)
            .attr("rx", 9)
            .attr("fill", gradUrl)
            .attr("stroke", cat.border)
            .attr("stroke-width", 2.2)
            .style("filter", `drop-shadow(0 0 8px ${cat.glow})`);
        } else if (cat.shape === "concentric") {
          el.append("circle")
            .attr("r", 21)
            .attr("fill", gradUrl)
            .attr("stroke", cat.border)
            .attr("stroke-width", 2.2)
            .style("filter", `drop-shadow(0 0 8px ${cat.glow})`);
          el.append("circle")
            .attr("r", 12)
            .attr("fill", "none")
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 1.5)
            .attr("opacity", 0.6);
        } else {
          el.append("circle")
            .attr("r", 20)
            .attr("fill", gradUrl)
            .attr("stroke", cat.border)
            .attr("stroke-width", 2.2)
            .style("filter", `drop-shadow(0 0 8px ${cat.glow})`);
        }

        // Center Core Dot
        el.append("circle")
          .attr("r", 4)
          .attr("fill", "#ffffff")
          .attr("opacity", 0.9);

        // Node Label Text
        el.append("text")
          .text(d.label || d.id)
          .attr("text-anchor", "middle")
          .attr("dy", 35)
          .attr("font-size", "11px")
          .attr("font-weight", "600")
          .attr("fill", "#f8fafc")
          .style("user-select", "none")
          .style("pointer-events", "none")
          .style("text-shadow", "0 2px 5px rgba(0,0,0,0.95), 0 0 8px rgba(0,0,0,0.8)");
      });

      // Tick update
      simulation.on("tick", () => {
        linkPath
          .attr("x1", d => d.source.x)
          .attr("y1", d => d.source.y)
          .attr("x2", d => d.target.x)
          .attr("y2", d => d.target.y);

        labelGroup.attr("transform", d => {
          const x = (d.source.x + d.target.x) / 2;
          const y = (d.source.y + d.target.y) / 2;
          return `translate(${x},${y})`;
        });

        node.attr("transform", d => `translate(${d.x},${d.y})`);
      });

      // Reset selection on background click
      svg.on("click", () => {
        setSelectedNode(null);
        setSelectedEdge(null);
      });

      return () => simulation.stop();
    }
  }, [graphData, viewMode, activeDocName]);"""

    content = content.replace(old_effect, new_effect)

with open(target_file, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated successfully")
