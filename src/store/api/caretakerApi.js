// store/api/caretakerApi.js

import { baseApi } from "./baseApi";


export const caretakerApi = baseApi.injectEndpoints({

  endpoints: (builder) => ({
    // Get all caretakers
    getCaretakers: builder.query({
      query: (params = {}) => ({
        url: '/caretakers',
        params,
      }),
      providesTags: ['Caretaker'],
    }), //useGetCaretakersQuery

    // Get caretaker details with permissions
    getCaretakerDetails: builder.query({
      query: (id) => `/caretakers/${id}/details`,
      providesTags: (result, error, id) => [
        { type: 'Caretaker', id },
        'CaretakerAssignment',
      ],
    }),

    // Update assignment permissions
    updateAssignmentPermissions: builder.mutation({
      query: ({ assignmentId, permissions }) => ({
        url: `/caretakers/assignments/${assignmentId}/permissions`,
        method: 'PUT',
        data: { permissions },
      }),
      invalidatesTags: ['CaretakerAssignment'],
    }),

    // Assign caretaker to house
    assignCaretakerToHouse: builder.mutation({
      query: ({ caretakerId, ...body }) => ({
        url: `/caretakers/${caretakerId}/assign`,
        method: 'POST',
        data: body,
      }),
      invalidatesTags: ['Caretaker', 'CaretakerAssignment'],
    }),

    // Remove caretaker from house
    removeCaretakerFromHouse: builder.mutation({
      query: (assignmentId) => ({
        url: `/caretakers/assignments/${assignmentId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Caretaker', 'CaretakerAssignment'],
    }),

    // Delete caretaker
    deleteCaretaker: builder.mutation({
      query: (id) => ({
        url: `/caretakers/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Caretaker'],
    }),
  }),
});

export const {
  useGetCaretakersQuery,
  useGetCaretakerDetailsQuery,
  useUpdateAssignmentPermissionsMutation,
  useAssignCaretakerToHouseMutation,
  useRemoveCaretakerFromHouseMutation,
  useDeleteCaretakerMutation,
} = caretakerApi;