// store/api/admin/systemSettingsApi.js
import { baseApi } from '../baseApi';

export const systemSettingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSystemSettings: builder.query({
      query: () => ({
        url: '/admin/system-settings',
        method: 'GET',
      }),
      providesTags: ['SystemSettings'],
    }),
    
    getSystemSettingByKey: builder.query({
      query: (key) => ({
        url: `/admin/system-settings/${key}`,
        method: 'GET',
      }),
      providesTags: ['SystemSettings'],
    }),
    
    updateSystemSetting: builder.mutation({
      query: ({ id, data }) => ({
        url: `/admin/system-settings/${id}`,
        method: 'PATCH',
        data,
      }),
      invalidatesTags: ['SystemSettings'],
    }),
    
    deleteSystemSetting: builder.mutation({
      query: (id) => ({
        url: `/admin/system-settings/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['SystemSettings'],
    }),
    
  }),
  overrideExisting: false,
});

export const {
  useGetSystemSettingsQuery,
  useGetSystemSettingByKeyQuery,
  useUpdateSystemSettingMutation,
  useDeleteSystemSettingMutation,
} = systemSettingsApi;