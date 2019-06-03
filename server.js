/* Setting things up. */
var path = require('path'),
    express = require('express'),
    app = express(),   
    Twit = require('twit'),
    
    config = {
    /* Be sure to update the .env file with your API keys. See how to get them: https://botwiki.org/tutorials/how-to-create-a-twitter-app */      
      twitter: {
        consumer_key: process.env.CONSUMER_KEY,
        consumer_secret: process.env.CONSUMER_SECRET,
        access_token: process.env.ACCESS_TOKEN,
        access_token_secret: process.env.ACCESS_TOKEN_SECRET
      }
    },
    T = new Twit(config.twitter),
    {isRetweet, getTweetText} = require('./tweets')


const Markov = require("markov-strings").default;


var passport = require('passport');
var Strategy = require('passport-twitter').Strategy;

passport.use(new Strategy({
    consumerKey: process.env['CONSUMER_KEY'],
    consumerSecret: process.env['CONSUMER_SECRET'],
    callbackURL: process.env.BOT_CALLBACK
  },
  function(token, tokenSecret, profile, cb) {
  console.log({token, tokenSecret})
    // In this example, the user's Twitter profile is supplied as the user
    // record.  In a production-quality application, the Twitter profile should
    // be associated with a user record in the application's database, which
    // allows for account linking and authentication with other identity
    // providers.
    return cb(null, profile);
  }));

passport.serializeUser(function(user, cb) {
  cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
  cb(null, obj);
});


app.use(require('morgan')('combined'));
app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(require('express-session')({ secret: 'keyboard cat', resave: true, saveUninitialized: true }));
app.use(express.static('public'));

// Initialize Passport and restore authentication state, if any, from the
// session.
app.use(passport.initialize());
app.use(passport.session());

app.get('/login',
  passport.authenticate('twitter'));

app.get('/callbacks/twitter',
  passport.authenticate('twitter', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  });

/* You can use cron-job.org, uptimerobot.com, or a similar site to hit your /BOT_ENDPOINT to wake up your app and make your Twitter bot tweet. */

app.all(`/${process.env.BOT_ENDPOINT}`, async function(req, res){
  
  
  const USERNAMES= ["BUKANdigembok", "MurtadhaOne", "kikasyafii", "habibthink", "kangdede78", "jokowi", "rommyadams", "ulinyusron", "ulil"]
  const START_SENTINEL = "__START";
  const END_SENTINEL = "__END"
  
  const STARTLENGTH = START_SENTINEL.length + 1;
  const ENDLENGTH = END_SENTINEL.length + 1;
  
  const parseTwitterDate = twitterDate => {
  const [, monthShort, date, time, zone, year] = twitterDate.split(" ");
  return new Date(`${monthShort} ${date}, ${year} ${time}${zone}`);
};

const getTimelineTweets = async (username, maxId, tweets = []) => {
  const { data: raw } = await T.get("statuses/user_timeline", {
    screen_name: username,
    count: 200,
    max_id: maxId,
    exclude_replies: false,
    tweet_mode: "extended"
  });
  const data = raw.filter(tweet => tweet.id_str !== maxId);
  if (data.length) {
    const latest = data[data.length - 1].id_str;
    console.log(
      `${username}: Caught ${tweets.length +
        data.length} tweets. Fetching again, max ID: ${latest}`
    );
    return getTimelineTweets(username, latest, [...tweets, ...data]);
  } else {
    return tweets;
  }
};
  
  const tweets = (await Promise.all(USERNAMES.map(u => getTimelineTweets(u)))).reduce((acc, cur) => [...acc, ...cur], [])
  
  function createData(data) {
  return data
    .filter(tweet => !isRetweet(tweet) && !getTweetText(tweet).includes('via'))
    .map(tweet => {
      return `${START_SENTINEL} ${getTweetText(tweet)} ${END_SENTINEL}`;
    })
    .map(parseTweet);
}

function parseTweet(tweet) {
  let words = tweet
    .replace(/\&amp\;/gi, "&")
    .split(" ")
    .filter(word => !word.startsWith("@") || word.toLowerCase()  === '@jokowi' || word.toLowerCase()  === '@kiyai_marufamin')
    .filter(
      word =>
        !word.match(
          /[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi
        )
    )
    .join(" ")
    .replace(/([\.,:;!\+&]+)/gi, " $1 ")
    .replace(/\s+/gi, " ")
    .split(" ")
    .filter(word => !!word);
  return words.join(" ").replace(/ ([\.,:;!\+&]+)/gi, "$1");
}
  /* The example below tweets out "Hello world!". */
  
  const markov = new Markov(createData(tweets), { stateSize: 2 });

markov.buildCorpus();
  const options = {
  maxTries: 1000, // Give up if I don't have a sentence after 20 tries (default is 10)
  filter: result => {
    return (
      result.score > 100 &&
      result.string.split(" ").length >= 5 &&
      result.string.endsWith(END_SENTINEL) &&
      result.string.length < 280 + STARTLENGTH + ENDLENGTH
    ); // At least 5 words // End sentences with a dot.
  }
};

// Generate a sentence

// for (let i = 0; i < 100; i++) {
const result = markov.generate(options);
//   if (result.score > 50) {
console.log(result);
  const status = result.string.slice(STARTLENGTH, -ENDLENGTH)
  
  T.post('statuses/update', { status }, function(err, data, response) {
    if (err){
      console.log('error!', err);
      res.sendStatus(500);
    }
    else{
      res.sendStatus(200);
    }
  });
});

var listener = app.listen(process.env.PORT, function(){
  console.log('Your bot is running on port ' + listener.address().port);
});
