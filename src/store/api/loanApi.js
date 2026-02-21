import { baseApi } from "./baseApi";

export const loanApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // Create a new loan
        createLoan: builder.mutation({
            query: (loanData) => ({
                url: '/api/loans',
                method: 'POST',
                data: loanData,
            }),
            invalidatesTags: ['Loan'],
        }),
        // Get loans for a specific house
        getLoansByHouse: builder.query({
            query: (houseId) => ({
                url: `/api/loans/house/${houseId}`,
                method: 'GET',
            }),
            providesTags: (result) =>
                result
                    ? [
                        ...result.data.map(({ id }) => ({ type: 'Loan', id })),
                        { type: 'Loan', id: 'LIST' },
                    ]
                    : [{ type: 'Loan', id: 'LIST' }],
        }),
        // Get loan details with payment history
        getLoanDetails: builder.query({
            query: (id) => ({
                url: `/api/loans/${id}`,
                method: 'GET',
            }),
            providesTags: (result, error, id) => [{ type: 'Loan', id }],
        }),
        // Record a payment for a loan
        recordPayment: builder.mutation({
            query: ({ loanId, paymentData }) => ({
                url: `/api/loans/${loanId}/payments`,
                method: 'POST',
                data: paymentData,
            }),
            invalidatesTags: (result, error, { loanId }) => [{ type: 'Loan', id: loanId }],
        }),
        // Update a loan
        updateLoan: builder.mutation({
            query: ({ id, ...updateData }) => ({
                url: `/api/loans/${id}`,
                method: 'PUT',
                data: updateData,
            }),
            invalidatesTags: (result, error, { id }) => [{ type: 'Loan', id }],
        }),
        // Delete a loan
        deleteLoan: builder.mutation({
            query: (id) => ({
                url: `/api/loans/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: (result, error, id) => [{ type: 'Loan', id }, { type: 'Loan', id: 'LIST' }],
        }),



    })
})

export const {
    useCreateLoanMutation,
    useGetLoansByHouseQuery,
    useGetLoanDetailsQuery,
    useRecordPaymentMutation,
    useUpdateLoanMutation,
    useDeleteLoanMutation,
} = loanApi;

// make react hooks for the above endpoints
// const { useCreateLoanMutation, useGetLoansByHouseQuery, useGetLoanDetailsQuery, useRecordPaymentMutation, useUpdateLoanMutation, useDeleteLoanMutation } = loanApi;