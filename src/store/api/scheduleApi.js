import { baseApi } from './baseApi';

// The Schedule menu: a house owner's rent bills and late-rent reminders, which the server
// sends on its own every minute (RentScheduleRunner). House owners only.
export const scheduleApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSchedules: builder.query({
      query: () => ({ url: '/schedules', method: 'GET' }),
      providesTags: ['RentSchedule'],
    }),
    createSchedule: builder.mutation({
      query: (data) => ({ url: '/schedules', method: 'POST', data }),
      invalidatesTags: ['RentSchedule'],
    }),
    updateSchedule: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/schedules/${id}`, method: 'PUT', data }),
      invalidatesTags: ['RentSchedule'],
    }),
    deleteSchedule: builder.mutation({
      query: (id) => ({ url: `/schedules/${id}`, method: 'DELETE' }),
      invalidatesTags: ['RentSchedule'],
    }),
    getScheduleDeliveries: builder.query({
      query: (id) => ({ url: `/schedules/${id}/deliveries`, method: 'GET' }),
      providesTags: ['RentSchedule'],
    }),
  }),
});

export const {
  useGetSchedulesQuery,
  useCreateScheduleMutation,
  useUpdateScheduleMutation,
  useDeleteScheduleMutation,
  useGetScheduleDeliveriesQuery,
} = scheduleApi;
