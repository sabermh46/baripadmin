// api/renterApi.js - Updated with proper Content-Type handling
import { baseApi } from './baseApi';

export const renterApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get renters with filters
    getRenters: builder.query({
      query: (params) => ({
        url: '/renters',
        method: 'GET',
        params,
      }),
      providesTags: ['Renter'],
    }),

    // Get renter details
    getRenterDetails: builder.query({
      query: (id) => ({
        url: `/renters/${id}`,
        method: 'GET',
      }),
      providesTags: (result, error, id) => [{ type: 'Renter', id }],
    }),

    // Create renter (with file upload)
    createRenter: builder.mutation({
      query: (formData) => ({
        url: '/renters',
        method: 'POST',
        body: formData,
        // Note: No Content-Type header for FormData - browser sets it automatically with boundary
      }),
      invalidatesTags: ['Renter'],
    }),

    // Update renter (with file upload)
    updateRenter: builder.mutation({
      query: ({ id, formData }) => ({
        url: `/renters/${id}`,
        method: 'PUT',
        body: formData,
        // Note: No Content-Type header for FormData
      }),
      invalidatesTags: (result, error, { id }) => [
        'Renter',
        { type: 'Renter', id }
      ],
    }),

    // Delete renter
    deleteRenter: builder.mutation({
      query: (id) => ({
        url: `/renters/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Renter'],
    }),

    // Get available renters
    getAvailableRenters: builder.query({
      query: (params) => ({
        url: '/renters/available',
        method: 'GET',
        params,
      }),
      providesTags: ['Renter'],
    }),
  }),
});

export const {
  useGetRentersQuery,
  useGetRenterDetailsQuery,
  useCreateRenterMutation,
  useUpdateRenterMutation,
  useDeleteRenterMutation,
  useGetAvailableRentersQuery,
} = renterApi;