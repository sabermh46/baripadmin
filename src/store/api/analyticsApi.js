// store/api/analyticsApi.js
import { baseApi } from './baseApi';

export const analyticsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Read live. The server no longer caches this, and neither does the client beyond what
     * it takes to survive a remount.
     *
     * The app-wide default is refetchOnMountOrArgChange: 120 — fine for a list of houses,
     * wrong for a screen that reports whether mail is going out and how many jobs failed.
     * Opening the dashboard now always fetches, and it re-fetches on focus, because the
     * common pattern is exactly the one the old settings handled worst: leave the tab open,
     * come back to it, and trust what it says.
     */
    getDashboardData: builder.query({
      query: () => ({
        url: '/analytics/dashboard',
        method: 'GET',
      }),
      transformResponse: (response) => response.data,
      providesTags: ['Analytics'],
      // 30s is long enough that a remount within a navigation does not re-hit the API, and
      // short enough that nothing on the page is ever meaningfully old.
      keepUnusedDataFor: 30,
    }),

    getWorkerStats: builder.query({
      query: () => ({
        url: '/analytics/workers/stats',
        method: 'GET',
      }),
      providesTags: ['WorkerStats'],
        // Cache for 10 minutes, refetch on mount/reconnect
        keepUnusedDataFor: 600,
    }),
    clearAnalyticsCache: builder.mutation({
      query: (userId = null) => ({
        url: '/analytics/cache/clear',
        method: 'POST',
        body: { userId }
        }),
      invalidatesTags: ['Analytics']
    })
  })
});

export const { 
  useGetDashboardDataQuery,
  useGetWorkerStatsQuery,
  useClearAnalyticsCacheMutation
} = analyticsApi;