// SmartForm.jsx
import { useState, useCallback, useEffect } from "react";
import { Loader2 } from "lucide-react";
import TextField from "./TextField";
import SelectField from "./SelectField";
import { appLogo } from "../../assets";

/**
 * SmartForm Component
 * Renders a dynamic form based on a configuration array (fields).
 */
export default function SmartForm({ 
  fields = [], 
  onSubmit,
  header = <p>Form</p>, 
  logoVisible = false, 
  submitText = "Submit", 
  submitDisabled = false,
  /** True while the caller's onSubmit is in flight. Shows a spinner and blocks re-submits. */
  loading = false,
}) {
    
    // Initialize formData with field values
    const [formData, setFormData] = useState(() => {
        const initialData = {};
        fields.forEach(field => {
            // Priority: value prop > defaultValue > empty string
            initialData[field.name] = field.value !== undefined ? field.value : 
                                    field.defaultValue !== undefined ? field.defaultValue : '';
        });
        return initialData;
    });
    
    const [errors, setErrors] = useState({});

    // Update formData when fields with values change (especially for disabled fields)
    useEffect(() => {
        const updates = {};
        let hasUpdates = false;
        
        fields.forEach(field => {
            // For disabled fields or fields with explicit values, update formData
            if (field.value !== undefined && formData[field.name] !== field.value) {
                updates[field.name] = field.value;
                hasUpdates = true;
            }
        });
        
        if (hasUpdates) {
            setFormData(prev => ({
                ...prev,
                ...updates
            }));
        }
    }, [fields]); // Watch for changes in fields array

    // Handles input change for all field types
    const handleChange = useCallback((name, value) => {
        setFormData((prev) => {
            const newData = { ...prev, [name]: value };
            return newData;
        });
        setErrors((prev) => ({ ...prev, [name]: "" }));
    }, []);

    // Validates the entire form based on individual field validation functions
    const validateForm = useCallback(() => {
        const newErrors = {};
        let isValid = true;

        fields.forEach(field => {
            const value = formData[field.name] || ''; 
            
            if (field.validate) {
                // ✅ Pass the entire formData as second argument
                const errorMsg = field.validate(value.toString(), formData); 
                
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

        // Guarded as well as disabled: Enter in a text field submits the form without ever
        // touching the button, so `disabled` alone would not stop a second request.
        if (isValid && !loading) {
            onSubmit(formData);
        }
    };

    // Create a wrapped validate function that includes formData
    const createFieldValidate = useCallback((fieldName, originalValidate) => {
        if (!originalValidate) return undefined;
        
        return (value) => {
            // Pass both value and formData to the original validate function
            return originalValidate(value, formData);
        };
    }, [formData]);

    return (
        <form onSubmit={handleSubmit}>
            {/* Logo Section */}
            {logoVisible && (
                <div className="flex justify-center mb-4">
                    <img src={appLogo} alt="Logo" className="h-14 w-14" />
                </div>
            )}

            {/* Header Section */}
            <div className="p-3 text-center text-primary text-xl font-bold">{header}</div>

            {/* Dynamic Fields Mapping */}
            {fields.map((field) => {
                const key = field.name; 
                
                // Create a wrapped validate function for this field
                const fieldValidate = createFieldValidate(field.name, field.validate);
                
                // Get the value - prioritize formData, then field.value, then empty string
                const fieldValue = formData[field.name] !== undefined ? formData[field.name] : 
                                 field.value !== undefined ? field.value : '';
                
                // Define props object
                const commonProps = {
                    name: field.name,
                    label: field.label,
                    value: fieldValue,
                    onChange: handleChange,
                    placeholder: field.placeholder,
                    hint: field.hint,
                    error: errors[field.name],
                    validate: fieldValidate,
                    disabled: field.disabled || false,
                };

                // SELECT FIELD
                if (field.component === SelectField || field.component === "select") {
                    return (
                        <SelectField
                            key={key}
                            {...commonProps}
                            options={field.options || []}
                        />
                    );
                }

                // TEXT FIELD (default)
                return (
                    <TextField
                        key={key}
                        {...commonProps}
                        isPassword={field.isPassword}
                    />
                );
            })}

            {/*
              * Submit.
              *
              * `py-1` made it shorter than the fields above it, so the primary action read as
              * the lightest thing on the form. It now matches the inputs' rhythm and clears
              * the 44px a thumb needs.
              *
              * The label stays put while loading and the spinner joins it, rather than the
              * text being swapped out - a button that changes width mid-press moves under the
              * finger that is still on it.
              */}
            <button
                type="submit"
                disabled={submitDisabled || loading}
                aria-busy={loading}
                className={`mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary py-2.5 font-anek-bn font-medium text-black transition ${
                    submitDisabled || loading
                        ? 'cursor-not-allowed opacity-60'
                        : 'cursor-pointer hover:bg-primary-700'
                }`}
            >
                {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {submitText}
            </button>
        </form>
    );
}