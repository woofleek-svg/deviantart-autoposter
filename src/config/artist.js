// Artist configuration
// Set these via environment variables or edit the defaults below

export const ARTIST_CONFIG = {
  // DeviantArt username (the part after deviantart.com/)
  username: import.meta.env.VITE_ARTIST_USERNAME || 'your-username',

  // Display name for the site
  displayName: import.meta.env.VITE_ARTIST_DISPLAY_NAME || 'Your Artist Name',

  // Number of artworks to load initially
  initialLimit: 24,

  // Number of artworks to load when "Load More" is clicked
  loadMoreLimit: 12,

  // Number of featured artworks for slideshow
  featuredCount: 6
};

/*
TO SET UP:
1. Set VITE_ARTIST_USERNAME in your .env file to your DeviantArt username
   For example, if your profile is at: https://www.deviantart.com/coolartist
   Then set: VITE_ARTIST_USERNAME=coolartist
2. Set VITE_ARTIST_DISPLAY_NAME to whatever you want displayed on the site
*/
