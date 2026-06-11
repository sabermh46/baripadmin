import { baseApi } from "./baseApi";

const buildQuery = (params = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      qs.append(key, value);
    }
  });
  const str = qs.toString();
  return str ? `?${str}` : "";
};

export const auditLogApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // GET /admin/audit-logs
    getAuditLogs: builder.query({
      query: (params = {}) => ({
        url: `/admin/audit-logs${buildQuery(params)}`,
        method: "GET",
      }),
      providesTags: [{ type: "AuditLog", id: "LIST" }],
    }),

    // GET /admin/audit-logs/facets
    getAuditLogFacets: builder.query({
      query: () => ({
        url: `/admin/audit-logs/facets`,
        method: "GET",
      }),
      providesTags: [{ type: "AuditLog", id: "FACETS" }],
    }),

    // GET /admin/audit-logs/:id
    getAuditLog: builder.query({
      query: (id) => ({
        url: `/admin/audit-logs/${id}`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [{ type: "AuditLog", id }],
    }),
  }),
});

export const {
  useGetAuditLogsQuery,
  useGetAuditLogFacetsQuery,
  useGetAuditLogQuery,
} = auditLogApi;
