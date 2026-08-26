import { baseApi } from "./baseApi";

export const staffApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ----------------- STAFF DATA QUERIES -----------------

    // GET /staff
    // Handles search, pagination, and limits via query parameters
    getStaffList: builder.query({
      query: ({ search = "", page = 1, limit = 20 } = {}) => ({
        url: `/admin/permissions/staff?search=${search}&page=${page}&limit=${limit}`,
        method: "GET",
      }),
      // Assuming your controller handles invalidation via these tags
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ staffId }) => ({
                type: "Staff",
                id: staffId,
              })),
              { type: "Staff", id: "LIST" },
            ]
          : [{ type: "Staff", id: "LIST" }],
    }),

    // GET /staff/:staffId
    getStaffDetails: builder.query({
      query: (staffId) => ({
        url: `/admin/permissions/staff/${staffId}`,
        method: "GET",
      }),
      providesTags: (result, error, staffId) => [
        { type: "Staff", id: staffId },
      ],
    }),

    // GET /staff/:staffId/activity
    getStaffActivity: builder.query({
      query: (staffId) => ({
        url: `/admin/permissions/staff/${staffId}/activity`,
        method: "GET",
      }),
      // Tagging activity data to staff ID
      providesTags: (result, error, staffId) => [
        { type: "StaffActivity", id: staffId },
      ],
    }),

    // GET /staff/:staffId/history
    getPermissionHistory: builder.query({
      query: (staffId) => ({
        url: `/admin/permissions/staff/${staffId}/history`,
        method: "GET",
      }),
      // Tagging history data to staff ID
      providesTags: (result, error, staffId) => [
        { type: "PermissionHistory", id: staffId },
      ],
    }),

    // ----------------- PERMISSION QUERIES -----------------

    // GET /permissions
    getAvailablePermissions: builder.query({
      query: () => ({
        url: `/admin/permissions`,
        method: "GET",
      }),
      providesTags: [{ type: "Permission", id: "LIST" }],
    }),

    // ----------------- MUTATIONS (ACTIONS) -----------------

    // PUT /staff/:staffId/status
    updateStaffStatus: builder.mutation({
      query: ({ staffId, status }) => ({
        url: `/admin/permissions/staff/${staffId}/status`,
        method: "PUT",
        data: { status },
      }),
      // Invalidates the staff details and list when status changes
      invalidatesTags: (result, error, { staffId }) => [
        { type: "Staff", id: staffId },
        { type: "Staff", id: "LIST" },
      ],
    }),

    // PUT /staff/:staffId/permissions — the whole desired state, one call.
    //
    // Replaces a `grantPermission`/`revokePermission` pair that pointed at routes which do
    // not exist (routes/api/admin.php has only the /bulk pair). Nothing imported them, so
    // they never 404'd in anger, but they were a trap for whoever reached for the
    // obvious-looking hook next.
    //
    // The permission editor needs both directions at once: tick two boxes, untick a third,
    // press Save. Doing that with bulkGrant + bulkRevoke is two requests, and a failure
    // between them leaves the staff member holding a set nobody chose.
    syncStaffPermissions: builder.mutation({
      query: ({ staffId, permissionIds }) => ({
        url: `/admin/permissions/staff/${staffId}/permissions`,
        method: "PUT",
        data: { permissionIds },
      }),
      invalidatesTags: (result, error, { staffId }) => [
        { type: "Staff", id: staffId },
        { type: "Staff", id: "LIST" },
        { type: "PermissionHistory", id: staffId },
      ],
    }),

    // POST /staff/:staffId/permissions/bulk
    bulkGrantPermissions: builder.mutation({
      query: ({ staffId, permissionIds }) => ({
        url: `/admin/permissions/staff/${staffId}/permissions/bulk`,
        method: "POST",
        data: { permissionIds },
      }),
      invalidatesTags: (result, error, { staffId }) => [
        { type: "Staff", id: staffId },
        { type: "PermissionHistory", id: staffId },
      ],
    }),

    // DELETE /staff/:staffId/permissions/bulk
    bulkRevokePermissions: builder.mutation({
      query: ({ staffId, permissionIds }) => ({
        url: `/admin/permissions/staff/${staffId}/permissions/bulk`,
        method: "DELETE",
        data: { permissionIds }, // DELETE body usually works with custom baseQuery/Axios
      }),
      invalidatesTags: (result, error, { staffId }) => [
        { type: "Staff", id: staffId },
        { type: "PermissionHistory", id: staffId },
      ],
    }),

    // POST /permissions/copy
    copyPermissions: builder.mutation({
      query: ({ sourceStaffId, targetStaffId }) => ({
        url: `/admin/permissions/copy`,
        method: "POST",
        data: { sourceStaffId, targetStaffId },
      }),
      // Invalidate all target staff details after copy operation
      invalidatesTags: (result, error, { targetStaffId }) => [
        { type: "Staff", id: targetStaffId },
        // Optionally invalidate list if permissions affect list display
        { type: "Staff", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetStaffListQuery,
  useGetStaffDetailsQuery,
  useGetStaffActivityQuery,
  useGetPermissionHistoryQuery,
  useGetAvailablePermissionsQuery,
  useUpdateStaffStatusMutation,
  useSyncStaffPermissionsMutation,
  useBulkGrantPermissionsMutation,
  useBulkRevokePermissionsMutation,
  useCopyPermissionsMutation,
} = staffApi;
