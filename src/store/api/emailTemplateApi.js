import { baseApi } from './baseApi';

/**
 * Web-owner editing of the transactional email copy.
 *
 * `preview` is a mutation rather than a query even though it changes nothing on the server:
 * it POSTs the unsaved draft, so it is parameterised by a body rather than a URL and there
 * is nothing worth caching. Modelling it as a query would give every keystroke its own cache
 * entry keyed on the whole draft.
 */
export const emailTemplateApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getEmailTemplates: builder.query({
      query: () => ({ url: '/admin/email-templates', method: 'GET' }),
      transformResponse: (response) => response?.data ?? [],
      providesTags: ['EmailTemplate'],
    }),

    updateEmailTemplate: builder.mutation({
      query: ({ id, slots }) => ({
        url: `/admin/email-templates/${id}`,
        method: 'PUT',
        data: { slots },
      }),
      invalidatesTags: ['EmailTemplate'],
    }),

    resetEmailTemplate: builder.mutation({
      query: (id) => ({ url: `/admin/email-templates/${id}/reset`, method: 'POST' }),
      invalidatesTags: ['EmailTemplate'],
    }),

    previewEmailTemplate: builder.mutation({
      query: ({ id, slots }) => ({
        url: `/admin/email-templates/${id}/preview`,
        method: 'POST',
        data: { slots },
      }),
      transformResponse: (response) => response?.data ?? null,
    }),
  }),
});

export const {
  useGetEmailTemplatesQuery,
  useUpdateEmailTemplateMutation,
  useResetEmailTemplateMutation,
  usePreviewEmailTemplateMutation,
} = emailTemplateApi;
