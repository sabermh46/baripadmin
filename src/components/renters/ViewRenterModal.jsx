// components/renter/ViewRenterModal.jsx
import React from 'react';
import { useGetRenterDetailsQuery } from '../../store/api/renterApi';
import { 
  User, 
  Phone, 
  Mail, 
  FileText, 
  Home,
  Calendar,
  Clock,
  Download,
  ChevronRight
} from 'lucide-react';
import Modal from '../common/Modal';
import { Link } from 'react-router-dom';

const ViewRenterModal = ({ isOpen, onClose, renterId }) => {
  const { data, isLoading } = useGetRenterDetailsQuery(renterId);

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    
    
    // Use the proxy endpoint
    return `${import.meta.env.VITE_APP_API_URL}${imagePath}`;
  };

  const renter = data?.data?.renter;
  const flats = data?.data?.flats || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Renter Details"
      size="lg"
    >
      {isLoading ? (
        <div className="py-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading renter details...</p>
        </div>
      ) : renter ? (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start space-x-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">{renter.name}</h2>
              <div className="flex items-center space-x-4 mt-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  renter.status === 'active' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {renter.status?.charAt(0).toUpperCase() + renter.status?.slice(1)}
                </span>
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar className="h-3 w-3 mr-1" />
                  Joined: {new Date(renter.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-3">Contact Information</h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <Phone className="h-4 w-4 text-gray-400 mr-2" />
                  <div>
                    <p className="text-sm text-gray-900">{renter.phone}</p>
                    <p className="text-xs text-gray-500">Primary Phone</p>
                  </div>
                </div>
                {renter.alternativePhone && (
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 text-gray-400 mr-2" />
                    <div>
                      <p className="text-sm text-gray-900">{renter.alternativePhone}</p>
                      <p className="text-xs text-gray-500">Alternative Phone</p>
                    </div>
                  </div>
                )}
                {renter.email && (
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 text-gray-400 mr-2" />
                    <div>
                      <p className="text-sm text-gray-900">{renter.email}</p>
                      <p className="text-xs text-gray-500">Email</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* NID Information */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-3">NID Information</h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <FileText className="h-4 w-4 text-gray-400 mr-2" />
                  <div>
                    <p className="text-sm text-gray-900">{renter.nid || 'Not provided'}</p>
                    <p className="text-xs text-gray-500">National ID Number</p>
                  </div>
                </div>
                
                {/* NID Images */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renter.nidFrontImageUrl && (
                  <div className="border rounded-lg p-3 bg-white">
                    <p className="text-xs text-gray-500 mb-2">NID Front Image</p>
                    <div className="relative">
                      <img
                        src={getImageUrl(renter.nidFrontImageUrl)}
                        alt="NID Front"
                        className="w-full h-48 object-contain rounded"
                        onError={(e) => {
                          e.target.onerror = null;
                        }}
                      />
                      <a 
                        href={getImageUrl(renter.nidFrontImageUrl)}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute bottom-2 right-2 p-2 bg-white rounded-full shadow hover:bg-gray-100"
                      >
                        <Download className="h-4 w-4 text-gray-600" />
                      </a>
                    </div>
                  </div>
                )}
                
                {renter.nidBackImageUrl && (
                  <div className="border rounded-lg p-3 bg-white">
                    <p className="text-xs text-gray-500 mb-2">NID Back Image</p>
                    <div className="relative">
                      <img
                        src={getImageUrl(renter.nidBackImageUrl)}
                        alt="NID Back"
                        className="w-full h-48 object-contain rounded"
                        onError={(e) => {
                          e.target.onerror = null;
                        }}
                      />
                      <a 
                        href={getImageUrl(renter.nidBackImageUrl)}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute bottom-2 right-2 p-2 bg-white rounded-full shadow hover:bg-gray-100"
                      >
                        <Download className="h-4 w-4 text-gray-600" />
                      </a>
                    </div>
                  </div>
                )}
                </div>
              </div>
            </div>
          </div>

          {/* Assigned Flats */}
          {flats.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                <Home className="h-4 w-4 mr-2" />
                Assigned Flats ({flats.length})
              </h3>
              <div className="space-y-2">
                {flats.map((flat) => (
                  <div key={flat.id} className="bg-white p-3 rounded border">
                    <div className="flex justify-between items-center gap-4 flex-wrap">
                      <div>
                        <p className="font-medium text-gray-900">Flat #{flat.number}</p>
                        <p className="text-sm text-gray-500">{flat.houseName}</p>
                      </div>
                      <Link to={'/flats/' + flat.id} className='mr-auto bg-primary p-2 rounded-full text-white'>
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {flat.houseAddress}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          {renter.metadata && typeof renter.metadata === 'object' && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-3">Additional Information</h3>
              <div className="space-y-2 text-sm">
                {renter.metadata.creatorName && (
                  <p><span className="text-gray-500">Created by:</span> {renter.metadata.creatorName}</p>
                )}
                {renter.metadata.lastUpdatedBy && (
                  <p><span className="text-gray-500">Last updated by:</span> {renter.metadata.lastUpdatedBy}</p>
                )}
                {renter.metadata.lastUpdatedAt && (
                  <p><span className="text-gray-500">Last updated:</span> {new Date(renter.metadata.lastUpdatedAt).toLocaleString()}</p>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="py-8 text-center text-gray-500">
          <p>Renter not found</p>
        </div>
      )}
    </Modal>
  );
};

export default ViewRenterModal;