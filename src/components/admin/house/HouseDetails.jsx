// src/components/house/HouseDetails.jsx
import { useParams, useNavigate } from 'react-router-dom';
import {
  Home, Users, MapPin, Calendar, Edit, Trash2, ArrowLeft,
  Layers, Building, Phone, Mail, AlertCircle, CheckCircle,
  ChevronRight, DollarSign, Square, Bed, Bath
} from 'lucide-react';
import { useGetHouseDetailsQuery, useDeleteHouseMutation } from '../../../store/api/houseApi';
import Btn from '../../common/Button';
import { useAuth } from '../../../hooks';

const HouseDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data, isLoading, error } = useGetHouseDetailsQuery(id);
  const [deleteHouse] = useDeleteHouseMutation();

  const house = data?.data;

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete "${house?.address}"? This action cannot be undone.`)) {
      try {
        await deleteHouse(id).unwrap();
        navigate('/houses');
      } catch (error) {
        console.error('Delete failed:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-subdued">Loading property details...</p>
        </div>
      </div>
    );
  }

  if (error || !house) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <h3 className="text-lg font-medium text-red-800">Property Not Found</h3>
          </div>
          <p className="text-red-700 mb-4">The property you're looking for doesn't exist or you don't have permission to view it.</p>
          <button
            onClick={() => navigate('/houses')}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Properties
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/houses')}
            className="p-2 hover:bg-surface rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-text" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-text">{house.address}</h1>
            <p className="text-subdued flex items-center gap-2">
              <Home className="w-4 h-4" />
              Property Details
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/houses/${id}/edit`)}
            className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Edit
          </button>
          {user?.isWebOwner && (
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Status Banner */}
      <div className={`p-4 rounded-xl ${house.active ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
        <div className="flex items-center gap-3">
          {house.active ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-yellow-600" />
          )}
          <div>
            <p className="font-medium text-text">
              {house.active ? 'Active Property' : 'Inactive Property'}
            </p>
            <p className="text-sm text-subdued">
              {house.active 
                ? 'This property is visible to all users and can receive applications.'
                : 'This property is hidden and requires approval to become active.'}
            </p>
          </div>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Property Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Property Overview */}
          <div className="bg-surface border border-surface rounded-xl p-6">
            <h2 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
              <Building className="w-5 h-5" />
              Property Overview
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-subdued">Address</p>
                  <p className="font-medium text-text">{house.address}</p>
                </div>
                <div>
                  <p className="text-sm text-subdued">Location Details</p>
                  <p className="font-medium text-text">{house.metadata?.locationDetails || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-subdued">Property ID</p>
                  <p className="font-medium text-text font-mono text-sm">{house.uuid}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-subdued">Total Flats</p>
                  <p className="font-medium text-text flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    {house.flatCount}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-subdued">Created</p>
                  <p className="font-medium text-text flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {/* {formatDate(house.createdAt)} */}
                    {new Date(house.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-subdued">Last Updated</p>
                  <p className="font-medium text-text flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {/* {formatDate(house.updatedAt || house.createdAt)} */}
                    {new Date(house.updatedAt || house.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          {house.metadata?.description && (
            <div className="bg-surface border border-surface rounded-xl p-6">
              <h2 className="text-lg font-semibold text-text mb-4">Description</h2>
              <p className="text-text leading-relaxed">{house.metadata.description}</p>
            </div>
          )}

          {/* Amenities */}
          {house.metadata?.amenities?.length > 0 && (
            <div className="bg-surface border border-surface rounded-xl p-6">
              <h2 className="text-lg font-semibold text-text mb-4">Amenities</h2>
              <div className="flex flex-wrap gap-2">
                {house.metadata.amenities.map((amenity, index) => (
                  <span
                    key={index}
                    className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm font-medium"
                  >
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Owner & Stats */}
        <div className="space-y-6">
          {/* Owner Info */}
          <div className="bg-surface border border-surface rounded-xl p-6">
            <h2 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Property Owner
            </h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-text">{house.owner?.name}</p>
                  <p className="text-sm text-subdued">{house.owner?.role?.slug?.replace('_', ' ')}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-text">
                  <Mail className="w-4 h-4" />
                  <span className="text-sm">{house.owner?.email}</span>
                </div>
                {house.owner?.phone && (
                  <div className="flex items-center gap-2 text-text">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">{house.owner.phone}</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => navigate(`/users/${house.owner?.id}`)}
                className="w-full mt-4 px-4 py-2 border border-surface text-text rounded-lg hover:bg-surface transition-colors flex items-center justify-between"
              >
                <span>View Owner Profile</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Statistics */}
          <div className="bg-surface border border-surface rounded-xl p-6">
            <h2 className="text-lg font-semibold text-text mb-4">Statistics</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                    <Layers className="w-4 h-4" />
                  </div>
                  <span className="text-text">Total Flats</span>
                </div>
                <span className="font-bold text-text">{house.stats?.flats || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                    <Users className="w-4 h-4" />
                  </div>
                  <span className="text-text">Caretakers</span>
                </div>
                <span className="font-bold text-text">{house.stats?.caretakers || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                    <Square className="w-4 h-4" />
                  </div>
                  <span className="text-text">Notices</span>
                </div>
                <span className="font-bold text-text">{house.stats?.notices || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-yellow-100 text-yellow-600 rounded-lg">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <span className="text-text">Rent Collected</span>
                </div>
                <span className="font-bold text-text">$0</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-surface border border-surface rounded-xl p-6">
            <h2 className="text-lg font-semibold text-text mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <Btn
                onClick={() => navigate(`/houses/${id}/flats`)}
                className="w-full px-4 py-3 text-left rounded-lg hover:bg-surface/50 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-text">Manage Flats</p>
                    <p className="text-xs text-subdued">View and edit flats</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-subdued" />
              </Btn>
              <Btn
                onClick={() => navigate(`/houses/${id}/caretakers`)}
                className="w-full px-4 py-3 text-left rounded-lg hover:bg-surface/50 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-text">Manage Caretakers</p>
                    <p className="text-xs text-subdued">Assign and manage caretakers</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-subdued" />
              </Btn>
              <Btn
                onClick={() => navigate(`/houses/${id}/notices`)}
                className="w-full px-4 py-3 text-left rounded-lg hover:bg-surface/50 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-text">View Notices</p>
                    <p className="text-xs text-subdued">Check property notices</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-subdued" />
              </Btn>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HouseDetails;