import React, { useState } from "react";
import { apiErrorMessage } from '../../utils/apiError';
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useGoogleLoginMutation, useLoginMutation } from "../../store/api/authApi";
import { useAppDispatch } from "../../hooks";
import { setCredentials } from "../../store/slices/authSlice";
import GoogleButton from "../../components/common/GoogleButton";
import { buildingShade } from "../../assets";
import TextField from "../../components/common/TextField";
import SmartFrom from "../../components/common/SmartForm";
import { ChevronLeft } from "lucide-react";
import { GOOGLE_ERROR_MESSAGES, safeInternalPath, startGoogleSignIn } from "../../utils/googleAuth";

export default function LoginPage() {

  // An error the Google redirect put on the URL (/login?error=…), read once as the initial
  // value rather than copied in by an effect after the first render.
  const [error, setError] = useState(() => {
    const code = new URLSearchParams(window.location.search).get('error');
    return code ? GOOGLE_ERROR_MESSAGES[code] || 'An error occurred. Please try again.' : "";
  });
  const [loginMutation, { isLoading }] = useLoginMutation();
  const [googleLogin] = useGoogleLoginMutation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  // Where the user was headed when ProtectedRoute sent them here, so signing in finishes
  // the trip instead of always landing on the dashboard.
  const destination = safeInternalPath(location.state?.from);

  // `replace`, never push: this login entry is swapped for where the user is going. With
  // push, Back from the dashboard returned to /login, which PublicRoute bounced straight
  // back to the dashboard, so Back appeared to do nothing and the history kept growing.
  const enterApp = (payload) => {
    dispatch(setCredentials(payload));
    navigate(destination, { replace: true });
  };



    const fields = [
      {
        component: TextField,
        name: "email",
        label: "Email",
        placeholder: "Enter your email",
        hint: "",
        validate: (val) => (!val ? "Email is required" : ""),
      },
      {
        component: TextField,
        name: "password",
        label: "Password",
        isPassword: true,
        placeholder: "Enter password",
        validate: (val) =>
          val && val.length < 6 ? "Password must be at least 6 characters" : "",
      },
    ];

  // ---- LOGIN SUBMIT ----
  const handleSubmit = async (formData) => {
    setError("");

    try {
      const result = await loginMutation({ email: formData.email, password: formData.password }).unwrap();
      enterApp(result);
    } catch (err) {
      setError(apiErrorMessage(err, "Invalid email or password"));
    }
  };

  // ---- GOOGLE AUTH ----
  // In a popup, so this tab's history never gains Google's pages (see utils/googleAuth.js).
  // The old URL also carried `token=abcdxyz`, a placeholder the API took for a real invite
  // token. Any NEW user pressing Google on the login page was therefore checked against an
  // invite that did not exist and refused with "registrations are closed", even when public
  // registration was open.
  const googleAuth = async () => {
    setError("");
    try {
      const result = await startGoogleSignIn();
      if (result.redirected) return;
      if (result.error) {
        setError(GOOGLE_ERROR_MESSAGES[result.error] || GOOGLE_ERROR_MESSAGES.google_auth_failed);
        return;
      }
      enterApp(await googleLogin().unwrap());
    } catch {
      setError(GOOGLE_ERROR_MESSAGES.google_auth_failed);
    }
  };

  return (
    <div className="flex flex-col pt-8 items-center bg-background bg-cover bg-center relative overflow-x-clip min-h-screen px-4">
        <Link to="/" className="fixed z-30 h-10 top-6 left-6 font-bold text-slate-400 flex items-center gap-2 hover:underline cursor-pointer">
              <ChevronLeft  /> <span>Back To Home</span>
        </Link>
      {/* Background image */}
      <div className="absolute md:pl-50">
        <img
          className="w-[600px] max-w-none translate-x-20 -translate-y-10 md:translate-x-0 md:translate-y-0"
          src={buildingShade}
          alt="Building"
        />
      </div>

      {/* CARD */}
      <div className="w-full max-w-md p-6 z-10">

        {/* HEADER */}
        <h1 className="text-lg font-bold mb-2 text-center text-primary">Login</h1>

        

        {/* FORM */}
        <SmartFrom logoVisible header={''} fields={fields} onSubmit={handleSubmit} loading={isLoading} />

        
        {/* ERROR */}
        {error && (
          <div className="bg-red-100 text-red-700 border border-red-300 p-3 rounded-md my-4 text-sm">
            {error}
          </div>
        )}

        {/* DIVIDER */}
        <div className="my-5 text-center text-black/70 text-sm relative">
          <span className="px-3 bg-white/10 backdrop-blur-md z-10 relative">
            or continue with
          </span>
          <div className="absolute left-0 top-1/2 w-full h-px bg-white/20 -z-0"></div>
        </div>

        <GoogleButton onClick={googleAuth} />




        {/* SIGNUP LINK */}
        <div className="flex gap-8 text-sm justify-between mt-5">
          <p>
            Don't have an account?{" "} <br />
            
            <Link
              to="/signup"
              className="text-primary font-medium hover:underline"
            >
              Sign up
            </Link>
          </p>
          <p className="text-right">
            Forgot your password?{" "} <br />
            <Link
              to="/forgot-password" 
              className="text-primary font-medium hover:underline"
            >
              Reset it
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
