// components/common/Modal.jsx
import { Fragment, useRef, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X } from 'lucide-react';

const Modal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  size = 'md',
  showCloseButton = true,
  initialFocusRef,
  footer,
  showBackdrop = true,
  className = '',
}) => {
  const closeButtonRef = useRef(null);

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4',
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-100"
        onClose={onClose}
        initialFocus={initialFocusRef || closeButtonRef}
      >
        {/* Backdrop */}
        {showBackdrop && (
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/35" />
          </Transition.Child>
        )}

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel
                className={`${sizeClasses[size]} w-full transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-xl transition-all ${className}`}
              >
                {/* Header */}
                {(title || subtitle || showCloseButton) && (
                  <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div className="flex-1">
                      {title && (
                        <Dialog.Title
                          as="h3"
                          className="text-xl font-semibold leading-6 text-gray-900"
                        >
                          {title}
                        </Dialog.Title>
                      )}
                      {subtitle && (
                        <p className="mt-1 text-sm text-gray-500">
                          {subtitle}
                        </p>
                      )}
                    </div>
                    {showCloseButton && (
                      <button
                        ref={closeButtonRef}
                        type="button"
                        className="ml-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
                        onClick={onClose}
                        aria-label="Close"
                      >
                        <X className="h-5 w-5 text-gray-500" />
                      </button>
                    )}
                  </div>
                )}

                {/* Content */}
                <div className="p-6">{children}</div>

                {/* Footer */}
                {footer && (
                  <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                    {footer}
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

// Helper hook for modal state management
export const useModal = (initialState = false) => {
  const [isOpen, setIsOpen] = useState(initialState);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  const toggle = () => setIsOpen(!isOpen);

  return {
    isOpen,
    open,
    close,
    toggle,
  };
};

export default Modal;