///financial/profit-report

// api/renterApi.js - Updated with proper Content-Type handling
import { baseApi } from './baseApi';

export const reportApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get profit report with filters
    getProfitReport: builder.query({
      query: ({ houseId, startDate, endDate }) => ({
        url: '/financial/profit-report',
        method: 'GET',
        params: { houseId, startDate, endDate },
      }),
      providesTags: ['Report'],
    }),

    recordExpense: builder.mutation({
      query: ({ houseId, ...expenseData }) => ({
        url: `/houses/${houseId}/expenses`,
        method: 'POST',
        data: expenseData,
      }),
      invalidatesTags: ['Report'],
    }),

    getExpenses: builder.query({
      query: ({ houseOwnerId, houseId }) => ({
        url: `/houses/${houseOwnerId}/expenses`,
        method: 'GET',
        params: { houseId },
      }),
      providesTags: ['Report'],
    }),

    
  }),
});

export const { useGetProfitReportQuery, useRecordExpenseMutation, useGetExpensesQuery } = reportApi;