import { baseApi } from './baseApi';

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        data: credentials,
      }),
      invalidatesTags: ['Auth'],
    }),

    register: builder.mutation({
      query: (data) => ({
        url: '/auth/register',
        method: 'POST',
        data,
      }),
    }),

    validateToken: builder.mutation({
      query: (data) => ({
        url: '/auth/validate-token',
        method: 'POST',
        data
      }),
    }),

    getPublicRegistrationStatus: builder.query({
      query: () => ({
        url: '/auth/public-registration-status',
        method: 'GET',
      }),
      providesTags: ['Settings'],
    }),

    // Redeems the one-time bridge the Google callback left in the API session, and returns
    // the session like /auth/login does. A mutation, not a query: it can only succeed once,
    // and a query's result is cached (and persisted to IndexedDB), access token included.
    googleLogin: builder.mutation({
      query: () => ({
        url: '/auth/login/success',
        method: 'GET',
      }),
    }),

    setPassword: builder.mutation({
      query: (data) => ({
        url: '/auth/set-password',
        method: 'POST',
        data,
      }),
    }),

    // A one-time ticket that lets the Google redirect know which signed-in user to link.
    // Replaces POST /auth/link-google, which stored whatever Google id the body contained.
    getGoogleLinkTicket: builder.mutation({
      query: () => ({
        url: '/auth/google/link-ticket',
        method: 'POST',
      }),
    }),

    // --- NEW: Password Management Endpoints ---

    forgotPassword: builder.mutation({
      query: (data) => ({
        url: '/auth/forgot-password',
        method: 'POST',
        data, // Expected: { email }
      }),
    }),

    resetPassword: builder.mutation({
      query: (data) => ({
        url: '/auth/reset-password',
        method: 'POST',
        data, // Expected: { token, newPassword }
      }),
    }),

    changePassword: builder.mutation({
      query: (data) => ({
        url: '/auth/change-password',
        method: 'POST',
        data, // Expected: { oldPassword, newPassword }
      }),
    }),

    // --- End of Password Management ---

    generateToken: builder.mutation({
      query: (data) => ({
        url: '/auth/generate-token',
        method: 'POST',
        data,
      }),
    }),

    getRegistrationTokens: builder.query({
      query: () => ({
        url: '/auth/registration-tokens',
        method: 'GET',
      }),
      providesTags: ['Auth'],
    }),

    deleteToken: builder.mutation({
      query: (tokenId) => ({
        url: `/auth/registration-token/${tokenId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Auth'],
    }),

    // POST: logout now revokes this session's tokens, and a state-changing GET can be fired
    // by any page that embeds the URL. The API still answers GET for old cached clients.
    logout: builder.mutation({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
    }),

    refreshToken: builder.mutation({
      query: (data) => ({
        url: '/auth/refresh',
        method: 'POST',
        data,
      }),
    }),

    createUser: builder.mutation({
      query: (data) => ({
        url: '/auth/create-user',
        method: 'POST',
        data,
      }),
      invalidatesTags: ['ManagedOwners'],
    }),

    getManagedUsers: builder.query({
      query: ({ role, expand, userId } = {}) => ({
        url: '/auth/managed-users',
        method: 'GET',
        params: { role, expand, userId },
      }),
      providesTags: ['ManagedUsers'],
    }),

    // One page of one history list on the admin house-owner page (app fees, rent, advances,
    // expenses, loans, loan payments). Those used to ride along in `expand: 'dna'` above,
    // 50 rows each on every open; each section now fetches its own page when it scrolls
    // into view. Same tag as the owner, so anything that refreshes the owner refreshes these.
    getOwnerHistory: builder.query({
      query: ({ ownerId, section, page = 1, limit }) => ({
        url: `/auth/managed-users/${ownerId}/history/${section}`,
        method: 'GET',
        params: { page, limit },
      }),
      providesTags: ['ManagedUsers'],
    }),

    /**
     * An admin editing someone else's profile.
     *
     * There was no endpoint for this at all — the only user-mutating calls were role limits,
     * staff permissions and the caller's own avatar. Invalidates ManagedUsers/ManagedOwners
     * so every list showing the old name or email refreshes, not just the page that saved.
     */
    updateUser: builder.mutation({
      query: ({ userId, ...body }) => ({
        url: `/auth/user/${userId}`,
        method: 'PUT',
        data: body,
      }),
      invalidatesTags: ['ManagedUsers', 'ManagedOwners', 'User'],
    }),

    uploadAvatar: builder.mutation({
      query: (formData) => ({
        url: '/auth/profile/avatar',
        method: 'POST',
        data: formData,
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useGoogleLoginMutation,
  useSetPasswordMutation,
  useGetGoogleLinkTicketMutation,
  useUpdateUserMutation,
  useForgotPasswordMutation, // Exported
  useResetPasswordMutation,   // Exported
  useChangePasswordMutation,  // Exported
  useDeleteTokenMutation,
  useGetRegistrationTokensQuery,
  useGenerateTokenMutation,
  useLogoutMutation,
  useRefreshTokenMutation,
  useValidateTokenMutation,
  useGetPublicRegistrationStatusQuery,
  useCreateUserMutation,
  useGetManagedUsersQuery,
  useGetOwnerHistoryQuery,
  useUploadAvatarMutation,
} = authApi;