import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

interface Props {
  onFile: (file: File) => void;
  loading: boolean;
}

const ACCEPT = { "application/pdf": [".pdf"], "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"] };

export default function UploadZone({ onFile, loading }: Props) {
  const [dragOver, setDragOver] = useState(false);

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) onFile(accepted[0]);
  }, [onFile]);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    onDragEnter: () => setDragOver(true),
    onDragLeave: () => setDragOver(false),
    accept: ACCEPT,
    maxFiles: 1,
    disabled: loading,
  });

  return (
    <div
      {...getRootProps()}
      className={`
        relative cursor-pointer rounded-2xl border-2 border-dashed p-16 text-center
        transition-all duration-300 select-none
        ${dragOver
          ? "border-indigo-400 bg-indigo-500/10 scale-[1.01]"
          : "border-white/20 hover:border-indigo-400/60 hover:bg-white/5"
        }
        ${loading ? "opacity-50 cursor-not-allowed" : ""}
      `}
    >
      <input {...getInputProps()} />

      {/* Icon */}
      <div className="mx-auto mb-6 w-20 h-20 rounded-2xl flex items-center justify-center"
           style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
        {loading ? (
          <div className="spinner w-8 h-8 border-2 border-white/30 border-t-white" />
        ) : (
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z" />
          </svg>
        )}
      </div>

      <h3 className="text-xl font-semibold text-white mb-2">
        {loading ? "Uploading…" : "Drop your clinical document here"}
      </h3>
      <p className="text-slate-400 text-sm mb-4">
        {loading ? "Please wait while we process your file"
                 : "Or click to browse — PDF, JPG, PNG accepted"}
      </p>

      {!loading && (
        <div className="flex flex-wrap justify-center gap-2 text-xs">
          {["Discharge Summary", "Diagnostic Report", "Lab Report"].map(t => (
            <span key={t} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-400">
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
