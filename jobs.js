var http = require('http');
var path = '/refresh';

if (!process.env.PRODUCTION) {
  require('dotenv').load();
}

if (process.argv[2] == 'clear') {
  var today = new Date();

  // Check if today is Monday
  if (today.getDay() == 1) {
    path = '/clear';
  }
}

var options = {
  hostname: 'mf-jukebox.herokuapp.com',
  port: 80,
  path: path,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
};

var req = http.request(options, function(res) {
  res.setEncoding('utf8');
  res.on('data', function (body) {
    console.log(body);
  });
});

req.on('error', function(e) {
  console.log('Problem with request: ' + e.message);
});

req.write('{"token": "' + process.env.SLACK_TOKEN + '"}');
req.end();