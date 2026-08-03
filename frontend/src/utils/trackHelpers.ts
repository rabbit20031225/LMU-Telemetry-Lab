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

/**
 * Resolves country name from track name / share title / filename.
 */
export const getCountryFromTrackName = (trackName?: string): string => {
  if (!trackName) return '';
  const clean = trackName.toLowerCase();
  if (clean.includes('bahrain') || clean.includes('sakhir')) return 'Bahrain';
  if (clean.includes('spa') || clean.includes('francorchamps')) return 'Belgium';
  if (clean.includes('interlagos') || clean.includes('pace')) return 'Brazil';
  if (clean.includes('lemans') || clean.includes('le mans') || clean.includes('sarthe') || clean.includes('ricard')) return 'France';
  if (clean.includes('monza') || clean.includes('imola')) return 'Italy';
  if (clean.includes('fuji')) return 'Japan';
  if (clean.includes('portimao') || clean.includes('algarve')) return 'Portugal';
  if (clean.includes('qatar') || clean.includes('losail') || clean.includes('lusail')) return 'Qatar';
  if (clean.includes('aragon') || clean.includes('barcelona') || clean.includes('jerez')) return 'Spain';
  if (clean.includes('silverstone')) return 'United Kingdom';
  if (clean.includes('sebring') || clean.includes('daytona') || clean.includes('laguna') || clean.includes('cota') || clean.includes('indianapolis')) return 'United States';
  return '';
};

