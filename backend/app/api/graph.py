from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from app.services.knowledge_graph_service import KnowledgeGraphService
from app.services.document_service import DocumentService

router = APIRouter(prefix="/graph", tags=["Knowledge Graph"])
graph_service = KnowledgeGraphService()
doc_service = DocumentService()


def _verify_document_access(document_id: str, user_id: Optional[str]):
    if not user_id:
        return
    allowed_doc_ids = doc_service.get_user_document_ids(user_id)
    if not allowed_doc_ids:
        raise HTTPException(
            status_code=403, 
            detail="Access denied. You have no uploaded documents."
        )
    doc_str = str(document_id)
    matches = any(allowed in doc_str or doc_str in allowed for allowed in allowed_doc_ids)
    if not matches:
        raise HTTPException(
            status_code=403, 
            detail="Access denied. You do not have permission to view this document's knowledge graph."
        )


@router.get("/{document_id}")
def get_knowledge_graph(
    document_id: str, 
    force: bool = Query(False, description="Force re-generation with LLM"),
    user_id: Optional[str] = Query(None, description="Requesting User ID for access control")
):
    """Retrieves the hierarchical knowledge graph with cross-connections for a document."""
    _verify_document_access(document_id, user_id)
    try:
        graph = graph_service.generate_graph(document_id, force_regenerate=force)
        return graph
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))


@router.post("/{document_id}/generate")
def force_generate_knowledge_graph(
    document_id: str,
    user_id: Optional[str] = Query(None, description="Requesting User ID for access control")
):
    """Force re-extracts the knowledge graph from the document using Gemini."""
    _verify_document_access(document_id, user_id)
    try:
        graph = graph_service.generate_graph(document_id, force_regenerate=True)
        return graph
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))


@router.get("/{document_id}/node/{node_id}")
def get_node_details(
    document_id: str, 
    node_id: str,
    user_id: Optional[str] = Query(None, description="Requesting User ID for access control")
):
    """Retrieves deep contextual details, citations, and 1-hop / 2-hop neighbors for a specific concept node."""
    _verify_document_access(document_id, user_id)
    try:
        details = graph_service.get_node_details(document_id, node_id)
        return details
    except ValueError as val_err:
        raise HTTPException(status_code=404, detail=str(val_err))
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))


@router.get("/{document_id}/path")
def get_concept_path(
    document_id: str, 
    source: str = Query(...), 
    target: str = Query(...),
    user_id: Optional[str] = Query(None, description="Requesting User ID for access control")
):
    """GraphRAG semantic path traversal between two concepts."""
    _verify_document_access(document_id, user_id)
    try:
        path_info = graph_service.find_path(document_id, source, target)
        return path_info
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))
