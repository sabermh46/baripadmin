import React, { useRef, useState } from 'react';
import { Download, FileText, Upload, X } from 'lucide-react';
import { downloadProtectedFile } from './ProtectedImage';

/**
 * A file that may be a PDF or a photo: a rental agreement, typically. ImageUploadField is for
 * pictures it can shrink on the device; a scanned contract is often a multi-page PDF, which is
 * sent as picked.
 *
 * The stored file is offered as a download rather than a preview: it sits behind the
 * token-guarded /uploads route, and a PDF does not render in an <img> anyway.
 *
 * @param {object}   props
 * @param {string}   props.label
 * @param {Function} props.onChange      (File|null) => void
 * @param {string}   [props.storedUrl]   an already-saved file
 * @param {string}   [props.downloadName] file name for the download, without extension
 * @param {number}   [props.maxMb]       matches the server's limit (RenterController::AGREEMENT_RULES)
 * @param {string}   [props.hint]
 */
const ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp';

const DocumentUploadField = ({ label, onChange, storedUrl, downloadName = 'document', maxMb = 10, hint }) => {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');

  const pick = (picked) => {
    setError('');
    if (!picked) return;
    if (!ACCEPT.split(',').includes(picked.type)) {
      setError('Choose a PDF or an image (JPG, PNG, WebP).');
      return;
    }
    if (picked.size > maxMb * 1024 * 1024) {
      setError(`The file is larger than ${maxMb} MB.`);
      return;
    }
    setFile(picked);
    onChange(picked);
  };

  const clear = () => {
    setFile(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const download = () => {
    const ext = storedUrl?.split('.').pop() || 'pdf';
    downloadProtectedFile(storedUrl, `${downloadName}.${ext}`).catch(() => setError('Could not download the file.'));
  };

  return (
    <div>
      <label className="block text-sm font-medium text-text mb-2">{label}</label>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files?.[0]); }}
        className="rounded-lg border border-dashed border-subdued/40 bg-background px-4 py-4"
      >
        {file ? (
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 shrink-0 text-primary" aria-hidden />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-text truncate">{file.name}</div>
              <div className="text-xs text-subdued">{(file.size / 1024 / 1024).toFixed(1)} MB</div>
            </div>
            <button type="button" onClick={clear} aria-label="Remove" className="p-1 rounded-full bg-red-500 text-white hover:bg-red-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <FileText className="w-8 h-8 shrink-0 text-subdued" aria-hidden />
            <div className="flex-1 min-w-0 text-sm text-subdued">
              {storedUrl ? 'A file is saved.' : 'No file yet.'}
            </div>
            {storedUrl && (
              <button type="button" onClick={download} className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-700 bg-white shadow hover:bg-gray-100">
                <Download className="w-3.5 h-3.5" aria-hidden /> Download
              </button>
            )}
            <button type="button" onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-700 bg-white shadow hover:bg-gray-100">
              <Upload className="w-3.5 h-3.5" aria-hidden /> {storedUrl ? 'Replace' : 'Choose file'}
            </button>
          </div>
        )}
        <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      </div>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : hint && <p className="mt-1 text-xs text-subdued">{hint}</p>}
    </div>
  );
};

export default DocumentUploadField;
