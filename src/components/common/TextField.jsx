import { useState } from "react";
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
}) {
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const val = e.target.value;
    if (validate) validate(val);
    onChange(name, val);
  };

  return (
    <div className="flex flex-col mb-3 font-mooli">
      {label && (
        <label
          htmlFor={name}
          className="mb-1 text-sm font-medium text-primary"
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
          value={value || ""}
          onChange={handleChange}
          className={`w-full px-3 py-2 rounded-md border border-primary ${ error
              ? "focus:border-red-500"
              : "focus:border-2"
          } ${isPassword ? "pr-9" : ""} outline-none text-text bg-white/40 shadow-[0px_0px_10px_5px_rgba(0,0,0,0.05)]  transition`}
        />
        {isPassword && (
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
