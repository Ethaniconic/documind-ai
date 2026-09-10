import json
import re
from pathlib import Path
from typing import Dict, Any, List, Optional
import networkx as nx

from app.services.pdf_parser import extract_text
from app.services.llm_service import LLMService

BASE_DIR = Path(__file__).resolve().parent.parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
CHUNKS_DIR = BASE_DIR / "processed" / "chunks"
GRAPH_DIR = BASE_DIR / "processed" / "graph"
GRAPH_DIR.mkdir(parents=True, exist_ok=True)


def normalize_id(text: str) -> str:
    cleaned = re.sub(r"[^\w\s-]", "", text.strip().lower())
    return re.sub(r"[\s-]+", "_", cleaned)


class KnowledgeGraphService:
    def __init__(self):
        self.llm = LLMService()

    def get_graph_path(self, document_id: str) -> Path:
        return GRAPH_DIR / f"{document_id}_knowledge_graph.json"

    def load_cached_graph(self, document_id: str) -> Optional[Dict[str, Any]]:
        # 1. Exact match
        path = self.get_graph_path(document_id)
        if path.exists():
            try:
                with open(path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as err:
                print(f"[KnowledgeGraphService] Error loading {path}: {err}")

        # 2. Check for any graph containing the document_id in filename
        for p in GRAPH_DIR.glob(f"*{document_id}*.json"):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass

        # 3. Fallback default if single document exists
        default_p = GRAPH_DIR / "knowledge_graph.json"
        if default_p.exists() and document_id in ["default", "demo"]:
            try:
                with open(default_p, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass

        return None

    def get_document_pages(self, document_id: str) -> List[Dict[str, Any]]:
        """Extract pages from PDF or chunks for whole-document knowledge analysis."""
        # 1. Try uploaded PDF files
        candidate_files = [
            UPLOAD_DIR / f"{document_id}.pdf",
            UPLOAD_DIR / document_id,
        ]
        # Also glob for any matching prefix/suffix in uploads
        for f in UPLOAD_DIR.glob(f"*{document_id}*"):
            if f.suffix.lower() == ".pdf":
                candidate_files.append(f)

        for fpath in candidate_files:
            if fpath.exists() and fpath.is_file():
                try:
                    pages = extract_text(str(fpath))
                    if pages:
                        return pages
                except Exception as err:
                    print(f"[KnowledgeGraphService] Failed to extract from {fpath}: {err}")

        # 2. Fallback to chunks
        chunk_file = CHUNKS_DIR / f"{document_id}.json"
        if chunk_file.exists():
            try:
                with open(chunk_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    chunks = data.get("chunks", [])
                    page_map = {}
                    for c in chunks:
                        p_num = c.get("page_number", 1)
                        page_map.setdefault(p_num, []).append(c.get("text", ""))
                    return [{"page": p, "text": " ".join(texts)} for p, texts in page_map.items()]
            except Exception as err:
                print(f"[KnowledgeGraphService] Failed to extract from chunks {chunk_file}: {err}")

        return []

    def generate_graph(self, document_id: str, force_regenerate: bool = False) -> Dict[str, Any]:
        """Analyzes the entire document and extracts a hierarchical Knowledge Graph with cross-connections."""
        if not force_regenerate:
            cached = self.load_cached_graph(document_id)
            if cached:
                return cached

        pages = self.get_document_pages(document_id)
        if not pages:
            # If no raw text found, check if a pre-existing fallback graph exists
            for p in GRAPH_DIR.glob("*.json"):
                try:
                    with open(p, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        if data.get("nodes"):
                            data["document"]["id"] = document_id
                            return data
                except Exception:
                    pass
            raise ValueError(f"No source text or PDF found for document ID: {document_id}")

        # Formulate comprehensive prompt for Gemini
        doc_text_parts = []
        for p in pages[:15]:  # Process up to 15 pages thoroughly
            doc_text_parts.append(f"--- PAGE {p['page']} ---\n{p['text'].strip()}")
        full_content = "\n\n".join(doc_text_parts)

        prompt = f"""You are an elite Knowledge Graph architect.
Analyze the ENTIRE document provided below to construct an interactive, hierarchical KNOWLEDGE GRAPH with cross-topic relationships.

IMPORTANT CONSTRAINTS:
1. Do NOT create a simple chunk graph or one node per paragraph/page.
2. The graph must represent the actual KNOWLEDGE STRUCTURE:
   - Root Node (the document title/theme)
   - Major Topics (level 1)
   - Subtopics (level 2)
   - Concepts / Entities / Technologies / Methods / Processes / Definitions (level 3)
3. Include HIERARCHICAL edges (parent-child, level 0->1->2->3): 'contains_topic', 'consists_of', 'includes'.
4. Include CROSS-TOPIC edges between branches: 'uses', 'depends_on', 'is_a', 'type_of', 'produces', 'leads_to', 'implemented_by', 'contrasts_with'.
5. Every node must include:
   - "id": snake_case unique identifier
   - "label": Clear title
   - "type": one of ["root", "topic", "subtopic", "concept", "entity", "process", "method", "technology", "definition"]
   - "description": 1-2 sentence precise conceptual explanation
   - "importance": float between 0.5 and 1.0 (centrality)
   - "level": integer (0 for root, 1 for topic, 2 for subtopic, 3 for concept)
   - "parent_id": parent node id (null for root)
   - "source_pages": list of integer page numbers where this concept appears
   - "source_excerpt": a 1-sentence verbatim or near-verbatim quote from the document text
6. Every edge must include:
   - "source": source node id
   - "target": target node id
   - "relationship": relationship label (e.g. 'uses', 'depends_on', 'implements', 'contains')
   - "confidence": float between 0.7 and 1.0
   - "is_hierarchical": boolean (true for tree branches, false for cross-topic links)
   - "source_pages": list of page numbers

DOCUMENT CONTENT:
{full_content}

Respond ONLY with valid JSON matching this structure:
{{
  "document": {{
    "id": "{document_id}",
    "title": "<Document Title>",
    "domain": "<Domain / Category>",
    "summary": "<1-2 sentence high-level summary>",
    "total_pages": {len(pages)}
  }},
  "nodes": [
    ...
  ],
  "edges": [
    ...
  ]
}}
"""
        response_text = self.llm.generate(prompt, max_new_tokens=4096)
        cleaned_json = re.sub(r"^```(?:json)?", "", response_text.strip(), flags=re.MULTILINE)
        cleaned_json = re.sub(r"```$", "", cleaned_json.strip(), flags=re.MULTILINE).strip()

        try:
            graph_data = json.loads(cleaned_json)
        except Exception as e:
            # Attempt to locate first { and last }
            start = cleaned_json.find("{")
            end = cleaned_json.rfind("}")
            if start != -1 and end != -1:
                graph_data = json.loads(cleaned_json[start : end + 1])
            else:
                raise ValueError(f"Failed to parse LLM graph output: {e}\nRaw: {response_text[:300]}")

        # Post-process with NetworkX
        processed_graph = self._refine_graph_with_networkx(graph_data, document_id)

        # Cache to disk
        save_path = self.get_graph_path(document_id)
        with open(save_path, "w", encoding="utf-8") as f:
            json.dump(processed_graph, f, indent=2)

        return processed_graph

    def _refine_graph_with_networkx(self, graph_data: Dict[str, Any], document_id: str) -> Dict[str, Any]:
        """Validates edges, computes degree centrality, and assigns hierarchy levels."""
        G = nx.DiGraph()
        nodes = graph_data.get("nodes", [])
        edges = graph_data.get("edges", [])

        node_map = {n["id"]: n for n in nodes if "id" in n}

        # Add nodes to NetworkX
        for nid, ndata in node_map.items():
            G.add_node(nid, **ndata)

        # Validate and add edges
        valid_edges = []
        for edge in edges:
            src = edge.get("source")
            tgt = edge.get("target")
            if src in node_map and tgt in node_map and src != tgt:
                valid_edges.append(edge)
                G.add_edge(src, tgt, **edge)

        # Calculate degree centrality
        if len(G.nodes) > 0:
            centrality = nx.degree_centrality(G)
            for nid, score in centrality.items():
                if nid in node_map:
                    # Blend LLM importance with structural centrality
                    llm_imp = float(node_map[nid].get("importance", 0.7))
                    norm_cent = min(1.0, score * 2.5)
                    final_imp = round(0.6 * llm_imp + 0.4 * norm_cent, 2)
                    node_map[nid]["importance"] = max(0.5, min(1.0, final_imp))

        # Available levels
        levels = sorted(list(set(n.get("level", 0) for n in node_map.values())))

        result = {
            "document": graph_data.get("document", {
                "id": document_id,
                "title": "Document Knowledge Map",
                "domain": "General",
                "summary": "Knowledge graph generated from document.",
                "total_pages": 1
            }),
            "nodes": list(node_map.values()),
            "edges": valid_edges,
            "levels_available": levels or [0, 1, 2, 3]
        }
        return result

    def get_node_details(self, document_id: str, node_id: str) -> Dict[str, Any]:
        """Provides GraphRAG-ready node context: node data, neighbors, incoming/outgoing edges, and citations."""
        graph = self.load_cached_graph(document_id)
        if not graph:
            graph = self.generate_graph(document_id)

        nodes = {n["id"]: n for n in graph.get("nodes", [])}
        target_node = nodes.get(node_id)
        if not target_node:
            raise ValueError(f"Node '{node_id}' not found in document graph.")

        incoming = []
        outgoing = []
        for edge in graph.get("edges", []):
            if edge["source"] == node_id:
                tgt_node = nodes.get(edge["target"])
                outgoing.append({
                    "relationship": edge.get("relationship", "relates_to"),
                    "target_id": edge["target"],
                    "target_label": tgt_node["label"] if tgt_node else edge["target"],
                    "target_type": tgt_node["type"] if tgt_node else "concept",
                    "is_hierarchical": edge.get("is_hierarchical", False),
                    "confidence": edge.get("confidence", 0.9)
                })
            elif edge["target"] == node_id:
                src_node = nodes.get(edge["source"])
                incoming.append({
                    "relationship": edge.get("relationship", "relates_to"),
                    "source_id": edge["source"],
                    "source_label": src_node["label"] if src_node else edge["source"],
                    "source_type": src_node["type"] if src_node else "concept",
                    "is_hierarchical": edge.get("is_hierarchical", False),
                    "confidence": edge.get("confidence", 0.9)
                })

        parent = None
        if target_node.get("parent_id") and target_node["parent_id"] in nodes:
            p_node = nodes[target_node["parent_id"]]
            parent = {
                "id": p_node["id"],
                "label": p_node["label"],
                "type": p_node["type"]
            }

        return {
            "node": target_node,
            "parent": parent,
            "outgoing_connections": outgoing,
            "incoming_connections": incoming,
            "total_connections": len(outgoing) + len(incoming)
        }

    def find_path(self, document_id: str, source_id: str, target_id: str) -> Dict[str, Any]:
        """GraphRAG multi-hop semantic traversal between two concepts."""
        graph = self.load_cached_graph(document_id)
        if not graph:
            graph = self.generate_graph(document_id)

        G = nx.DiGraph()
        nodes = {n["id"]: n for n in graph.get("nodes", [])}
        for n in graph.get("nodes", []):
            G.add_node(n["id"], label=n.get("label", n["id"]))

        for e in graph.get("edges", []):
            G.add_edge(e["source"], e["target"], relationship=e.get("relationship", "relates_to"))

        try:
            path_nodes = nx.shortest_path(G, source_id, target_id)
            path_edges = []
            for i in range(len(path_nodes) - 1):
                u, v = path_nodes[i], path_nodes[i + 1]
                edge_data = G.get_edge_data(u, v) or {}
                path_edges.append({
                    "from": u,
                    "from_label": nodes.get(u, {}).get("label", u),
                    "to": v,
                    "to_label": nodes.get(v, {}).get("label", v),
                    "relationship": edge_data.get("relationship", "connected_to")
                })
            return {"found": True, "path": path_nodes, "edges": path_edges}
        except Exception:
            # Try undirected
            try:
                UG = G.to_undirected()
                path_nodes = nx.shortest_path(UG, source_id, target_id)
                return {"found": True, "path": path_nodes, "undirected": True}
            except Exception:
                return {"found": False, "path": [], "message": f"No path found between {source_id} and {target_id}"}
