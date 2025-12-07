// SmartForm.jsx
import { useState, useCallback } from "react";
import TextField from "./TextField";
import SelectField from "./SelectField";
import { appLogo } from "../../assets";

/**
 * SmartForm Component
 * Renders a dynamic form based on a configuration array (fields).
 */
export default function SmartForm({ fields = [], onSubmit, header = <p>Form</p>, logoVisible = false }) {
    const [formData, setFormData] = useState(() => {
        // Initialize formData with default values (or empty strings) for all fields
        return fields.reduce((acc, field) => {
            acc[field.name] = field.defaultValue || '';
            return acc;
        }, {});
    });
    const [errors, setErrors] = useState({});

    // Handles input change for all field types
    const handleChange = useCallback((name, value) => {
        setFormData((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: "" }));
    }, []);

    // Validates the entire form based on individual field validation functions
    const validateForm = useCallback(() => {
        const newErrors = {};
        let isValid = true;

        fields.forEach(field => {
            // Use the current value from the state
            const value = formData[field.name] || ''; 
            
            if (field.validate) {
                // Run the field's validation and get the error message
                const errorMsg = field.validate(value.toString()); 
                
                if (errorMsg) {
                    newErrors[field.name] = errorMsg;
                    isValid = false;
                }
            }
        });

        setErrors(newErrors);
        return isValid;
    }, [fields, formData]);

    // Handles form submission
    const handleSubmit = (e) => {
        e.preventDefault();

        // Run validation
        const isValid = validateForm();

        // Only call onSubmit if the form is valid
        if (isValid) {
            onSubmit(formData);
        } 
    };

    return (
        <form
            onSubmit={handleSubmit}
        >
            {/* Logo Section */}
            {logoVisible && (
                <div className="flex justify-center mb-4">
                    <img src={appLogo} alt="Logo" className="h-14 w-14" />
                </div>
            )}

            {/* Header Section */}
            <div className="p-3 text-center text-primary text-xl font-bold">{header}</div>

            {/* Dynamic Fields Mapping */}
            {
                fields.map((field) => {
                    // 1. Use field.name as a stable key (assuming names are unique)
                    const key = field.name; 
                    
                    // 2. Define props object WITHOUT the 'key' property
                    const commonProps = {
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
                                key={key} // ✅ Key applied DIRECTLY
                                {...commonProps}
                                options={field.options || []}
                            />
                        );
                    }

                    // TEXT FIELD (default)
                    return (
                        <TextField
                            key={key} // ✅ Key applied DIRECTLY
                            {...commonProps}
                            isPassword={field.isPassword}
                        />
                    );
                })
              }

            {/* Submit Button - Original Tailwind classes preserved */}
            <button
                type="submit"
                className="mt-4 w-full py-1 rounded-md bg-primary-600 text-white font-poppins hover:bg-primary-700 transition cursor-pointer"
            >
                Submit
            </button>
        </form>
    );
}