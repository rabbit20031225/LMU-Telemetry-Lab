/**
 * Utility for resolving track-related assets
 */

/**
 * Returns the path to the national flag image for a given country name.
 * The country name is provided by the backend metadata.
 */
export const getCountryFlagPath = (country?: string): string => {
  if (!country) return '';
  // The user has organized flags in /country_flag/ with "Country Name.png" format
  return `/country_flag/${country}.png`;
};

