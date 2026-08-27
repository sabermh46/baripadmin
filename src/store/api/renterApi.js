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
      // 'House' too: GET /houses/{id} now carries the owner's unassigned renters, so a
      // renter created from the house page has to show up there without a manual reload.
      invalidatesTags: ['Renter', 'House'],
    }),

    // Update renter (with file upload)
    updateRenter: builder.mutation({
      query: ({ id, formData }) => {
        // POST carrying _method=PUT, not a real PUT.
        //
        // PHP only parses multipart/form-data for POST — $_POST and $_FILES are left empty
        // for every other method, so a PUT with a FormData body arrived at Laravel with no
        // fields and no files at all. update() then ran array_filter([]) → $renter->update([])
        // → a no-op, and returned 200 with the unchanged record. The modal closed, the
        // success toast fired, and nothing had been saved. Confirmed against the running API:
        // name, phone, nid and status were all unchanged after a 200.
        //
        // Laravel unwraps _method back to PUT before routing, so the route and the controller
        // are untouched; only the wire format changes.
        formData.append('_method', 'PUT');

        return {
          url: `/renters/${id}`,
          method: 'POST',
          body: formData,
          // Note: No Content-Type header for FormData
        };
      },
      invalidatesTags: (result, error, { id }) => [
        'Renter',
        { type: 'Renter', id },
        'House',
      ],
    }),

    // Delete renter
    deleteRenter: builder.mutation({
      query: (id) => ({
        url: `/renters/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Renter', 'House'],
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