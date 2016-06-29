var SpotifyWebApi = require('spotify-web-api-node');

var spotifyApi = new SpotifyWebApi({
  clientId     : process.env.SPOTIFY_KEY,
  clientSecret : process.env.SPOTIFY_SECRET,
  redirectUri  : process.env.SPOTIFY_REDIRECT_URI
});

spotifyApi.refreshAccessToken()
  .then(function(data) {
    spotifyApi.setAccessToken(data.body['access_token']);
    if (data.body['refresh_token']) {
      spotifyApi.setRefreshToken(data.body['refresh_token']);
    }

    if (process.argv[2] == 'clear') {
      spotifyApi.getPlaylistTracks(process.env.SPOTIFY_USERNAME, process.env.SPOTIFY_PLAYLIST_ID)
        .then(function(data) {
          var tracks = data.body.items;
          var deleteTracks = [];

          for (var i = 0; i < 100; i++) {
            deleteTracks.push({uri: tracks[i].uri});
          }

          console.log(deleteTracks);

          /*
          spotifyApi.removeTracksFromPlaylist(process.env.SPOTIFY_USERNAME, process.env.SPOTIFY_PLAYLIST_ID)
            .then(function(data) {

          });*/
        }, function(err) {
          console.log(err.message);
        });
    }
  }, function(err) {
    console.log(err.message);
  });