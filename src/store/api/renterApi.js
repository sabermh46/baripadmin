// api/renterApi.js
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
            providesTags: ['Renter'],
        }),

        // Create renter (with file upload) - FIXED
        createRenter: builder.mutation({
            query: (formData) => ({
                url: '/renters',
                method: 'POST',
                body: formData,

            }),
            invalidatesTags: ['Renter'],
        }),

        // Update renter (with file upload) - FIXED
        updateRenter: builder.mutation({
            query: ({ id, formData }) => ({
                url: `/renters/${id}`,
                method: 'PUT',
                body: formData,
                // Do NOT set Content-Type - browser will set it automatically
            }),
            invalidatesTags: ['Renter'],
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

        // Get renters by house
        getHouseRenters: builder.query({
            query: ({ houseId, ...params }) => ({
                url: `/houses/${houseId}/renters`,
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
    useGetHouseRentersQuery,
} = renterApi;