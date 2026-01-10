// store/api/houseOwnerAnalytics.js
import { baseApi } from './baseApi';

export const houseOwnerAnalyticsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getHouseOwnerDashboardData: builder.query({
      query: () => ({
        url: '/house-owner-analytics/dashboard',
        method: 'GET',
      }),
      transformResponse: (response) => response.data,
        providesTags: ['HouseOwnerAnalytics'],
        // Cache for 5 minutes, refetch on mount/reconnect
        keepUnusedDataFor: 300,
    }),

    // Refresh house owner dashboard data
    refreshDashboardData: builder.mutation({
      query: () => ({
        url: '/house-owner-analytics/refresh-dashboard',
        method: 'POST',
      }),
      invalidatesTags: ['HouseOwnerAnalytics'],
    }),
  })
});

export const { 
  useGetHouseOwnerDashboardDataQuery,
    useRefreshDashboardDataMutation
} = houseOwnerAnalyticsApi;