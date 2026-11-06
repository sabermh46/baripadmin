import { baseApi } from './baseApi';

// The landing page is stored per language (bn, en). Every endpoint takes the locale; the server
// treats a missing or unknown one as Bengali. The locale goes in the query string, never the
// body: the body of a PUT is the section itself, stored verbatim.
export const LANDING_LOCALES = ['bn', 'en'];

/** i18next's language ('bn', 'bn-BD', 'en-US', …) as one of the landing page's locales. */
export const landingLocale = (language) => (language?.startsWith('en') ? 'en' : 'bn');

export const landingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getLandingPage: builder.query({
      query: (locale = 'bn') => ({ url: '/api/public/landing', method: 'GET', params: { locale } }),
      providesTags: (result, error, locale = 'bn') => [{ type: 'LandingPage', id: locale }],
    }),
    getLandingConfig: builder.query({
      query: (locale = 'bn') => ({ url: '/admin/landing-config', method: 'GET', params: { locale } }),
      providesTags: (result, error, locale = 'bn') => [{ type: 'LandingPage', id: locale }],
    }),
    updateLandingSection: builder.mutation({
      query: ({ section, data, locale = 'bn' }) => ({
        url: `/admin/landing-config/${section}`,
        method: 'PUT',
        params: { locale },
        data,
      }),
      invalidatesTags: (result, error, { locale = 'bn' }) => [{ type: 'LandingPage', id: locale }],
    }),
    resetLandingSection: builder.mutation({
      query: ({ section, locale = 'bn' }) => ({
        url: `/admin/landing-config/${section}/reset`,
        method: 'POST',
        params: { locale },
      }),
      invalidatesTags: (result, error, { locale = 'bn' }) => [{ type: 'LandingPage', id: locale }],
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
