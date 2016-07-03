var express = require('express');
var bodyParser = require('body-parser');
var url = require('url');
var path = require('path');
var validUrl = require('valid-url');
var SpotifyWebApi = require('spotify-web-api-node');
var morgan = require('morgan');

if (!process.env.PRODUCTION) {
  require('dotenv').load();
}

process.env.SLACK_RESPONSE_TYPE = process.env.SLACK_RESPONSE_TYPE || 'ephemeral';

var spotify = new SpotifyWebApi({
  clientId     : process.env.SPOTIFY_KEY,
  clientSecret : process.env.SPOTIFY_SECRET,
  redirectUri  : process.env.SPOTIFY_REDIRECT_URI
});

var accessTokenTimer;

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('[:date[iso]] :method :url :status :response-time ms'));

function checkSlackToken(req, res, next) {
  if (req.body.token !== process.env.SLACK_TOKEN) {
    return res.status(500).send('CSRF: Invalid Slack Token');
  }

  next();
};

function createSlackResponse(message) {
  return {
    response_type: process.env.SLACK_RESPONSE_TYPE,
    text: message
  };
};

function refreshSpotifyAccessToken() {
  return spotify.refreshAccessToken()
    .then(function (data) {
      return updateSpotifyToken(data.body);
    });
};

function updateSpotifyToken(data) {
  spotify.setAccessToken(data['access_token']);

  if (data['refresh_token']) {
    spotify.setRefreshToken(data['refresh_token']);
  }

  var timeout = (parseInt(data['expires_in']) - 60) * 1000;
  accessTokenTimer = setTimeout(refreshSpotifyAccessToken, timeout);
  console.info("Spotify access token updated; refresh scheduled in " + timeout + "ms.");

  return data;
}

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
      clearTimeout(accessTokenTimer);
      updateSpotifyToken(data.body);
      return res.redirect('/');
    })
    .catch(function () {
      res.send("Could not refresh Spotify access token.");
    });
});

var resolveSpotifyTrackQuery = function (query) {
  if (validUrl.isUri(query)) {
    var trackId, matches;

    if (matches = query.match(/^spotify:track:([0-9A-Za-z]+)$/)) {
      trackId = matches[1];
    } else {
      trackId = path.basename(url.parse(query).pathname);
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
        throw "Could not find that track.";
      }

      return results[0];
    });
};

app.post('/store', checkSlackToken, function(req, res) {
  var track;

  res.setHeader('Content-Type', 'application/json');

  resolveSpotifyTrackQuery(req.body.text)
    .then(function (data) {
      track = data;

      return spotify.addTracksToPlaylist(
        process.env.SPOTIFY_USERNAME,
        process.env.SPOTIFY_PLAYLIST_ID,
        [track.uri]
      );
    })
    .then(function (data) {
      var message = 'Track added: *' + track.name + '* by *' + track.artists[0].name + '*';
      res.send(createSlackResponse(message));
    })
    .catch(function (err) {
      res.send(createSlackResponse(err.message || err));
    });
});

app.post('/clear', checkSlackToken, function(req, res) {
  var playlistTracks,
      deleteTracks = [];

  spotify.getPlaylistTracks(process.env.SPOTIFY_USERNAME, process.env.SPOTIFY_PLAYLIST_ID)
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
