// components/common/ConfirmationModal.jsx
import Modal from './Modal';
import { AlertTriangle, Info, CheckCircle, AlertCircle } from 'lucide-react';

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'warning', // 'warning', 'danger', 'info', 'success'
  isLoading = false,
}) => {
  const variantConfig = {
    warning: {
      icon: AlertTriangle,
      iconColor: 'text-yellow-500',
      confirmButtonClass: 'bg-yellow-600 hover:bg-yellow-700',
    },
    danger: {
      icon: AlertCircle,
      iconColor: 'text-red-500',
      confirmButtonClass: 'bg-red-600 hover:bg-red-700',
    },
    info: {
      icon: Info,
      iconColor: 'text-blue-500',
      confirmButtonClass: 'bg-blue-600 hover:bg-blue-700',
    },
    success: {
      icon: CheckCircle,
      iconColor: 'text-green-500',
      confirmButtonClass: 'bg-green-600 hover:bg-green-700',
    },
  };

  const { icon: Icon, iconColor, confirmButtonClass } = variantConfig[variant];

  const footer = (
    <div className="flex justify-end space-x-3">
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
        disabled={isLoading}
      >
        {cancelText}
      </button>
      <button
        type="button"
        onClick={onConfirm}
        className={`px-4 py-2 text-white rounded-lg transition ${confirmButtonClass}`}
        disabled={isLoading}
      >
        {isLoading ? 'Processing...' : confirmText}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="md"
      footer={footer}
    >
      <div className="flex items-start">
        <div className={`shrink-0 ${iconColor}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="ml-3">
          <p className="text-gray-700">{message}</p>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmationModal;