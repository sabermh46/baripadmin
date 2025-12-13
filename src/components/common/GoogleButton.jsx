import {googleIcon} from "../../assets";
export default function GoogleButton({onClick, disabled = false, title = "Continue with Google"}) {


  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center justify-center gap-3 py-2 px-4 ring rounded-lg font-medium transition ${
        disabled
          ? 'bg-gray-100 ring-gray-300 text-gray-400 cursor-not-allowed'
          : 'bg-white ring-primary text-gray-700 cursor-pointer'
      }`}
    >
      <img className="h-6 w-6" src={googleIcon} alt="Google Icon" />
      <span className="font-poppins text-sm md:text-xl">{title}</span>
    </button>
  );
}
