import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function TextField({
  label,
  name,
  value,
  onChange,
  placeholder = "",
  hint = "",
  error = "",
  isPassword = false,
  validate = null,
  disabled = false,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [internalValue, setInternalValue] = useState(value || "");

  // Update internal value when prop changes
  useEffect(() => {
    setInternalValue(value || "");
  }, [value]);

  const handleChange = (e) => {
    const val = e.target.value;
    setInternalValue(val);
    
    if (validate) {
      validate(val);
    }
    
    if (onChange) {
      onChange(name, val);
    }
  };

  return (
    <div className="flex flex-col mb-3 font-mooli">
      {label && (
        <label
          htmlFor={name}
          className={`mb-1 text-sm font-medium ${disabled ? "text-gray-600" : "text-primary"}`}
        >
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={name}
          name={name}
          type={isPassword && !showPassword ? "password" : "text"}
          placeholder={placeholder}
          value={internalValue}
          disabled={disabled}
          onChange={handleChange}
          className={`w-full px-3 py-2 rounded-md ring ${
            error ? "focus:ring-red-500" : "focus:ring-3"
          } ${isPassword ? "pr-9" : ""} ${
            disabled ? "ring-gray-600 bg-gray-100" : "ring-primary"
          } outline-none text-text bg-white/40 shadow-[0px_0px_10px_5px_rgba(0,0,0,0.05)] transition`}
        />
        {isPassword && !disabled && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-2 top-2 text-gray-500"
          >
            {showPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        )}
      </div>
      {hint && !error && (
        <p className="mt-1 text-xs text-gray-400">{hint}</p>
      )}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}