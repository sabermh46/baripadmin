import { useState } from "react";
import TextField from "./TextField";
import SelectField from "./SelectField";
import { appLogo } from "../../assets";

export default function SmartForm({ fields = [], onSubmit, header = <p>Form</p>, logoVisible = false }) {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});

  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateForm = () => {
    const newErrors = {};
    let isValid = true;

    // 1. Loop through all fields and execute their 'validate' function
    fields.forEach(field => {
      // Ensure the component has a validate function and the field exists in formData
      const value = formData[field.name] || ''; // Use empty string if value is missing (for initial state)
      
      if (field.validate) {
        // Run the field's validation and get the error message (or empty string if valid)
        const errorMsg = field.validate(value.toString()); 
        
        if (errorMsg) {
          newErrors[field.name] = errorMsg;
          isValid = false;
        }
      }
    });

    // 2. Update the state with all collected errors
    setErrors(newErrors);

    // 3. Return the overall validity status
    return isValid;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // 🚨 STEP 1: Run validation function
    const isValid = validateForm();

    // 🚨 STEP 2: Only call onSubmit if the form is valid
    if (isValid) {
      onSubmit(formData);
    } 
    // If not valid, the setErrors call inside validateForm() will update the UI
  };

  return (
    <form
      onSubmit={handleSubmit}
    >
      {logoVisible && (
        <div className="flex justify-center mb-4">
          <img src={appLogo} alt="Logo" className="h-14 w-14" />
        </div>
      )}

      
      <div className="p-3 text-center text-primary text-xl font-bold">{header}</div>
      {
      

fields.map((field) => {
  const commonProps = {
    key: field.name,
    name: field.name,
    label: field.label,
    value: formData[field.name],
    onChange: handleChange,
    placeholder: field.placeholder,
    hint: field.hint,
    error: errors[field.name],
    validate: field.validate,
  };

  // SELECT FIELD
  if (field.component === "select") {
    return (
      <SelectField
        {...commonProps}
        options={field.options || []}
      />
    );
  }

  // TEXT FIELD (default)
  return (
    <TextField
      {...commonProps}
      isPassword={field.isPassword}
    />
  );
})

      }

      <button
        type="submit"
        className="mt-4 w-full py-1 rounded-md bg-primary-600 text-white font-poppins hover:bg-primary-700 transition cursor-pointer"
      >
        Submit
      </button>
    </form>
  );
}
