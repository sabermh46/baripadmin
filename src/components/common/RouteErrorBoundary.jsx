import React from 'react';
import { WifiOff, AlertTriangle, RefreshCw } from 'lucide-react';
import { withTranslation } from 'react-i18next';
import { isChunkLoadError } from '../../utils/lazyWithRetry';

/**
 * Keeps a failure inside the page that failed.
 *
 * The app had no error boundary anywhere. A render error, or a lazy page whose code could
 * not load (offline, a flaky connection, a tab that outlived a deploy), therefore unmounted
 * the entire tree: header, sidebar and all. On Android that showed as the screen going
 * white on a menu tap.
 *
 * Two variants:
 *   - `variant="route"` sits inside Layout around the page outlet. The header and sidebar
 *     stay mounted and working, so the user can go to another page (anything already opened
 *     on this device is cached) while this one shows why it could not open. Layout keys it
 *     by pathname, so navigating away clears the error.
 *   - `variant="app"` wraps the whole app as the last line of defence: a full-page message
 *     with a reload button instead of a blank screen.
 *
 * Retry reloads the page. React.lazy remembers a failed import for good, so re-rendering
 * alone would only throw the same error again, while a reload starts clean (and works
 * offline, because the service worker serves the shell and every precached chunk).
 */
class RouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, offline: typeof navigator !== 'undefined' && navigator.onLine === false };
    this.handleOnline = () => this.setState({ offline: false });
    this.handleOffline = () => this.setState({ offline: true });
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[RouteErrorBoundary]', error, info?.componentStack);
  }

  componentDidMount() {
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  componentWillUnmount() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }

  render() {
    const { error, offline } = this.state;
    const { children, variant = 'route', t } = this.props;

    if (!error) return children;

    const chunk = isChunkLoadError(error);
    const Icon = offline ? WifiOff : AlertTriangle;
    const title = offline
      ? t('offline_page_title', "You're offline")
      : chunk
        ? t('page_load_failed_title', "This page couldn't load")
        : t('page_error_title', 'Something went wrong on this page');
    const body = offline
      ? t('offline_page_body', "This page hasn't been opened on this device yet, so it needs a connection the first time. Pages you've already visited still work.")
      : chunk
        ? t('page_load_failed_body', 'The app may have just been updated. Reloading will fetch the latest version.')
        : t('page_error_body', 'Try again. If it keeps happening, reload the app.');

    const panel = (
      <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
        <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${offline ? 'bg-slate-100 text-slate-500' : 'bg-amber-50 text-amber-600'}`}>
          <Icon className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-base font-semibold text-slate-800">{title}</h2>
        <p className="mt-1.5 text-sm text-slate-500">{body}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
          disabled={offline && chunk}
        >
          <RefreshCw className="h-4 w-4" />
          {offline && chunk ? t('waiting_for_connection', 'Waiting for connection…') : t('reload', 'Reload')}
        </button>
      </div>
    );

    if (variant === 'app') {
      return <div className="flex min-h-dvh items-center justify-center bg-background p-4">{panel}</div>;
    }

    return <div className="py-8">{panel}</div>;
  }
}

const TranslatedRouteErrorBoundary = withTranslation()(RouteErrorBoundary);

export default TranslatedRouteErrorBoundary;
