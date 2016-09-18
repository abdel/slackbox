# Slackbox
Spotify playlist collaboration through Slack. Based on [Slackbox](https://github.com/benchmarkstudios/slackbox) by [Benchmark](http://benchmark.co.uk).

Simply create a Slash Command, such as `/jukebox`, which accepts a track name (also the artist too for a less fuzzy search) to add to a pre-defined Spotify playlist:

    /jukebox Bell Biv DeVoe – Poison

##Installation

First you'll want to create your Slack Slash Command, which you can do by going to your [Slash Commands page](https://my.slack.com/services/new/slash-commands).

During setup, have your slash command submit a POST to your app's `/store` endpoint, e.g. `https://app-name.example.com/store`.

Make a note of the `token`, as you'll need it later to help guard against cross-site request forgery.

###Spotify

Head over to [Spotify's Developer Site](http://developer.spotify.com) and create a new Application. Make sure you add a valid callback URI. If you're running locally, this will be `http://localhost:5000/callback`.

Make a note of the `key`, `secret` and `callback URI` too, as you'll need these later as well.

Also, don't forget to make a playlist. If you do this through [Spotify's web interface](http://play.spotify.com) then the `playlist identifier` will be the last segment of the URI - make a note of this too! If there's a better way of finding this out, we're all ears. If you do this through the app, right-click the playlist to get it's web URL and again, you need the last segment of the URI.

###Environment variables

Once you've cloned the repository you'll need to setup the following environment variables. These can either stored in a `.env` file or set up as environment variables.

* `SLACK_TOKEN` - The token from Slack's Slash Command.
* `SLACK_RESPONSE_TYPE` - `in_channel` or `ephemeral`, [Slack Documentation](https://api.slack.com/slash-commands#responding_to_a_command)
* `SPOTIFY_KEY` - Your Spotify application key (a.k.a Client ID).
* `SPOTIFY_SECRET` - Your Spotify application secret (a.k.a Client Secret).
* `SPOTIFY_USERNAME` - Your Spotify username.
* `SPOTIFY_PLAYLIST_ID` - Your playlist identifier.
* `SPOTIFY_REDIRECT_URI` - URI to redirect to once your user has allowed the application's permissions.

###Authentication

Visit the home page to authenticate yourself with Spotify and you should be all set!
