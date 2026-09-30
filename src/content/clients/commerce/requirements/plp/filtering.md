# PLP Filtering & Sorting Requirements

## Filter Types

### Price Range

-   Dual-thumb slider with min/max handles
    
-   Shows formatted currency values above handles
    
-   Snaps to nearest $5 increment
    
-   Updates grid on release (not on drag)
    

### Category

-   Hierarchical tree with collapsible sections
    
-   Shows product count per category
    
-   Single-select (navigates to that category page)
    
-   “All categories” option at top
    

### Brand

-   Multi-select checkbox list
    
-   Alphabetical with “Show all” if > 10 brands
    
-   Product count per brand in parentheses
    

### Size

-   Multi-select checkbox list
    
-   Grouped by size type (Apparel, Shoes, Accessories) if applicable
    
-   Show only available sizes for current product set
    

### Color

-   Swatch buttons (circular, colored)
    
-   Multi-select
    
-   Show only available colors for current product set
    
-   Hover shows color name tooltip
    

### Rating

-   Minimum rating filter (4+ stars, 3+ stars)
    
-   Radio button selection
    

## Sort Options

| Option | Behavior |
| --- | --- |
| Featured | Manual sort from Shopify admin |
| Price: Low to High | Ascending price |
| Price: High to Low | Descending price |
| Newest | Sort by created\_at descending |
| Top Rated | Sort by rating descending |
| Best Selling | Sort by sales\_count descending |

## URL State

All filter and sort state must be reflected in the URL query parameters for:

-   Shareable links
    
-   Browser back/forward navigation
    
-   SEO crawlability
    

Example: `/collections/all?color=blue,red&size=m&sort=price-asc&page=2`
