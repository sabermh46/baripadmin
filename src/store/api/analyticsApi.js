// store/api/analyticsApi.js
import { baseApi } from './baseApi';

export const analyticsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardData: builder.query({//instead of data, return data.data using this api
      query: () => ({
        url: '/analytics/dashboard',
        method: 'GET',
      }),
      transformResponse: (response) => response.data,
      providesTags: ['Analytics'],
      // Cache for 5 minutes, refetch on mount/reconnect
      keepUnusedDataFor: 300,
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