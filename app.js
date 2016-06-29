var express       = require('express');
var bodyParser    = require('body-parser');
var request       = require('request');
var url           = require('url');
var path          = require('path');
var validUrl      = require('valid-url');
var SpotifyWebApi = require('spotify-web-api-node');

var spotifyApi = new SpotifyWebApi({
  clientId     : process.env.SPOTIFY_KEY,
  clientSecret : process.env.SPOTIFY_SECRET,
  redirectUri  : process.env.SPOTIFY_REDIRECT_URI
});

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

app.get('/', function(req, res) {
  if (spotifyApi.getAccessToken()) {
    return res.send('You are logged in.');
  }
  return res.send('<a href="/authorise">Authorise</a>');
});

app.get('/authorise', function(req, res) {
  var scopes = ['playlist-modify-public', 'playlist-modify-private'];
  var state  = new Date().getTime();
  var authoriseURL = spotifyApi.createAuthorizeURL(scopes, state);
  res.redirect(authoriseURL);
});

app.get('/callback', function(req, res) {
  spotifyApi.authorizationCodeGrant(req.query.code)
    .then(function(data) {
      spotifyApi.setAccessToken(data.body['access_token']);
      spotifyApi.setRefreshToken(data.body['refresh_token']);
      return res.redirect('/');
    }, function(err) {
      return res.send(err);
    });
});

app.use('/store', function(req, res, next) {
  if (req.body.token !== process.env.SLACK_TOKEN) {
    return res.status(500).send('Cross site request forgerizzle!');
  }
  next();
});

app.post('/store', function(req, res) {
  spotifyApi.refreshAccessToken()
    .then(function(data) {
      spotifyApi.setAccessToken(data.body['access_token']);
      if (data.body['refresh_token']) {
        spotifyApi.setRefreshToken(data.body['refresh_token']);
      }
      if (validUrl.isUri(req.body.text)) {
        var parsed = url.parse(req.body.text);
        var trackID = path.basename(parsed.pathname);

        spotifyApi.getTrack(trackID)
          .then(function(data) {
            var track = data.body;

            spotifyApi.addTracksToPlaylist(process.env.SPOTIFY_USERNAME, process.env.SPOTIFY_PLAYLIST_ID, ['spotify:track:' + trackID])
              .then(function(data) {
                text = 'Track added: *' + track.name + '* by *' + track.artists[0].name + '*';
                response_type = process.env.SLACK_RESPONSE_TYPE || 'ephemeral';

                res.setHeader('Content-Type', 'application/json');
                res.send({
                  response_type: response_type,
                  text: text
                });
              }, function(err) {
                return res.send(err.message);
              });
          }, function(err) {
            return res.send('Could not find that track.');
          });

      } else {
        if(req.body.text.indexOf(' - ') === -1) {
          var query = req.body.text;
        } else {
          var pieces = req.body.text.split(' - ');
          var query = 'artist:' + pieces[0].trim() + ' track:' + pieces[1].trim();
        }
    
        spotifyApi.searchTracks(query)
          .then(function(data) {
            var results = data.body.tracks.items;
            if (results.length === 0) {
              return res.send('Could not find that track.');
            }
            var track = results[0];
            spotifyApi.addTracksToPlaylist(process.env.SPOTIFY_USERNAME, process.env.SPOTIFY_PLAYLIST_ID, ['spotify:track:' + track.id])
              .then(function(data) {
                text = 'Track added: *' + track.name + '* by *' + track.artists[0].name + '*';
                response_type = process.env.SLACK_RESPONSE_TYPE || 'ephemeral';

                res.setHeader('Content-Type', 'application/json');
                res.send({
                  response_type: response_type,
                  text: text
                });
              }, function(err) {
                return res.send(err.message);
              });
          }, function(err) {
            return res.send(err.message);
          });
      }
    }, function(err) {
      return res.send('Could not refresh access token.');
    });
});

app.post('/empty', function(req, res) {
  spotifyApi.refreshAccessToken()
    .then(function(data) {
      spotifyApi.setAccessToken(data.body['access_token']);
      if (data.body['refresh_token']) {
        spotifyApi.setRefreshToken(data.body['refresh_token']);
      }

      spotifyApi.getPlaylistTracks(process.env.SPOTIFY_USERNAME, process.env.SPOTIFY_PLAYLIST_ID)
        .then(function(data) {
          var tracks = data.body.items;
          var deleteTracks = [];

          for (var i = 0; i < 100; i++) {
            deleteTracks.push({uri: tracks[i].uri});
          }

          res.setHeader('Content-Type', 'application/json');
          res.send(JSON.stringify(deleteTracks));

          /*
          spotifyApi.removeTracksFromPlaylist(process.env.SPOTIFY_USERNAME, process.env.SPOTIFY_PLAYLIST_ID)
            .then(function(data) {

          });*/
        }, function(err) {
          res.send(err.message);
        });
    });
});

app.post('/refresh', function(req, res) {
  spotifyApi.refreshAccessToken()
    .then(function(data) {
      spotifyApi.setAccessToken(data.body['access_token']);
      if (data.body['refresh_token']) {
        spotifyApi.setRefreshToken(data.body['refresh_token']);
      }
    }, function(err) {
      res.send(err.message);
    });
});

app.set('port', (process.env.PORT || 5000));
app.listen(app.get('port'));