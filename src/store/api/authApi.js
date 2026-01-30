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

    googleLogin: builder.query({
      query: () => ({
        url: '/auth/login/success',
        method: 'GET',
      }),
      providesTags: ['Auth'],
    }),

    setPassword: builder.mutation({
      query: (data) => ({
        url: '/auth/set-password',
        method: 'POST',
        data,
      }),
    }),

    linkGoogleAccount: builder.mutation({
      query: (data) => ({
        url: '/auth/link-google',
        method: 'POST',
        data,
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
        data, // Expected: { token, password }
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

    logout: builder.mutation({
      query: () => ({
        url: '/auth/logout',
        method: 'GET', 
      }),
    }),

    refreshToken: builder.mutation({
      query: (data) => ({
        url: '/auth/refresh',
        method: 'POST',
        data,
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useGoogleLoginQuery,
  useSetPasswordMutation,
  useLinkGoogleAccountMutation,
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
} = authApi;