# Landing Page – Dedicated API Suggestion

If you want the landing page to show **live data** instead of hardcoded content, consider a small dedicated API on the backend.

## Suggested endpoint

- **`GET /api/public/landing`** (or `/api/landing-stats`) – no auth required.

## Recommended response shape

```json
{
  "stats": {
    "propertiesManaged": 120,
    "rentProcessedAmount": "10M+",
    "rentProcessedCurrency": "₹",
    "happyUsers": 500
  },
  "testimonials": [
    {
      "id": "1",
      "quote": "Finally stopped chasing rent on WhatsApp...",
      "authorName": "Property Owner",
      "authorRole": "Kolkata"
    }
  ],
  "featureFlags": {
    "showPricing": true,
    "showDemoVideo": false
  }
}
```

## Why this helps

| Section | Today | With API |
|--------|--------|----------|
| **Hero stats** (100+ properties, ₹10M+, 500+ users) | Hardcoded | Use `stats` so numbers stay real as you grow. |
| **Testimonials** | Static array in JSX | Fetch `testimonials` for easy updates without deploys. |
| **Pricing / Demo** | Always visible | Optionally show/hide via `featureFlags`. |

## Frontend usage

- In `PublicHome`, call this API once on mount (e.g. with a small `useLandingData` hook or `useEffect`).
- Use fallbacks: if the request fails or is empty, keep current hardcoded values.
- Cache the response for a few minutes (or use SWR/React Query) so the landing page stays fast.

## Optional extensions

- **Testimonials**: Add `avatarUrl`, `rating`, or `featured` for richer cards.
- **Stats**: Add `lastUpdated` and optionally show “Updated monthly” under the numbers.
- **i18n**: Return localized strings for `testimonials[].quote` and labels if you support multiple languages from the API.

You can keep the current static content and add this API later when you’re ready to drive the hero stats and testimonials from the backend.
