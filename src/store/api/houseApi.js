import { baseApi } from './baseApi';

export const houseApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Create a new house
    createHouse: builder.mutation({
      query: (houseData) => ({
        url: '/houses',
        method: 'POST',
        data: houseData,
      }),
      invalidatesTags: ['Houses', 'HouseStats'],
    }),

    // Get all houses with pagination
    getHouses: builder.query({
      query: ({ page = 1, limit = 20, search, ownerId, sortBy = 'createdAt', sortOrder = 'desc' }) => ({
        url: '/houses',
        method: 'GET',
        params: { page, limit, search, ownerId, sortBy, sortOrder },
      }),
      providesTags: ['Houses'],
    }),

    // Get house details
    getHouseDetails: builder.query({
      query: (id) => ({
        url: `/houses/${id}`,
        method: 'GET',
      }),
      providesTags: (result, error, id) => [{ type: 'House', id }],
    }),

    // Update house
    updateHouse: builder.mutation({
      query: ({ id, ...houseData }) => ({
        url: `/houses/${id}`,
        method: 'PUT',
        data: houseData,
      }),
      invalidatesTags: (result, error, { id }) => [
        'Houses', 
        { type: 'House', id },
        'HouseStats'
      ],
    }),

    // Delete house
    deleteHouse: builder.mutation({
      query: (id) => ({
        url: `/houses/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Houses', 'HouseStats'],
    }),

    // Get house statistics
    getHouseStats: builder.query({
      query: () => ({
        url: '/houses/stats',
        method: 'GET',
      }),
      providesTags: ['HouseStats'],
    }),

    // Get managed house owners (for staff)
    getManagedOwners: builder.query({
      query: () => ({
        url: '/houses/owners/managed',
        method: 'GET',
      }),
      providesTags: ['ManagedOwners'],
    }),

    // Get house flats
    getHouseFlats: builder.query({
      query: ({ id, page = 1, limit = 20 }) => ({
        url: `/houses/${id}/flats`,
        method: 'GET',
        params: { page, limit },
      }),
      providesTags: (result, error, { id }) => [{ type: 'HouseFlats', id }],
    }),

    // Get house caretakers
    getHouseCaretakers: builder.query({
      query: (id) => ({
        url: `/houses/${id}/caretakers`,
        method: 'GET',
      }),
      providesTags: (result, error, id) => [{ type: 'HouseCaretakers', id }],
    }),

    // Search houses by address
    searchHouses: builder.query({
      query: (searchTerm) => ({
        url: '/houses',
        method: 'GET',
        params: { search: searchTerm, limit: 10 },
      }),
      transformResponse: (response) => response.data,
    }),
  }),
});

export const {
  useCreateHouseMutation,
  useGetHousesQuery,
  useLazyGetHousesQuery,
  useGetHouseDetailsQuery,
  useLazyGetHouseDetailsQuery,
  useUpdateHouseMutation,
  useDeleteHouseMutation,
  useGetHouseStatsQuery,
  useGetManagedOwnersQuery,
  useGetHouseFlatsQuery,
  useLazyGetHouseFlatsQuery,
  useGetHouseCaretakersQuery,
  useSearchHousesQuery,
  useLazySearchHousesQuery,
} = houseApi;