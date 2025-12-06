import {googleIcon} from "../../assets";
export default function GoogleButton({onClick}) {


  return (
    <button
      onClick={onClick}
      className="flex text-slate-700 items-center justify-center gap-2 w-full py-1 mt-3 border rounded-lg bg-white hover:text-primary border-primary cursor-pointer"
    >
      <img className="h-6 w-6" src={googleIcon} alt="Google Icon" />
      <span className="font-poppins text-xl">Google</span>
    </button>
  );
}
