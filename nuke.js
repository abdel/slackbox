var SpotifyWebApi = require('spotify-web-api-node');

if (!process.env.PRODUCTION) {
  require('dotenv').load();
}

var today      = new Date();
var spotifyApi = new SpotifyWebApi({
  clientId     : process.env.SPOTIFY_KEY,
  clientSecret : process.env.SPOTIFY_SECRET,
  redirectUri  : process.env.SPOTIFY_REDIRECT_URI
});

// Execute on Mondays
//if (today.getDay() == 1) {
  spotifyApi.getPlaylistTracks(process.env.SPOTIFY_USERNAME, process.env.SPOTIFY_PLAYLIST_ID)
    .then(function(data) {
      var tracks = data.body.items;
      var deleteTracks = [];

      console.log(data.body);
      
      for (var i = 0; i < 100; i++) {
        deleteTracks.push({uri: tracks[i].uri});
      }

      console.log(deleteTracks);

      /*
      spotifyApi.removeTracksFromPlaylist(process.env.SPOTIFY_USERNAME, process.env.SPOTIFY_PLAYLIST_ID)
        .then(function(data) {

      });*/
    }, function(err) {
      console.log(err);
    });
//}