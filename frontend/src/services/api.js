import axios from "axios";

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const api = axios.create({
    baseURL: rawBaseUrl.replace(/\/+$/, "")
});

// Attach bearer token if stored
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("documind_token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Auth
export const signupUser = async (email, password) => {
    const res = await api.post("/signup", { email, password });
    return res.data;
};

export const loginUser = async (email, password) => {
    const res = await api.post("/login", { email, password });
    return res.data;
};

// Documents (Supabase Storage + PostgreSQL)
export const uploadDocument = async (file, userId) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("user_id", userId);
    const res = await api.post("/documents/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
    });
    return res.data;
};

export const getUserDocuments = async (userId) => {
    const res = await api.get(`/documents/user/${encodeURIComponent(userId)}?t=${new Date().getTime()}`);
    return res.data;
};

export const deleteDocument = async (documentId, userId = null) => {
    const url = userId 
        ? `/documents/${encodeURIComponent(documentId)}?user_id=${encodeURIComponent(userId)}`
        : `/documents/${encodeURIComponent(documentId)}`;
    const res = await api.delete(url);
    return res.data;
};

// Chat History
export const createChat = async (userId) => {
    const res = await api.post(`/chats?user_id=${userId}`);
    return res.data;
};

export const getUserChats = async (userId) => {
    const res = await api.get(`/chats/user/${encodeURIComponent(userId)}?t=${new Date().getTime()}`);
    return res.data;
};

export const getChatHistory = async (chatId) => {
    const res = await api.get(`/chats/${chatId}?t=${new Date().getTime()}`);
    return res.data;
};

export const saveChatMessage = async (chatId, role, content) => {
    const res = await api.post(`/chats/${chatId}/messages`, { role, content });
    return res.data;
};

export const renameChat = async (chatId, title) => {
    const res = await api.patch(`/chats/${chatId}`, { title });
    return res.data;
};

export const deleteChat = async (chatId) => {
    const res = await api.delete(`/chats/${chatId}`);
    return res.data;
};

// RAG & Processing

export const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await api.post("/upload/", formData, {
        headers: { "Content-Type": "multipart/form-data" }
    });
    return res.data;
};

export const processDocument = async (document_id) => {
    const res = await api.post(`/process/${document_id}`);
    return res.data;
};

export const generateEmbeddings = async (document_id) => {
    const res = await api.post(`/embed/${document_id}`);
    return res.data;
};

export const searchDocuments = async (query, top_k = 5) => {
    const res = await api.post("/search", { query, top_k });
    return res.data;
};

export const retrieveDocuments = async (query, top_k = 5) => {
    const res = await api.post("/retrieve", { query, top_k });
    return res.data;
};

export const chatDocuments = async (query, document_id = null, chat_id = null, user_id = null) => {
    const res = await api.post("/chat", { query, document_id, chat_id, user_id });
    return res.data;
};

// Knowledge Graph & Knowledge Tree
export const getKnowledgeGraph = async (documentId, force = false, userId = null) => {
    const params = new URLSearchParams();
    if (force) params.append("force", "true");
    if (userId) params.append("user_id", userId);
    const qs = params.toString() ? `?${params.toString()}` : "";
    const res = await api.get(`/graph/${documentId}${qs}`);
    return res.data;
};

export const generateKnowledgeGraph = async (documentId) => {
    const res = await api.post(`/graph/${documentId}/generate`);
    return res.data;
};

export const getNodeDetails = async (documentId, nodeId) => {
    const res = await api.get(`/graph/${documentId}/node/${nodeId}`);
    return res.data;
};

export const getGraphPath = async (documentId, source, target) => {
    const res = await api.get(`/graph/${documentId}/path?source=${encodeURIComponent(source)}&target=${encodeURIComponent(target)}`);
    return res.data;
};

export default api;