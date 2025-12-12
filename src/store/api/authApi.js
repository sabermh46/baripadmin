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

    generateToken: builder.mutation({
      query: (data) => ({
        url: '/auth/generate-token',
        method: 'POST',
        data,
      }),
    }),
    
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
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useGoogleLoginQuery,
  useSetPasswordMutation,
  useLinkGoogleAccountMutation,
  useGenerateTokenMutation,
  useLogoutMutation,
  useRefreshTokenMutation,
  useValidateTokenMutation,
  useGetPublicRegistrationStatusQuery,
} = authApi;