var express = require('express');
var bodyParser = require('body-parser');
var url = require('url');
var path = require('path');
var validUrl = require('valid-url');
var SpotifyWebApi = require('spotify-web-api-node');

if (!process.env.PRODUCTION) {
  require('dotenv').load();
}

var spotify = new SpotifyWebApi({
  clientId     : process.env.SPOTIFY_KEY,
  clientSecret : process.env.SPOTIFY_SECRET,
  redirectUri  : process.env.SPOTIFY_REDIRECT_URI
});

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

function checkToken(req, res, next) {
  if (req.body.token !== process.env.SLACK_TOKEN) {
    return res.status(500).send('CSRF: Invalid Slack Token');
  }

  next();
};

app.get('/', function (req, res) {
  if (spotify.getAccessToken()) {
    res.send('You are logged in.');
  } else {
    res.send('<a href="/authorise">Authorise</a>');
  }
});

app.get('/authorise', function(req, res) {
  var scopes = ['playlist-modify-public', 'playlist-modify-private'],
      state  = new Date().getTime();

  res.redirect(spotify.createAuthorizeURL(scopes, state));
});

app.get('/callback', function(req, res) {
  spotify.authorizationCodeGrant(req.query.code)
    .then(function (data) {
      spotify.setAccessToken(data.body['access_token']);
      spotify.setRefreshToken(data.body['refresh_token']);
      return res.redirect('/');
    })
    .catch(function (err) {
      return res.send(err);
    });
});

app.post('/store', checkToken, function(req, res) {
  var track;

  spotify.refreshAccessToken()
    .then(function (data) {
      spotify.setAccessToken(data.body['access_token']);

      if (data.body['refresh_token']) {
        spotify.setRefreshToken(data.body['refresh_token']);
      }

      var query = req.body.text;

      if (validUrl.isUri(req.body.text)) {
        var trackId, matches;

        if (matches = query.match(/^spotify:track:([0-9A-Za-z]+)$/)) {
          trackId = matches[1];
        } else {
          var parsed = url.parse(query);

          trackId = path.basename(parsed.pathname);
        }

        return spotify.getTrack(trackId)
          .then(function (data) {
            return data.body;
          });
      }

      if (query.indexOf(' - ') !== -1) {
        var pieces = query.split(' - ');
        query = 'artist:' + pieces[0].trim()
              + ' track:' + pieces[1].trim();
      }

      return spotify.searchTracks(query)
        .then(function (data) {
          var results = data.body.tracks.items;

          if (results.length === 0) {
            throw { message: 'Could not find that track.' };
          }

          return results[0];
        });
    })
    .then(function (data) {
      track = data;

      return spotify.addTracksToPlaylist(
        process.env.SPOTIFY_USERNAME,
        process.env.SPOTIFY_PLAYLIST_ID,
        [track.uri]
      );
    })
    .then(function (data) {
      res.setHeader('Content-Type', 'application/json');
      res.send({
        responseType: process.env.SLACK_RESPONSE_TYPE || 'ephemeral',
        text: 'Track added: *' + track.name + '* by *' + track.artists[0].name + '*'
      });
    })
    .catch(function (err) {
      return res.send(err.message);
    });
});

app.post('/refresh', checkToken, function (req, res) {
  spotify.refreshAccessToken()
    .then(function (data) {
      spotify.setAccessToken(data.body['access_token']);

      if (data.body['refresh_token']) {
        spotify.setRefreshToken(data.body['refresh_token']);
      }

      res.send('Refreshed access token. Expires in ' + data.body['expires_in'] + ' seconds.');
    })
    .catch(function (err) {
      res.send(err.message);
    });
});

app.post('/clear', checkToken, function(req, res) {
  var playlistTracks,
      deleteTracks = [];

  spotify.refreshAccessToken()
    .then(function (data) {
      spotify.setAccessToken(data.body['access_token']);

      if (data.body['refresh_token']) {
        spotify.setRefreshToken(data.body['refresh_token']);
      }

      return spotify.getPlaylistTracks(
        process.env.SPOTIFY_USERNAME,
        process.env.SPOTIFY_PLAYLIST_ID
      );
    })
    .then(function (data) {
      playlistTracks = data.body.items;

      for (var i = 0; i < Math.min(playlistTracks.length, 99); i++) {
        deleteTracks.push({uri: playlistTracks[i].track.uri});
      }

      return spotify.removeTracksFromPlaylist(
        process.env.SPOTIFY_USERNAME,
        process.env.SPOTIFY_PLAYLIST_ID,
        deleteTracks
      );
    })
    .then(function (data) {
      res.setHeader('Content-Type', 'application/json');
      res.send('Tracks successfully deleted: ' + JSON.stringify(deleteTracks));
    })
    .catch(function (err) {
      res.send(err.message);
    });
});

app.set('port', (process.env.PORT || 5000));
app.listen(app.get('port'));
