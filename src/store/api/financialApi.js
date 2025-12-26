// api/financialApi.js
import { baseApi } from './baseApi';

export const financialApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get financial dashboard
    getFinancialDashboard: builder.query({
      query: (params) => ({
        url: '/financial/dashboard',
        method: 'GET',
        params,
      }),
      providesTags: ['Financial'],
    }),

    // Generate monthly rent invoices
    generateRentInvoices: builder.mutation({
      query: (data) => ({
        url: '/financial/generate-invoices',
        method: 'POST',
        data,
      }),
      invalidatesTags: ['Payment', 'Financial'],
    }),

    // Record expense
    recordExpense: builder.mutation({
      query: (data) => ({
        url: '/houses/:houseId/expenses',
        method: 'POST',
        data,
      }),
      invalidatesTags: ['Expense', 'Financial'],
    }),

    // Get expenses
    getExpenses: builder.query({
      query: ({ houseId, ...params }) => ({
        url: `/houses/${houseId}/expenses`,
        method: 'GET',
        params,
      }),
      providesTags: ['Expense'],
    }),

    // Record app fee payment
    recordAppFeePayment: builder.mutation({
      query: (data) => ({
        url: '/payments/app-fee',
        method: 'POST',
        data,
      }),
      invalidatesTags: ['AppFee', 'Financial'],
    }),

    // Get app fee payments
    getAppFeePayments: builder.query({
      query: (params) => ({
        url: '/payments/app-fee',
        method: 'GET',
        params,
      }),
      providesTags: ['AppFee'],
    }),

    // Get rent payments
    getRentPayments: builder.query({
      query: (params) => ({
        url: '/payments/rent',
        method: 'GET',
        params,
      }),
      providesTags: ['Payment'],
    }),

    // Get financial reports
    getFinancialReports: builder.query({
      query: (params) => ({
        url: '/financial/reports',
        method: 'GET',
        params,
      }),
      providesTags: ['Report'],
    }),

    // Send bulk rent reminders
    sendBulkRentReminders: builder.mutation({
      query: (data) => ({
        url: '/notifications/rent-reminders',
        method: 'POST',
        data,
      }),
    }),

    // Get upcoming payments
    getUpcomingPayments: builder.query({
      query: (params) => ({
        url: '/financial/upcoming-payments',
        method: 'GET',
        params,
      }),
    }),
  }),
});

export const {
  useGetFinancialDashboardQuery,
  useGenerateRentInvoicesMutation,
  useRecordExpenseMutation,
  useGetExpensesQuery,
  useRecordAppFeePaymentMutation,
  useGetAppFeePaymentsQuery,
  useGetRentPaymentsQuery,
  useGetFinancialReportsQuery,
  useSendBulkRentRemindersMutation,
  useGetUpcomingPaymentsQuery,
} = financialApi;