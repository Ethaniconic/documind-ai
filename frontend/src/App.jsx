import { useState } from "react";
import { uploadFile } from "./services/api";
import Header from "./components/Header";
import UploadBox from "./components/UploadBox";
import UploadButton from "./components/UploadButton";
import FileCard from "./components/FileCard";
import ProcessButton from "./components/ProcessButton";
import EmbeddingCard from "./components/EmbeddingCard";
import RetrievalPage from "./components/RetrievalPage";

const App = () => {
  const [activeTab, setActiveTab] = useState("upload");
  const [file, setFile] = useState(null);
  const [uploadedDoc, setUploadedDoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [processed, setProcessed] = useState(false);

  const handleUpload = async () => {
    if (!file || loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await uploadFile(file);
      if (res.status === "success") {
        setUploadedDoc(res.data);
        setFile(null);
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-tech-grid text-slate-100 flex items-center justify-center p-4 selection:bg-indigo-500 selection:text-white font-sans">
      <div className={`w-full ${activeTab === "retrieve" ? "max-w-xl" : "max-w-md"} bg-[#0b101e] border-2 border-slate-700/90 shadow-[8px_8px_0px_0px_#1e293b] p-6 space-y-5 transition-all duration-300`}>
        {/* Header */}
        <Header />

        {/* Blocky Tab Switcher */}
        <div className="grid grid-cols-2 gap-2 font-mono text-xs">
          <button
            onClick={() => setActiveTab("upload")}
            className={`py-2 px-3 border-2 uppercase font-bold tracking-wider transition-all cursor-pointer ${
              activeTab === "upload"
                ? "bg-indigo-600 border-indigo-400 text-white shadow-[3px_3px_0px_0px_#3730a3]"
                : "bg-slate-900 border-slate-700/80 text-slate-400 hover:text-slate-200 hover:border-slate-500"
            }`}
          >
            01. Ingest &amp; Embed
          </button>
          <button
            onClick={() => setActiveTab("retrieve")}
            className={`py-2 px-3 border-2 uppercase font-bold tracking-wider transition-all cursor-pointer ${
              activeTab === "retrieve"
                ? "bg-indigo-600 border-indigo-400 text-white shadow-[3px_3px_0px_0px_#3730a3]"
                : "bg-slate-900 border-slate-700/80 text-slate-400 hover:text-slate-200 hover:border-slate-500"
            }`}
          >
            02. RAG Retrieval
          </button>
        </div>

        {/* Tab 1: Upload & Ingest Pipeline */}
        {activeTab === "upload" && (
          <div className="space-y-4">
            <UploadBox
              onFileSelect={(f) => { setFile(f); setUploadedDoc(null); setError(null); }}
              onError={(msg) => { setError(msg); setFile(null); }}
            />

            {/* Error Banner */}
            {error && (
              <div className="flex items-center justify-between p-3 bg-rose-950/60 border-2 border-rose-500/80 font-mono text-xs text-rose-300">
                <span>[!] {error}</span>
                <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-200 font-bold ml-2 cursor-pointer">
                  [X]
                </button>
              </div>
            )}

            {/* Selected File Card */}
            {file && !uploadedDoc && (
              <FileCard doc={file} onRemove={() => setFile(null)} />
            )}

            {/* Upload Button */}
            {!uploadedDoc && (
              <UploadButton onUpload={handleUpload} loading={loading} disabled={!file} />
            )}

            {/* Process & Embedding Flow */}
            {uploadedDoc && (
              <div className="space-y-3 pt-1 border-t-2 border-slate-800">
                <FileCard
                  doc={uploadedDoc}
                  isSuccess={true}
                  onRemove={() => {
                    setUploadedDoc(null);
                    setProcessed(false);
                  }}
                />
                <ProcessButton
                  document_id={uploadedDoc.stored_name?.replace(".pdf", "")}
                  onDone={() => setProcessed(true)}
                />
                {processed && (
                  <EmbeddingCard document={uploadedDoc} />
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Semantic Retrieval Pipeline */}
        {activeTab === "retrieve" && (
          <RetrievalPage />
        )}

        {/* Footer info */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-[10px] font-mono text-slate-500">
          <span>LOCAL FAISS ENGINE</span>
          <span>DIM: 384 • FLAT_IP</span>
        </div>
      </div>
    </div>
  );
};

export default App;