// api/flatApi.js
import { baseApi } from './baseApi';

export const flatApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get flats with filters
    getFlats: builder.query({
      query: ({ houseId, ...params }) => ({
        url: `/houses/${houseId}/flats`,
        method: 'GET',
        params,
      }),
      providesTags: ['Flat'],
    }),

    // Get flat details with payment history
    getFlatDetails: builder.query({
      query: (id) => ({
        url: `/flats/${id}`,
        method: 'GET',
      }),
      providesTags: ['Flat'],
    }),

    // Create flat
    createFlat: builder.mutation({
      query: ({ houseId, ...data }) => ({
        url: `/houses/${houseId}/flats`,
        method: 'POST',
        data,
      }),
      invalidatesTags: ['Flat'],
    }),

    // Update flat
    updateFlat: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/flats/${id}`,
        method: 'PUT',
        data,
      }),
      invalidatesTags: ['Flat'],
    }),

    // Delete flat
    deleteFlat: builder.mutation({
      query: (id) => ({
        url: `/flats/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Flat'],
    }),

    // Assign renter to flat
    assignRenter: builder.mutation({
      query: ({ flatId, renterId, amenities, next_payment_date, advance_payments }) => ({
        url: `/flats/${flatId}/renter`,
        method: 'POST',
        data: { renter_id: renterId, amenities, next_payment_date, advance_payments },
      }),
      invalidatesTags: ['Flat'],
    }),

    // Remove renter from flat
    removeRenter: builder.mutation({
      query: (flatId) => ({
        url: `/flats/${flatId}/renter`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Flat'],
    }),

    // Get flat payment history
    getFlatPayments: builder.query({
      query: ({ flatId, ...params }) => ({
        url: `/flats/${flatId}/payments`,
        method: 'GET',
        params,
      }),
      providesTags: ['Payment'],
    }),

    // Record rent payment
    recordPayment: builder.mutation({
      query: ({ flatId, ...data }) => ({
        url: `/flats/${flatId}/payments`,
        method: 'POST',
        data,
      }),
      invalidatesTags: ['Payment', 'Flat'],
    }),

    // Search flats
    searchFlats: builder.query({
      query: (params) => ({
        url: `/flats/search`,
        method: 'GET',
        params,
      }),
    }),

    // Get flat financial summary
    getFlatFinancialSummary: builder.query({
      query: ({ flatId, ...params }) => ({
        url: `/flats/${flatId}/financial-summary`,
        method: 'GET',
        params,
      }),
    }),

    // Send rent reminder
    sendRentReminder: builder.mutation({
      query: (data) => ({
        url: `/notifications/rent-reminders`,
        method: 'POST',
        data,
      }),
    }),
    applyAdvancePayment: builder.mutation({
      query: ({ flatId, advance_payment_id, rent_payment_id, amount }) => ({
        url: `/flats/${flatId}/apply-advance`,
        method: 'POST',
        data: { advance_payment_id, rent_payment_id, amount },
      }),
      invalidatesTags: ['Payment', 'Flat'],
    }),
    getFlatAdvancePayments: builder.query({
      query: ({flatId}) => ({
        url: `/flats/${flatId}/advance-payments`,
        method: 'GET',
      }),
      providesTags: ['AdvancePayment'],
    }),

    ///GET: /financial/payment-receipts
    //const { flat_id } = req.query;
    getPaymentReceipts: builder.query({
      query: ({flatId}) => ({
        url: `/financial/payment-receipts`,
        method: 'GET',
        params: { flat_id: flatId },
      }),
      providesTags: ['PaymentReceipt'],
    }),

    //POST: /financial/resend-payment-receipt'
    // const { rent_payment_id } = req.body;
    resendPaymentReceipt: builder.mutation({
      query: ({rentPaymentId}) => ({
        url: `/financial/resend-payment-receipt`,
        method: 'POST',
        data: { rent_payment_id: rentPaymentId },
      }),
      invalidatesTags: ['PaymentReceipt'],
    }),

  }),
});

export const {
  useGetFlatsQuery,
  useGetFlatDetailsQuery,
  useCreateFlatMutation,
  useUpdateFlatMutation,
  useDeleteFlatMutation,
  useAssignRenterMutation,
  useRemoveRenterMutation,
  useGetFlatPaymentsQuery,
  useRecordPaymentMutation,
  useSearchFlatsQuery,
  useGetFlatFinancialSummaryQuery,
  useSendRentReminderMutation,
  useApplyAdvancePaymentMutation,
  useGetFlatAdvancePaymentsQuery,
  useGetPaymentReceiptsQuery,
  useResendPaymentReceiptMutation,
} = flatApi;