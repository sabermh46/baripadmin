// src/components/profile/ChangePassword.jsx
import React, { useState } from 'react';
import { useChangePasswordMutation } from '../../store/api/authApi';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import NavigateBack from '../../components/common/NavigateBack';

const ChangePassword = () => {
  const [formData, setFormData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [changePassword, { isLoading }] = useChangePasswordMutation();

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
      return toast.error("New passwords do not match");
    }

    try {
      await changePassword({ 
        oldPassword: formData.oldPassword, 
        newPassword: formData.newPassword 
      }).unwrap();
      toast.success("Password updated successfully!");
      setFormData({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err?.data?.error || "Failed to change password");
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-background px-4'>
        <div className="max-w-md w-full space-y-8 bg-surface p-8 rounded-2xl border border-surface shadow-xl">
            <NavigateBack />
            <div className="flex items-center gap-3 mb-6">
                
                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                <ShieldCheck size={24} />
                </div>
                <div>
                <h3 className="text-lg font-bold text-text">Change Your Password</h3>
                <p className="text-sm text-subdued">Manage your account password</p>
                </div>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4 max-w-md">
                <div>
                <label className="block text-sm font-medium text-subdued mb-1">Old Password</label>
                <input
                    type="password"
                    required
                    className="w-full px-4 py-2 bg-background border border-surface rounded-xl focus:border-primary outline-none text-text"
                    value={formData.oldPassword}
                    onChange={(e) => setFormData({...formData, oldPassword: e.target.value})}
                />
                </div>
                <div>
                <label className="block text-sm font-medium text-subdued mb-1">New Password</label>
                <input
                    type="password"
                    required
                    minLength={6}
                    className="w-full px-4 py-2 bg-background border border-surface rounded-xl focus:border-primary outline-none text-text"
                    value={formData.newPassword}
                    onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
                />
                </div>
                <div>
                <label className="block text-sm font-medium text-subdued mb-1">Confirm New Password</label>
                <input
                    type="password"
                    required
                    className="w-full px-4 py-2 bg-background border border-surface rounded-xl focus:border-primary outline-none text-text"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                />
                </div>

                <button
                type="submit"
                disabled={isLoading}
                className="mt-2 px-6 py-2 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                {isLoading && <Loader2 className="animate-spin" size={16} />}
                Update Password
                </button>
            </form>
            </div>
    </div>
  );
};

export default ChangePassword;