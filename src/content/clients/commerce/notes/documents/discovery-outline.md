---
title: "Discovery Outline"
---

### General

-   Discover the existing implementation and requirements.
    
-   Build a checkout POC to validate Shopify capabilities.
    
-   Build a commerce adapter POC to demonstrate integration with the existing storefront.
    
    -   Getting access to their current storefront code base will prov will be beneficial if they use strict types as we’ll know the shapes need to normalize shopify’s data to.
        
-   Great training / documentation process to grow tapestry expertise in Shopify.
    

&nbsp;

**Storefront implementation**

1.  Determine how much existing code we can reuse and what must change for Shopify.
    
2.  Identify third party vendors and their integrations, then group each vendor into one of three buckets: retained with existing code, retained but needs new code, requires a replacement vendor.
    

**Customers**

&nbsp;

**Checkout**

1.  Identify the current checkout experience and custom SFCC logic, then determine how to replicate them using Shopify Checkout and Shopify Functions.
    

**Markets**

1.  Identify the countries, languages, currencies and domains supported by each regional storefront to determine the required Shopify store and market configuration.
    

**Data and migration**

1.  Identify the product and customer data that needs to migrate to Shopify.
    
2.  Confirm whether historical orders need to migrate or will remain accessible through the existing OMS, likely outside migration scope.
    

**External systems**

1.  Identify the OMS and integrations needed before and after purchase, including the APIs and metafields required to support them.
    
2.  Confirm whether implementation belongs to our project or a separate team.
    

**Hosting and product assets**

1.  Confirm whether we must use the existing infrastructure or can propose changes.
    
2.  Identify how product assets are stored and delivered, including any existing DAM integration, then determine what needs to change for Shopify.
    

**Testing**

1.  Assess whether existing tests reliably verify working features and can support feature parity during migration, then determine whether tests are superficial or have coverage gaps.
    

**Documentation and training**

&nbsp;

**Emails**

&nbsp;

**Delivery constraints**

1.  Confirm the project budget and timeline.
