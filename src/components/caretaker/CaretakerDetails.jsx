// pages/CaretakerDetails.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  useGetCaretakerDetailsQuery,
  useUpdateAssignmentPermissionsMutation,
  useRemoveCaretakerFromHouseMutation,
} from '../../store/api/caretakerApi';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  Home,
  Shield,
  Check,
  X,
  Edit,
  Save,
  Trash2,
  AlertCircle,
  Building,
  MapPin,
  ChevronLeft,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../../hooks';
import Btn from '../common/Button';
import ConfirmationModal from '../common/ConfirmationModal';

const CaretakerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const { data, isLoading, error, refetch } = useGetCaretakerDetailsQuery(id);
  const [updatePermissions, { isLoading: isUpdating }] = useUpdateAssignmentPermissionsMutation();
  const [removeFromHouse, { isLoading: isRemoving }] = useRemoveCaretakerFromHouseMutation();
  
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [permissionState, setPermissionState] = useState({});
  const [removeModalOpen, setRemoveModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  useEffect(() => {
    if (data?.data?.assignments) {
      const initialState = {};
      data.data.assignments.forEach(assignment => {
        initialState[assignment.assignmentId] = assignment.permissions
          .filter(p => p.assigned)
          .map(p => p.key);
      });
      setPermissionState(initialState);
    }
  }, [data]);

  const handlePermissionChange = (assignmentId, permissionKey, checked) => {
    setPermissionState(prev => {
      const current = prev[assignmentId] || [];
      if (checked) {
        return {
          ...prev,
          [assignmentId]: [...current, permissionKey],
        };
      } else {
        return {
          ...prev,
          [assignmentId]: current.filter(key => key !== permissionKey),
        };
      }
    });
  };

  const handleSavePermissions = async (assignmentId) => {
    try {
      console.log(assignmentId, permissionState[assignmentId]);
      
      await updatePermissions({
        assignmentId,
        permissions: permissionState[assignmentId] || [],
      }).unwrap();
      
      toast.success('Permissions updated successfully');
      setEditingAssignment(null);
      refetch();
    } catch (error) {
      toast.error(error.data?.error || 'Failed to update permissions');
    }
  };

  const handleRemoveAssignment = async () => {
    if (!selectedAssignment) return;
    
    try {
      await removeFromHouse(selectedAssignment.assignmentId).unwrap();
      toast.success('Caretaker removed from house successfully');
      setRemoveModalOpen(false);
      setSelectedAssignment(null);
      refetch();
    } catch (error) {
      toast.error(error.data?.error || 'Failed to remove assignment');
    }
  };

  const openRemoveModal = (assignment) => {
    setSelectedAssignment(assignment);
    setRemoveModalOpen(true);
  };

  const canEditPermissions = (assignment) => {
    if (user.role.slug === 'web_owner') return true;
    if (user.role.slug === 'staff' && user.permissions?.includes('caretakers.assign')) return true;
    if (user.role.slug === 'house_owner' && assignment.houseOwner.id === user.id) return true;
    return false;
  };

  const canRemoveAssignment = (assignment) => {
    return canEditPermissions(assignment);
  };

  const getPermissionCategory = (key) => {
    if (key.startsWith('houses.')) return 'House Management';
    if (key.startsWith('flats.')) return 'Flat Management';
    if (key.startsWith('renters.')) return 'Renter Management';
    if (key.startsWith('notices.')) return 'Notice Management';
    if (key.startsWith('payments.')) return 'Payment Management';
    if (key.startsWith('invoices.')) return 'Invoice Management';
    if (key.startsWith('maintenance.')) return 'Maintenance';
    if (key.startsWith('reports.')) return 'Reports';
    if (key.startsWith('analytics.')) return 'Analytics';
    return 'General';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-red-800">
                {error?.data?.error || 'Caretaker not found'}
              </h3>
              <div className="mt-2">
                <Btn onClick={() => navigate('/caretakers')}>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back to Caretakers
                </Btn>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const caretaker = data.data;
  const { assignments, stats } = caretaker;

  return (
    <div className="mx-auto">
      {/* Back Button */}
      <div className="mb-6">
        <Btn
          variant="ghost"
          onClick={() => navigate('/caretakers')}
          className="mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Caretakers
        </Btn>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            {caretaker?.avatarUrl ? (
              <img
                src={caretaker?.avatarUrl}
                alt={caretaker?.name}
                className="h-20 w-20 rounded-full"
              />
            ) : (
              <div className="h-20 w-20 rounded-full bg-primary-100 flex items-center justify-center">
                <User className="h-10 w-10 text-primary-600" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{caretaker?.name}</h1>
              <div className="flex items-center space-x-4 mt-2">
                <div className="flex items-center text-gray-600">
                  <Mail className="h-4 w-4 mr-2" />
                  {caretaker?.email}
                </div>
                {caretaker?.phone && (
                  <div className="flex items-center text-gray-600">
                    <Phone className="h-4 w-4 mr-2" />
                    {caretaker?.phone}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <div className="bg-gray-50 px-4 py-3 rounded-lg">
              <div className="text-sm text-gray-500">Active Assignments</div>
              <div className="text-2xl font-bold text-gray-900">{stats.activeAssignments}</div>
            </div>
            <div className="bg-gray-50 px-4 py-3 rounded-lg">
              <div className="text-sm text-gray-500">Total Permissions</div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalPermissions}</div>
            </div>
            <div className="bg-gray-50 px-4 py-3 rounded-lg">
              <div className="text-sm text-gray-500">Status</div>
              <div className={`text-lg font-medium ${
                caretaker?.status === 'active'
                  ? 'text-green-600'
                  : 'text-yellow-600'
              }`}>
                {caretaker?.status.charAt(0).toUpperCase() + caretaker?.status.slice(1)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Assignments and Permissions */}
      <div className="space-y-6">
        {assignments.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <Home className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Assignments</h3>
            <p className="text-gray-600 mb-4">
              This caretaker is not assigned to any houses.
            </p>
            <Link to={`/caretakers/${caretaker?.id}/assign`}>
              <Btn>
                <Plus className="h-4 w-4 mr-2" />
                Assign to House
              </Btn>
            </Link>
          </div>
        ) : (
          assignments.map((assignment) => (
            <div
              key={assignment.assignmentId}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
            >
              {/* Assignment Header */}
              <div className="border-b border-gray-200 p-6">
                <div className="flex flex-col md:flex-row md:items-center flex-wrap justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      <Building className="h-5 w-5 text-gray-400" />
                      <h3 className="text-lg font-semibold text-gray-900">
                        {assignment.house.name}
                      </h3>
                      {assignment.house.active ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="flex items-center text-gray-600 mb-1">
                      <MapPin className="h-4 w-4 mr-2" />
                      {assignment.house.address}
                    </div>
                    <div className="text-sm text-gray-500">
                      House Owner: {assignment.houseOwner.name} ({assignment.houseOwner.email})
                    </div>
                  </div>
                  
                  <div className="flex items-center flex-wrap space-x-3">
                    {editingAssignment === assignment.assignmentId ? (
                      <>
                        <Btn
                          onClick={() => handleSavePermissions(assignment.assignmentId)}
                          disabled={isUpdating}
                        >
                          {isUpdating ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              Save Changes
                            </>
                          )}
                        </Btn>
                        <Btn
                          variant="outline"
                          onClick={() => {
                            setEditingAssignment(null);
                            refetch();
                          }}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Btn>
                      </>
                    ) : (
                      <>
                        {canEditPermissions(assignment) && (
                          <Btn
                            onClick={() => setEditingAssignment(assignment.assignmentId)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Permissions
                          </Btn>
                        )}
                        {canRemoveAssignment(assignment) && (
                          <Btn
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => openRemoveModal(assignment)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove
                          </Btn>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Permissions Grid */}
              <div className="p-6">
                <h4 className="text-sm font-medium text-gray-700 mb-4 flex items-center">
                  <Shield className="h-4 w-4 mr-2" />
                  Permissions for this House
                </h4>
                
                <div className="space-y-6">
                  {/* Group permissions by category */}
                  {Object.entries(
                    assignment.permissions.reduce((acc, permission) => {
                      const category = getPermissionCategory(permission.key);
                      if (!acc[category]) acc[category] = [];
                      acc[category].push(permission);
                      return acc;
                    }, {})
                  ).map(([category, perms]) => (
                    <div key={category} className="space-y-3">
                      <h5 className="text-sm font-medium text-gray-900 border-b pb-2">
                        {category}
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {perms.map((permission) => (
                          <div
                            key={permission.key}
                            className={`flex items-start p-3 rounded-lg border ${
                              permission.assigned
                                ? 'bg-green-50 border-green-200'
                                : 'bg-gray-50 border-gray-200'
                            }`}
                          >
                            <div className="flex items-center h-5 mr-3">
                              <input
                                type="checkbox"
                                checked={permissionState[assignment.assignmentId]?.includes(permission.key) || false}
                                onChange={(e) =>
                                  handlePermissionChange(
                                    assignment.assignmentId,
                                    permission.key,
                                    e.target.checked
                                  )
                                }
                                disabled={editingAssignment !== assignment.assignmentId}
                                className={`h-4 w-4 rounded focus:ring-primary ${
                                  permission.assigned
                                    ? 'text-green-600 border-green-300'
                                    : 'text-gray-600 border-gray-300'
                                }`}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span
                                  className={`text-sm font-medium ${
                                    permission.assigned
                                      ? 'text-green-800'
                                      : 'text-gray-700'
                                  }`}
                                >
                                  {permission.key.replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </span>
                                {permission.assigned && (
                                  <Check className="h-4 w-4 text-green-500" />
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {permission.description}
                              </p>
                              {permission.grantedAt && permission.grantedBy && (
                                <p className="text-xs text-gray-400 mt-2">
                                  Granted on {new Date(permission.grantedAt).toLocaleDateString()}
                                  {permission.grantedBy.name && ` by ${permission.grantedBy.name}`}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Remove Assignment Confirmation Modal */}
      <ConfirmationModal
        isOpen={removeModalOpen}
        onClose={() => setRemoveModalOpen(false)}
        onConfirm={handleRemoveAssignment}
        title="Remove Caretaker from House"
        message={`Are you sure you want to remove ${caretaker?.name} from ${selectedAssignment?.house?.name}? This will revoke all their permissions for this house.`}
        confirmText="Remove from House"
        cancelText="Cancel"
        variant="danger"
        isLoading={isRemoving}
      />
    </div>
  );
};

export default CaretakerDetails;