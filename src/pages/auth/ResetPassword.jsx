// src/pages/auth/ResetPassword.jsx
import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useResetPasswordMutation } from '../../store/api/authApi';
import { Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import NavigateBack from '../../components/common/NavigateBack';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [resetPassword, { isLoading }] = useResetPasswordMutation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) return toast.error("Missing reset token.");

    try {
      await resetPassword({ token, password }).unwrap();
      toast.success("Password reset successful! Please login.");
      navigate('/login');
    } catch (err) {
      toast.error(err?.data?.error || "Failed to reset password");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full bg-surface p-8 rounded-2xl border border-surface shadow-xl space-y-8">

        <div>
            <NavigateBack />
        </div>
        <div className="text-center">
          <h2 className="text-3xl font-black text-text tracking-tight">Create New Password</h2>
          <p className="text-subdued mt-2">Please enter your new secure password.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-subdued w-5 h-5" />
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              className="w-full pl-10 pr-12 py-3 bg-background border border-surface rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-text"
              placeholder="New Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-subdued hover:text-text"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;