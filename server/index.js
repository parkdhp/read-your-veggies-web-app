var express = require('express');
var graphqlExpress = require('graphql-server-express').graphqlExpress;
var graphiqlExpress = require('graphql-server-express').graphiqlExpress;
var bodyParser = require('body-parser');
var https = require('https');
var fs = require('fs');
var passport = require('./facebookAuth.js');
var session = require('express-session');
var path = require('path');
var authMiddleware = require('./authMiddleware.js');
var requestLogger = require('./utilities.js').requestLogger;
var getGraphQlSchema = require('../db/graphql.js').getGraphQlSchema;

var app = express();
app.use(requestLogger);

app.use(express.static(__dirname + '/../client/dist'));
app.use(bodyParser.json());

/*****************************AUTH*****************************/
app.use(session({
  secret: 'Clark Kent is Superman!',
  resave: true,
  saveUninitialized: true,
}))

app.use(passport.initialize());
app.use(passport.session());
app.use(authMiddleware);

//Authentication 
app.get('/checkauthheaders', (req, res) => {res.send();})

//Handle logouts
app.get('/logout', ((req, res) => {
  req.logout();
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
    }
    req.session = null;
    res.clearCookie('connect.sid');
    req.logout();
    req.logOut();
    res.redirect('/');
  });
}));

app.get('/auth/facebook/callback', passport.authenticate('facebook', {
  successRedirect: '/',
  failureRedirect: '/',
}));

app.get('/auth/facebook', passport.authenticate('facebook',{
  // This scope array is how we request additional info from facebook
  scope:['email', 'user_location', 'user_hometown', 'user_age_range']
}));

//React Router Redirect Hack
app.get('/dashboard', (req,res) => res.redirect('/'));
app.get('/login', (req,res) => res.redirect('/'));
app.get('/health', (req,res) => res.redirect('/'));
app.get('/about', (req,res) => res.redirect('/'));
app.get('/report', (req,res) => res.redirect('/'));

/*****************************GRAPHQL*****************************/
async function startGraphQl() {
  var schema = await getGraphQlSchema();
  app.use('/graphql', bodyParser.json(), graphqlExpress({schema}));
  app.use('/graphiql', graphiqlExpress({ endpointURL: '/graphql' }));
}
startGraphQl();

/*****************************LISTEN*****************************/
var port = process.env.PORT || 5000;

if (process.env.DEPLOYED === 'aws') {
  console.log('on aws server');
  var certOptions = {
    key: fs.readFileSync('/etc/letsencrypt/live/read-your-veggies.com/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/read-your-veggies.com/fullchain.pem')
  }  
  var server = https.createServer(certOptions, app).listen(port, function() {
    console.log(`listening on port ${port}!`);
  });  
} else  {
  console.log('on local server');
  var certOptions = {
    key: fs.readFileSync(path.resolve('server.key')),
    cert: fs.readFileSync(path.resolve('server.crt'))
  }  
  var server = https.createServer(certOptions, app).listen(port, function() {
    console.log(`listening on port ${port}!`);
  });  
} 