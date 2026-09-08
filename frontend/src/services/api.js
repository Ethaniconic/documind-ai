import axios from "axios";

const api = axios.create({
    baseURL: "http://127.0.0.1:8000"
});

export const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await api.post("/upload/", formData, {
        headers: {
            "Content-Type": "multipart/form-data"
        }
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

export default api;