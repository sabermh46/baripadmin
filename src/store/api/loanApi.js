import { baseApi } from "./baseApi";

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
} = loanApi;
