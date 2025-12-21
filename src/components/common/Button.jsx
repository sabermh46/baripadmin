import { Link } from "react-router-dom";

const Btn = ({
    children,
    className = '',
    type = 'normal',
    disabled = false,
    href,
    ...rest
}) => {
    // Base classes applied to all buttons
    const baseClasses = `inline-flex items-center justify-center text-sm md:text-base whitespace-nowrap px-4 md:px-8 py-2 font-semibold rounded-lg transition-all duration-200 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`;

    let typeClasses = '';

    switch (type) {
        case 'primary':
            // Corresponds to the original Sign Up style (Filled, Darkens on hover)
            typeClasses = 'text-white border-2 border-transparent hover:border-primary-500 shadow-md bg-primary hover:bg-white hover:text-primary focus:ring-primary-500n';
            break;
        case 'outline':
            // Corresponds to the original Login style (Bordered, Light background on hover)
            typeClasses = 'text-primary border-2 border-primary-500 hover:bg-primary hover:text-white focus:border-primary-500';
            break;
        case 'normal':
        default:
            // A standard, slightly less emphasized button
            typeClasses = 'bg-slate-200 border-2 border-transparent text-slate-800 hover:bg-slate-300 focus:border-slate-400';
            break;
    }

    const classes = `${className} ${baseClasses} ${typeClasses}`;

    if (href) {
        // Render as an anchor tag (or router Link in a real project)
        return (
            <Link to={href} className={classes} {...rest}>
                {children}
            </Link>
        );
    }

    // Render as a standard button
    return (
        <button type="button" className={classes} {...rest}>
            {children}
        </button>
    );
};

export default Btn;