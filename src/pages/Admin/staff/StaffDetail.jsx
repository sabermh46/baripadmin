import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Activity, ArrowLeft, CheckCircle, Clock, Copy, History, Key, Mail, Shield, User, Users, XCircle,
} from 'lucide-react';
import {
  useGetAvailablePermissionsQuery,
  useGetStaffDetailsQuery,
  useSyncStaffPermissionsMutation,
  useUpdateStaffStatusMutation,
} from '../../../store/api/staffApi';
import ProtectedImage from '../../../components/common/ProtectedImage';
import PermissionEditor from '../../../components/admin/Staff/PermissionEditor';
import StaffActivity from '../../../components/admin/Staff/StaffActivity';
import PermissionHistory from '../../../components/admin/Staff/PermissionHistory';
import CopyPermissions from '../../../components/admin/Staff/CopyPermissions';
import { apiErrorMessage } from '../../../utils/apiError';
import { showMessageInLanguage } from '../../../utils/showMessageInLanguage';

const formatDate = (value) => {
  if (!value) return 'Never';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const STATUS_TONE = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-700',
  suspended: 'bg-red-100 text-red-700',
};

const Stat = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-2.5 min-w-0">
    <span className="mt-0.5 p-1.5 rounded-lg bg-gray-100 text-gray-500 shrink-0">
      <Icon className="h-3.5 w-3.5" />
    </span>
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-900 truncate">{value}</p>
    </div>
  </div>
);

const StaffDetail = () => {
  const { staffId } = useParams();
  const navigate = useNavigate();

  const [activityOpen, setActivityOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);

  const { data, isLoading, error } = useGetStaffDetailsQuery(staffId, { skip: !staffId });
  const { data: permissionData } = useGetAvailablePermissionsQuery();
  const [syncPermissions, { isLoading: isSaving }] = useSyncStaffPermissionsMutation();
  const [updateStatus, { isLoading: isUpdatingStatus }] = useUpdateStaffStatusMutation();

  const staff = data?.data;
  const catalogue = permissionData?.data?.all ?? [];
  // staffDetails carries both; permissionIds is the summary's, assignedPermissions the
  // detailed list. Either is the same set — prefer the one that is always present.
  const granted = staff?.permissionIds ?? (staff?.assignedPermissions ?? []).map((p) => p.id);

  const handleSave = async (permissionIds) => {
    try {
      const result = await syncPermissions({ staffId: Number(staffId), permissionIds }).unwrap();
      const { granted: added = [], revoked = [] } = result || {};
      toast.success(
        added.length || revoked.length
          ? `Permissions updated — ${added.length} granted, ${revoked.length} revoked`
          : 'No changes to save'
      );
    } catch (err) {
      toast.error(showMessageInLanguage(apiErrorMessage(err, 'Could not update permissions')));
    }
  };

  const handleStatus = async (status) => {
    try {
      await updateStatus({ staffId: Number(staffId), status }).unwrap();
      toast.success(status === 'active' ? 'Staff activated' : 'Staff deactivated');
    } catch (err) {
      toast.error(showMessageInLanguage(apiErrorMessage(err, 'Could not update status')));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[240px]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !staff) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <button
          type="button"
          onClick={() => navigate('/admin/staff')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft size={18} />
          Back to staff
        </button>
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          <XCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <p className="text-gray-700">
            {error ? showMessageInLanguage(apiErrorMessage(error, 'Failed to load this staff member.')) : 'Staff member not found.'}
          </p>
        </div>
      </div>
    );
  }

  const isActive = staff.status === 'active';

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <Link to="/admin/staff" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 text-sm">
        <ArrowLeft size={18} />
        Back to staff
      </Link>

      {/* Profile header */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-5">
        <div className="flex flex-wrap items-start gap-4">
          <ProtectedImage
            src={staff.avatarUrl}
            alt={staff.name}
            className="h-16 w-16 rounded-2xl object-cover shrink-0"
            fallback={
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <User className="h-7 w-7 text-primary" />
              </div>
            }
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900 truncate">{staff.name}</h1>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_TONE[staff.status] || 'bg-yellow-100 text-yellow-800'}`}>
                {staff.status}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 text-blue-800">
                <Shield className="h-3 w-3" />
                {staff.role || 'Staff'}
              </span>
            </div>
            <p className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
              <Mail className="h-3.5 w-3.5" />
              {staff.email}
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleStatus(isActive ? 'inactive' : 'active')}
            disabled={isUpdatingStatus}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors disabled:opacity-50 ${
              isActive
                ? 'border-red-200 text-red-700 hover:bg-red-50'
                : 'border-green-200 text-green-700 hover:bg-green-50'
            }`}
          >
            {isActive ? 'Deactivate' : 'Activate'}
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-100">
          <Stat icon={Key} label="Permissions" value={staff.totalPermissions ?? granted.length} />
          <Stat icon={Users} label="Reports to" value={staff.parent?.name || '—'} />
          <Stat icon={Clock} label="Last active" value={formatDate(staff.lastLoginAt)} />
          <Stat
            icon={isActive ? CheckCircle : XCircle}
            label="Account"
            value={isActive ? 'Enabled' : 'Disabled'}
          />
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {[
            { label: 'Activity', icon: Activity, onClick: () => setActivityOpen(true) },
            { label: 'Permission history', icon: History, onClick: () => setHistoryOpen(true) },
            { label: 'Copy permissions to…', icon: Copy, onClick: () => setCopyOpen(true) },
          ].map(({ label, icon: Icon, onClick }) => (
            <button
              key={label}
              type="button"
              onClick={onClick}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* What this person has done to other people's access — the reason an admin opens
          this page after something changed and nobody remembers who changed it. */}
      {(staff.grantedToOthers?.length > 0 || staff.revokedFromOthers?.length > 0) && (
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Changes made to others</h3>
          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">Granted</p>
              {staff.grantedToOthers?.length ? (
                <ul className="space-y-0.5">
                  {staff.grantedToOthers.map((g, i) => (
                    <li key={`${g.user}-${g.permission}-${i}`} className="text-gray-700">
                      <span className="font-medium">{g.permission}</span> → {g.user || 'unknown'}
                    </li>
                  ))}
                </ul>
              ) : <p className="text-gray-400">None</p>}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">Revoked</p>
              {staff.revokedFromOthers?.length ? (
                <ul className="space-y-0.5">
                  {staff.revokedFromOthers.map((g, i) => (
                    <li key={`${g.user}-${g.permission}-${i}`} className="text-gray-700">
                      <span className="font-medium">{g.permission}</span> → {g.user || 'unknown'}
                    </li>
                  ))}
                </ul>
              ) : <p className="text-gray-400">None</p>}
            </div>
          </div>
        </section>
      )}

      <PermissionEditor
        permissions={catalogue}
        selected={granted}
        identify={(p) => p.id}
        onSave={handleSave}
        isSaving={isSaving}
        subtitle={`Tick what ${staff.name} may do, then save. Granting and revoking happen together, in one request.`}
      />

      <StaffActivity
        staffId={staff.id}
        staffName={staff.name}
        isOpen={activityOpen}
        onClose={() => setActivityOpen(false)}
      />
      <PermissionHistory
        staffId={staff.id}
        staffName={staff.name}
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
      />
      <CopyPermissions
        sourceStaffId={staff.id}
        sourceStaffName={staff.name}
        isOpen={copyOpen}
        onClose={() => setCopyOpen(false)}
        onSuccess={() => setCopyOpen(false)}
      />
    </div>
  );
};

export default StaffDetail;
