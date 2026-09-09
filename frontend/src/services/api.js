import axios from "axios";

const api = axios.create({
    baseURL: "http://127.0.0.1:8000"
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
    const res = await api.get(`/documents/user/${userId}`);
    return res.data;
};

// Chat History
export const createChat = async (userId) => {
    const res = await api.post(`/chats?user_id=${userId}`);
    return res.data;
};

export const getUserChats = async (userId) => {
    const res = await api.get(`/chats/user/${userId}`);
    return res.data;
};

export const getChatHistory = async (chatId) => {
    const res = await api.get(`/chats/${chatId}`);
    return res.data;
};

export const saveChatMessage = async (chatId, role, content) => {
    const res = await api.post(`/chats/${chatId}/messages`, { role, content });
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

export const chatDocuments = async (query, document_id = null, chat_id = null) => {
    const res = await api.post("/chat", { query, document_id, chat_id });
    return res.data;
};

export default api;