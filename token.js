var SpotifyWebApi = require('spotify-web-api-node');

var spotifyApi = new SpotifyWebApi({
  clientId     : process.env.SPOTIFY_KEY,
  clientSecret : process.env.SPOTIFY_SECRET,
  redirectUri  : process.env.SPOTIFY_REDIRECT_URI
});

// Refresh token periodically
spotifyApi.refreshAccessToken()
  .then(function(data) {
    spotifyApi.setAccessToken(data.body['access_token']);
    if (data.body['refresh_token']) {
      spotifyApi.setRefreshToken(data.body['refresh_token']);
    }
});