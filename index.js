var express = require('express')
var app = express()
var bodyParser = require('body-parser')
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));

app.post('/checkIn', function (req, res) {
  console.log(req.body);
  res.send('Noted');
})

/**
 Called upon entering or exiting the DALI lab (and when some settings are changed)

 Sample req.params:
   {
    user: {
      email: 'john.kotz@dali.dartmouth.edu',
      id: '123456789012345678901',
      familyName: 'Kotz',
      givenName: 'John',
      name: 'John Kotz'
    },
    inDALI: false,
    share: false
  }
 */
app.post('/enterExit', function (req, res) {
  console.log(req.body);
  res.send('Noted');
})

app.post('/timLocation', function (req, res) {
  console.log(req.body);
  res.send('Noted');
})

app.listen(3000, function () {
  console.log('DALI App Server listening on port 3000!')
})
