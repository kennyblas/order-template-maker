# Order Template Maker

Drop the reorder list (File 1) and the distributor SBD file (File 2), and download the Order Template .xlsx.

Live site: https://kennyblas.github.io/order-template-maker/

## How it works

- **Sign in**: the same @usawholesalesupplies.com Google login as the Offer Sheet Maker (o2i Supabase project).
- **o2i**: Account Status and Storage Limit come live from o2i through the read-only Edge Function
  `order-template-lookup` (see `supabase/`), matched by Store Code.
- **Keepa**: only the Category column (root category by ASIN). Each user pastes their own Keepa API key; it is never stored in this repo.

## Rules (a row must pass all five)

1. Store Code exists in o2i
2. o2i Account Status is Active
3. o2i Storage Limit is "No Limit" or under 100% used
4. File 2 Days remaining is 270 or more (matched by UPC)
5. File 1 Ungating Status is Ungated

Rows that fail are listed on the page under **Left out**, with the reason.

## Output columns

Tracking_code (blank) · Asin · upc/gtin · Brand (File 1) · Product_name (File 1 TITLE) · Amz_link · Category (Keepa) ·
Bundle_size · Unit_price · Order_quantity (Recommended Qty. × Bundle Size) · Target_sell_price (90Days Average) · profit · Roi ·
Breakeven_price · Distributor · Date_ordered (Friday of the current week; Sat/Sun use the next Friday) ·
Order_id (File 2 ITEM NUMBER) · Invoice_number (blank) · Notes (blank) · Client
