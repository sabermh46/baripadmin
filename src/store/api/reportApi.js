import { baseApi } from './baseApi';

/**
 * Financial reporting and house expenses.
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

    getExpenses: builder.query({
      query: ({ houseOwnerId, houseId, page, limit }) => ({
        url: `/houses/${houseOwnerId}/expenses`,
        method: 'GET',
        params: clean({ houseId, page, limit }),
      }),
      providesTags: ['Report'],
    }),

    // Note the key name: the endpoint interpolates `houseId` into the path, so a caller
    // passing the form's `house_id` would send /houses/undefined/expenses. The dev-only
    // guard in baseApi catches that now, but the mismatch is worth stating here too.
    recordExpense: builder.mutation({
      query: ({ houseId, ...expenseData }) => ({
        url: `/houses/${houseId}/expenses`,
        method: 'POST',
        data: expenseData,
      }),
      invalidatesTags: ['Report'],
    }),

    updateExpense: builder.mutation({
      query: ({ houseId, expenseId, ...expenseData }) => ({
        url: `/houses/${houseId}/expenses/${expenseId}`,
        method: 'PUT',
        data: expenseData,
      }),
      invalidatesTags: ['Report'],
    }),

    deleteExpense: builder.mutation({
      query: ({ houseId, expenseId }) => ({
        url: `/houses/${houseId}/expenses/${expenseId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Report'],
    }),

    // Approve or reject an expense someone else recorded. Only the house owner may decide,
    // and only on one still pending — the server enforces both.
    decideExpense: builder.mutation({
      query: ({ houseId, expenseId, status, reason }) => ({
        url: `/houses/${houseId}/expenses/${expenseId}`,
        method: 'PATCH',
        data: clean({ status, reason }),
      }),
      invalidatesTags: ['Report'],
    }),
  }),
});

export const {
  useGetProfitReportQuery,
  useGetExpensesQuery,
  useRecordExpenseMutation,
  useUpdateExpenseMutation,
  useDeleteExpenseMutation,
  useDecideExpenseMutation,
} = reportApi;
