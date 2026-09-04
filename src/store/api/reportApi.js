import { baseApi } from './baseApi';

/**
 * Financial reporting.
 *
 * `houseId` is optional on the profit report: omitting it reports across every house the
 * signed-in role may see, which is how an owner gets a portfolio total and how an admin
 * gets a platform total. It used to be required server-side, so neither question could be
 * asked at all. `ownerId` narrows an admin's view to one owner without picking a house.
 *
 * Empty values are stripped rather than sent as `?houseId=`, so the server's `nullable`
 * rules see an absent parameter instead of relying on empty-string-to-null coercion.
 */
const clean = (obj) =>
  Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  );

export const reportApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProfitReport: builder.query({
      query: ({ houseId, ownerId, startDate, endDate }) => ({
        url: '/financial/profit-report',
        method: 'GET',
        params: clean({ houseId, ownerId, startDate, endDate }),
      }),
      providesTags: ['Report'],
    }),

    recordExpense: builder.mutation({
      query: ({ houseId, ...expenseData }) => ({
        url: `/houses/${houseId}/expenses`,
        method: 'POST',
        data: expenseData,
      }),
      invalidatesTags: ['Report'],
    }),

    getExpenses: builder.query({
      query: ({ houseOwnerId, houseId }) => ({
        url: `/houses/${houseOwnerId}/expenses`,
        method: 'GET',
        params: clean({ houseId }),
      }),
      providesTags: ['Report'],
    }),
  }),
});

export const { useGetProfitReportQuery, useRecordExpenseMutation, useGetExpensesQuery } = reportApi;
