import { baseApi } from './baseApi';

/**
 * Customer support contact channels (WhatsApp numbers, Facebook pages).
 *
 * getSupportChannels is what every signed-in user's support page reads: active channels
 * only, with the link to open. It goes through baseApi like everything else, so it is
 * saved for offline use too: a user who has opened Support once still sees the numbers with
 * no connection, and can tap one the moment they have signal.
 *
 * The admin endpoints manage the full list. Every write invalidates both lists, so the
 * support page reflects a change straight away.
 */
export const supportApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSupportChannels: builder.query({
      query: () => ({ url: '/support/channels', method: 'GET' }),
      transformResponse: (res) => res?.data ?? [],
      providesTags: [{ type: 'SupportChannel', id: 'PUBLIC' }],
    }),

    getAdminSupportChannels: builder.query({
      query: () => ({ url: '/admin/support/channels', method: 'GET' }),
      transformResponse: (res) => res?.data ?? [],
      providesTags: [{ type: 'SupportChannel', id: 'ADMIN' }],
    }),

    createSupportChannel: builder.mutation({
      query: (data) => ({ url: '/admin/support/channels', method: 'POST', data }),
      invalidatesTags: [{ type: 'SupportChannel', id: 'PUBLIC' }, { type: 'SupportChannel', id: 'ADMIN' }],
    }),

    updateSupportChannel: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/admin/support/channels/${id}`, method: 'PUT', data }),
      invalidatesTags: [{ type: 'SupportChannel', id: 'PUBLIC' }, { type: 'SupportChannel', id: 'ADMIN' }],
    }),

    deleteSupportChannel: builder.mutation({
      query: (id) => ({ url: `/admin/support/channels/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'SupportChannel', id: 'PUBLIC' }, { type: 'SupportChannel', id: 'ADMIN' }],
    }),
  }),
});

export const {
  useGetSupportChannelsQuery,
  useGetAdminSupportChannelsQuery,
  useCreateSupportChannelMutation,
  useUpdateSupportChannelMutation,
  useDeleteSupportChannelMutation,
} = supportApi;
