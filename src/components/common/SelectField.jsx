export default function SelectField({
  label,
  name,
  value,
  onChange,
  options = [],
  placeholder = "Select an option",
  hint = "",
  error = "",
  validate = null,
}) {
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

      <select
        id={name}
        name={name}
        value={value || ""}
        onChange={handleChange}
        className={`w-full px-3 py-2 rounded-md border border-primary text-text bg-white/40 
                  shadow-[0px_0px_10px_5px_rgba(0,0,0,0.05)] 
                  outline-none transition ${
                    error ? "border-red-500" : "focus:border-2"
                  }`}
      >
        <option value="">{placeholder}</option>

        {options.map((opt, idx) => (
          <option key={idx} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {hint && !error && (
        <p className="mt-1 text-xs text-gray-400">{hint}</p>
      )}

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
