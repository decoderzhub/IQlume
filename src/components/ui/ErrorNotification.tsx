import { AlertCircle, X, Link as LinkIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface ErrorNotificationProps {
  error: Error | null;
  onDismiss?: () => void;
  autoHide?: boolean;
  autoHideDuration?: number;
}

export function ErrorNotification({
  error,
  onDismiss,
  autoHide = false,
  autoHideDuration = 5000
}: ErrorNotificationProps) {
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (error) {
      setVisible(true);

      if (autoHide) {
        const timer = setTimeout(() => {
          handleDismiss();
        }, autoHideDuration);

        return () => clearTimeout(timer);
      }
    } else {
      setVisible(false);
    }
  }, [error, autoHide, autoHideDuration]);

  const handleDismiss = () => {
    setVisible(false);
    if (onDismiss) {
      onDismiss();
    }
  };

  const handleActionClick = () => {
    const errorWithFlags = error as any;

    if (errorWithFlags?.requiresAccountConnection) {
      navigate('/accounts');
      handleDismiss();
    } else if (errorWithFlags?.requiresLogin) {
      window.location.href = '/';
    }
  };

  if (!error || !visible) {
    return null;
  }

  const errorWithFlags = error as any;
  const showAction = errorWithFlags?.requiresAccountConnection || errorWithFlags?.requiresLogin;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md animate-slide-in-right">
      <div className="bg-red-50 border-l-4 border-red-500 rounded-lg shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-red-800 mb-1">
              {errorWithFlags?.requiresAccountConnection ? 'Account Connection Required' :
               errorWithFlags?.requiresLogin ? 'Session Expired' :
               'Error'}
            </h3>
            <p className="text-sm text-red-700 break-words">
              {error.message}
            </p>

            {showAction && (
              <button
                onClick={handleActionClick}
                className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
              >
                <LinkIcon className="w-4 h-4" />
                {errorWithFlags?.requiresAccountConnection ? 'Go to Accounts' : 'Log In'}
              </button>
            )}
          </div>

          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
