import React, { useEffect } from 'react';
import { Mail, Phone, User } from 'lucide-react';
import { useAuth } from '../../../../hooks';
import { useNavigate } from 'react-router-dom';

const formatDate = (d) => {
  if (!d) return '–';
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return d;
  }
};

const ProfileSection = ({ profile, user, onSuccess }) => {
  const data = profile || user || {};
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (data?.id != null && onSuccess) onSuccess({ section: 'profile', data });
  }, [data?.id, onSuccess]);

  return (
    <section className="bg-surface rounded-xl border border-subdued/20 p-4 relative">
      <h3 className="text-sm font-semibold text-primary-700 uppercase tracking-wide flex items-center gap-2 mb-3">
        <User className="h-4 w-4" />
        Profile
      </h3>
        <div className="bg-gray-100 rounded-lg p-4 space-y-2 flex-4 max-w-full min-w-max">
          <div className="flex items-center gap-3">
            {data.avatarUrl ? (
              <img
                src={data.avatarUrl}
                alt={data.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                {(data.name || '?').charAt(0)}
              </div>
            )}
            <div>
              <p className="font-medium text-gray-900">{data.name || '–'}</p>
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <Mail size={14} />
                {data.email || '–'}
              </p>
              {data.phone && (
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <Phone size={14} />
                  {data.phone}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            {data.status != null && (
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${
                  data.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'
                }`}
              >
                {data.status}
              </span>
            )}
            {data.createdAt && (
              <span className="text-gray-500">Joined {formatDate(data.createdAt)}</span>
            )}
          </div>
        </div>

        <div onClick={() => currentUser?.id === data?.parent_id ? navigate(`/profile`) : navigate(`/admin/staff/${data?.parent_id}`)} className="bg-gray-300 max-w-[150px] md:max-w-full rounded-lg px-2 pb-1 shadow-2xl absolute right-1 top-1 cursor-pointer hover:bg-gray-400  transition-colors">
          {/* parentName, parentEmail, parentId */}
          <p className="text-sm font-medium text-primary-700 truncate"><span className="text-[0.5rem]">Created By</span> { currentUser?.id === data?.parent_id ? 'You' : data?.parent_name}</p>
          <p className="text-xs text-gray-500 truncate">{data?.parent_email}</p>
        </div>
    </section>
  );
};

export default ProfileSection;
