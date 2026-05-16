import { baseApi } from './baseApi';

export const landingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getLandingPage: builder.query({
      query: () => ({ url: '/api/public/landing', method: 'GET' }),
      providesTags: ['LandingPage'],
    }),
    getLandingConfig: builder.query({
      query: () => ({ url: '/admin/landing-config', method: 'GET' }),
      providesTags: ['LandingPage'],
    }),
    updateLandingSection: builder.mutation({
      query: ({ section, data }) => ({
        url: `/admin/landing-config/${section}`,
        method: 'PUT',
        data,
      }),
      invalidatesTags: ['LandingPage'],
    }),
    resetLandingSection: builder.mutation({
      query: (section) => ({
        url: `/admin/landing-config/${section}/reset`,
        method: 'POST',
      }),
      invalidatesTags: ['LandingPage'],
    }),
    uploadLandingImage: builder.mutation({
      query: (file) => {
        const body = new FormData();
        body.append('image', file);
        return { url: '/admin/landing-config/upload-image', method: 'POST', body };
      },
    }),
  }),
});

export const {
  useGetLandingPageQuery,
  useGetLandingConfigQuery,
  useUpdateLandingSectionMutation,
  useResetLandingSectionMutation,
  useUploadLandingImageMutation,
} = landingApi;
