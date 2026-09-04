import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, X, Loader2, AlertTriangle, ImageDown, RefreshCw } from 'lucide-react';
import ProtectedImage from './ProtectedImage';
import useImageOptimizer from '../../hooks/useImageOptimizer';
import { formatBytes } from '../../utils/imageOptimizer';

/**
 * Pick an image, shrink it on this device, hand the smaller File to the caller.
 *
 * The caller never sees the original. `onChange` fires with the OPTIMISED File, so any form
 * that appends it to FormData is uploading the small one without knowing anything about the
 * pipeline.
 *
 * The savings line is deliberately visible rather than silent. People on a metered phone
 * connection are the ones this helps most, and "4.2 MB → 210 KB" tells them the app is
 * looking after their data instead of quietly doing something to their file.
 *
 * @param {object}   props
 * @param {string}   props.label
 * @param {string}   [props.name]         input name, for plain-FormData forms
 * @param {string}   [props.preset]       'avatar' | 'document' | 'landing'
 * @param {Function} props.onChange       (File|null) => void
 * @param {string}   [props.storedUrl]    an already-saved image, rendered via ProtectedImage
 * @param {string}   [props.aspect]       'wide' (default) | 'square'
 * @param {boolean}  [props.disabled]
 * @param {string}   [props.hint]
 */
const ImageUploadField = ({
  label,
  name,
  preset = 'document',
  onChange,
  storedUrl,
  aspect = 'wide',
  disabled = false,
  hint,
}) => {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const { optimize, reset, status, progress, result, error } = useImageOptimizer(preset);

  const busy = status === 'working';

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    const out = await optimize(file);
    if (out) onChange?.(out.file);
  }, [optimize, onChange]);

  const onPick = (e) => {
    const file = e.target.files?.[0];
    // Cleared so picking the SAME file twice still fires a change event — otherwise
    // re-selecting after a failed attempt does nothing at all.
    e.target.value = '';
    handleFile(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (disabled || busy) return;
    handleFile(e.dataTransfer.files?.[0]);
  };

  const clear = () => {
    reset();
    onChange?.(null);
  };

  // Keep the native input in step so a surrounding <form> that reads FormData directly still
  // sees the optimised file rather than the original the user picked.
  useEffect(() => {
    if (!inputRef.current || !name) return;
    const dt = new DataTransfer();
    if (result?.file) dt.items.add(result.file);
    inputRef.current.files = dt.files;
  }, [result, name]);

  const frame = aspect === 'square' ? 'aspect-square max-w-[220px]' : 'h-48 w-full';
  const preview = result?.previewUrl;

  return (
    <div>
      <label className="block text-sm font-medium text-text mb-2">{label}</label>

      {preview || storedUrl ? (
        <div className="relative">
          <div className={`${frame} rounded-lg border border-subdued/30 overflow-hidden bg-background`}>
            {preview ? (
              <img src={preview} alt={label} className="w-full h-full object-contain" />
            ) : (
              <ProtectedImage src={storedUrl} alt={label} className="w-full h-full object-contain" />
            )}
          </div>

          {preview ? (
            <button
              type="button"
              onClick={clear}
              disabled={disabled}
              className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 disabled:opacity-50"
              title="Remove"
            >
              <X size={16} />
            </button>
          ) : (
            <label className="absolute bottom-2 right-2 px-2 py-1 bg-white text-xs text-gray-600 rounded shadow cursor-pointer hover:bg-gray-100 inline-flex items-center gap-1">
              <RefreshCw size={12} /> Replace
              <input
                ref={inputRef} type="file" name={name} accept="image/*"
                className="hidden" onChange={onPick} disabled={disabled || busy}
              />
            </label>
          )}
        </div>
      ) : (
        <label
          onDragOver={(e) => { e.preventDefault(); if (!disabled && !busy) setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex flex-col items-center justify-center ${frame} border-2 border-dashed rounded-lg transition-colors
            ${disabled || busy ? 'cursor-wait opacity-70' : 'cursor-pointer hover:bg-subdued/5'}
            ${dragging ? 'border-primary bg-primary/5' : 'border-subdued/30 bg-background'}`}
        >
          {busy ? (
            <div className="flex flex-col items-center gap-2 px-6 w-full">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-sm text-subdued">Optimising on your device…</p>
              <div className="w-full max-w-[200px] h-1.5 bg-subdued/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-[width] duration-200"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center px-4 text-center">
              <Upload className="w-8 h-8 mb-2 text-subdued" />
              <p className="text-sm text-subdued">Upload {label}</p>
              <p className="text-xs text-subdued mt-1">
                {hint || 'Drag an image here, or click to choose'}
              </p>
            </div>
          )}

          <input
            ref={inputRef} type="file" name={name} accept="image/*"
            className="hidden" onChange={onPick} disabled={disabled || busy}
          />
        </label>
      )}

      {/* What the optimiser actually did. */}
      {status === 'done' && result && (
        <p className="mt-2 text-xs text-green-700 flex items-center gap-1.5 flex-wrap">
          <ImageDown size={13} className="shrink-0" />
          {result.skipped ? (
            <span>Already well optimised — uploading as is ({formatBytes(result.bytes)}).</span>
          ) : (
            <span>
              {formatBytes(result.originalBytes)} → <strong>{formatBytes(result.bytes)}</strong>
              {result.savedPct > 0 && <> · {result.savedPct}% smaller</>}
              {' · '}{result.width}×{result.height}
            </span>
          )}
        </p>
      )}

      {status === 'error' && error && (
        <p className="mt-2 text-xs text-red-600 flex items-start gap-1.5">
          <AlertTriangle size={13} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
};

export default ImageUploadField;
