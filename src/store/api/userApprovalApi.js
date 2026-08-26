import { baseApi } from './baseApi';

/**
 * Caretaker accounts are created by admins only, so a house owner files a request instead.
 *
 * Live, like the app-fee endpoints: this is a queue two different people watch, and an admin
 * being told a request arrived and then opening a stale list is the exact complaint that
 * took the app-fee screens off the shared cache policy.
 */
const LIVE = {
  keepUnusedDataFor: 0,
  refetchOnMountOrArgChange: true,
  refetchOnFocus: true,
  refetchOnReconnect: true,
};

export const userApprovalApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUserApprovals: builder.query({
      ...LIVE,
      query: (params = {}) => ({
        url: '/user-approvals',
        method: 'GET',
        params: { status: params.status },
      }),
      providesTags: [{ type: 'UserApproval', id: 'LIST' }],
    }),

    createUserApproval: builder.mutation({
      query: (body) => ({ url: '/user-approvals', method: 'POST', data: body }),
      invalidatesTags: [{ type: 'UserApproval', id: 'LIST' }],
    }),

    approveUserApproval: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/user-approvals/${id}/approve`, method: 'POST', data: body }),
      // Approving mints a caretaker account and assigns a house, so everything that lists
      // caretakers is now wrong until it refetches.
      invalidatesTags: [
        { type: 'UserApproval', id: 'LIST' },
        'Caretaker', 'CaretakerAssignment', 'HouseCaretakers', 'ManagedUsers', 'User',
      ],
    }),

    rejectUserApproval: builder.mutation({
      query: ({ id, reason }) => ({ url: `/user-approvals/${id}/reject`, method: 'POST', data: { reason } }),
      invalidatesTags: [{ type: 'UserApproval', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetUserApprovalsQuery,
  useCreateUserApprovalMutation,
  useApproveUserApprovalMutation,
  useRejectUserApprovalMutation,
} = userApprovalApi;
