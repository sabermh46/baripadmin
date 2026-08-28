import { baseApi } from "./baseApi";

/**
 * Loan endpoints are exempt from the app-wide cache policy, for the same reason the app-fee
 * ones are.
 *
 * baseApi keeps query data for 600s and, via `refetchOnMountOrArgChange: 120`, will re-render
 * a two-minute-old answer without asking the server. Correct for a list of flats; wrong for a
 * balance the owner just changed. Recording a payment does invalidate the loan tags, so the
 * page it was recorded on updates at once — but every *other* screen holding loan data was
 * still free to serve its own cached copy for up to ten minutes, which is what "it showed up
 * so late" actually was.
 */
const LIVE = {
  // Drop the moment the last subscriber unmounts — never re-render a stale balance.
  keepUnusedDataFor: 0,
  // `true`, not a number of seconds: refetch on every mount, no grace window.
  refetchOnMountOrArgChange: true,
  refetchOnFocus: true,
  refetchOnReconnect: true,
};

export const loanApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // Create a new loan
        createLoan: builder.mutation({
            query: (loanData) => ({
                url: '/api/loans/loan-create',
                method: 'POST',
                data: loanData,
            }),
            invalidatesTags: (result, error, arg) => [
                { type: 'Loan', id: 'LIST' },
                ...(arg?.house_id ? [{ type: 'Loan', id: `house-${arg.house_id}` }] : []),
            ],
        }),
        // Get loans for a specific house (each loan includes payments array)
        getLoansByHouse: builder.query({
            ...LIVE,
            query: (houseId) => ({
                url: `/api/loans/loan-by-house/${houseId}`,
                method: 'GET',
            }),
            providesTags: (result, error, houseId) =>
                result?.data
                    ? [
                        ...result.data.map(({ id }) => ({ type: 'Loan', id })),
                        { type: 'Loan', id: 'LIST' },
                        { type: 'Loan', id: `house-${houseId}` },
                    ]
                    : [{ type: 'Loan', id: 'LIST' }, { type: 'Loan', id: `house-${houseId}` }],
        }),
        // Get loan details with payment history
        getLoanDetails: builder.query({
            ...LIVE,
            query: (loanId) => ({
                url: `/api/loans/loan/${loanId}`,
                method: 'GET',
            }),
            providesTags: (result, error, loanId) => [{ type: 'Loan', id: loanId }],
        }),
        // Record a payment for a loan
        recordLoanPayment: builder.mutation({
            query: ({ loanId, paymentData }) => ({
                url: `/api/loans/loan-payment-create/${loanId}`,
                method: 'POST',
                data: paymentData,
            }),
            invalidatesTags: (result, error, { loanId }) => [
                { type: 'Loan', id: loanId },
                { type: 'Loan', id: 'LIST' },
            ],
        }),
        // Update a loan
        updateLoan: builder.mutation({
            query: ({ id, ...updateData }) => ({
                url: `/api/loans/loan/${id}`,
                method: 'PUT',
                data: updateData,
            }),
            invalidatesTags: (result, error, { id }) => [{ type: 'Loan', id }, { type: 'Loan', id: 'LIST' }],
        }),
        // Delete a loan
        deleteLoan: builder.mutation({
            query: (id) => ({
                url: `/api/loans/loan/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: (result, error, id) => [{ type: 'Loan', id }, { type: 'Loan', id: 'LIST' }],
        }),
        // Remove one payment from a loan's history.
        //
        // Invalidates by loan id as well as LIST, because the loan's own paid_amount and
        // status move with the deletion — the server puts the balance back — so a cached
        // loan detail would otherwise still show money that no payment backs.
        deleteLoanPayment: builder.mutation({
            query: ({ loanPaymentId }) => ({
                url: `/api/loans/loan-payment/${loanPaymentId}`,
                method: 'DELETE',
            }),
            invalidatesTags: (result, error, { loanId }) => [
                ...(loanId ? [{ type: 'Loan', id: loanId }] : []),
                { type: 'Loan', id: 'LIST' },
            ],
        }),
        // Update a loan payment record
        updateLoanPayment: builder.mutation({
            query: ({ loanPaymentId, ...updateData }) => ({
                url: `/api/loans/loan-payment/${loanPaymentId}`,
                method: 'PUT',
                data: updateData,
            }),
            invalidatesTags: () => [{ type: 'Loan', id: 'LIST' }],
        }),
    }),
});

export const {
    useCreateLoanMutation,
    useGetLoansByHouseQuery,
    useGetLoanDetailsQuery,
    useRecordLoanPaymentMutation,
    useUpdateLoanMutation,
    useDeleteLoanMutation,
    useUpdateLoanPaymentMutation,
    useDeleteLoanPaymentMutation,
} = loanApi;
