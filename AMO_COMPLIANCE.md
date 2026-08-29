# GooWi — Mozilla/AMO Compliance Notes

Prepared for v0.7.2 release preparation.

- Firefox minimum version: **140.0**
- Manifest data declaration: **required `searchTerms`**
- Built-in Firefox install consent used; no custom legacy consent flow.
- Network destination for query lookup: relevant `*.wikipedia.org` domain over HTTPS.
- Developer backend: **none**
- Analytics/telemetry/ads: **none**
- Persistent identifiers/search-history storage: **none**
- Remote executable code: **none**
- Third-party JS libraries: **none**
- Host permissions limited to Wikipedia; Google access limited by content-script match patterns.
- Public privacy policy and source repository included.

The one review-sensitive policy area is GooWi's use of the existing Google query to retrieve Wikipedia context. Reviewer notes explicitly explain that GooWi does not provide or intercept Google search submission; it runs after the Google results page loads and uses the query solely for the extension's disclosed primary companion-content function.
