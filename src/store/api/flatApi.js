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
      query: ({ flatId, renterId }) => ({
        url: `/flats/${flatId}/renter`,
        method: 'POST',
        data: { renter_id: renterId },
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

    // Get available renters for a house
    getAvailableRenters: builder.query({
      query: (houseId) => ({
        url: `/houses/${houseId}/available-renters`,
        method: 'GET',
      }),
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
  useGetAvailableRentersQuery,
  useSearchFlatsQuery,
  useGetFlatFinancialSummaryQuery,
  useSendRentReminderMutation,
} = flatApi;