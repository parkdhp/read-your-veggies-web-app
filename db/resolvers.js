//needed to delete by _id
const mongodb = require('mongodb');
const userDbConn = require('./index.js').userDbConn;
const articleDbConn = require('./index.js').articleDbConn;
const sourceDbConn = require('./index.js').sourceDbConn;
const Articles = articleDbConn.collection('articles');
const Users = userDbConn.collection('users');
const Sources = sourceDbConn.collection('sources');
const Source = require('./schemas.js').Source;
const helpers = require('./data/helpers.js');
const sourceBiases = require('./data/sources.js');
const sourceConvert = require('./data/sourceConvert.js')

const prepare = (object) => {
  object._id = object._id.toString();
  return object;
}

module.exports = {
  Query: {
    message: () => 'Hello From GraphQL Server!',
    articles: async () => {
      return (await Articles.find({}).sort({'timestamp': -1}).limit(40).toArray()).map(prepare);    
    },
    article: async (root, {_id}) => {
      return prepare(await Articles.findOne(new mongodb.ObjectID(_id)));
    },
    user: async (root, {_id}) => {
      return prepare(await Users.findOne(new mongodb.ObjectID(_id)));
    },
    sources: () => {
      return Source.find({}).select('name fullTextsPersonality')
      .then(res => {
        let filtered = res.filter(source => {
          return source.fullTextsPersonality !== undefined;
        });
        let data = filtered.map(source => {
          return {
            _id: source._id, 
            name: source.name,
          } 
        })
        return data.map(prepare);
      })
      .catch(err => {
        return err;
      })
    },
    source: async (root, {name}) => {
      return prepare(await Sources.findOne({name: name}));
    },
  },
  Mutation: {
    
    updateArticleVotes: async (root, args) => {
      // We need to know the state of the current votes before we can update them.
      let currentState = prepare(await Articles.findOne(new mongodb.ObjectID(args._id)));
      let sourceStance = sourceBiases[ sourceConvert [currentState.source] ]
      
      // Take the current state and update the vote fields as necessary.
      for (let key in currentState.votes) {
        if (args.votes[key]) {
          currentState.votes[key].totalVotes++;
          currentState.votes[key].summedUserStance += args.userStance;
        }
      }

      let avgVoteStances = {}; 
      let totalVotes = 0;
      for (let key in currentState.votes) {
        if (currentState.votes[key].totalVotes !== 0) {
          avgVoteStances[key] = currentState.votes[key].summedUserStance / currentState.votes[key].totalVotes;
          totalVotes += currentState.votes[key].totalVotes;
        } else {
          avgVoteStances[key] = 0;
        }
      }

      let voteStanceSummed = (avgVoteStances.agree - avgVoteStances.disagree + avgVoteStances.fun - avgVoteStances.bummer) / 2;
      let newArticleStance; 
      if (totalVotes <= 5) {
        newArticleStance = voteStanceSummed * 0.1 + sourceStance * 0.9;
      } else if (totalVotes <= 10) {
        newArticleStance = voteStanceSummed * 0.25 + sourceStance * 0.75;
      } else if (totalVotes <= 50) {
        newArticleStance = voteStanceSummed * 0.5 + sourceStance * 0.5;
      } else {
        newArticleStance = voteStanceSummed * 0.8 + sourceStance * 0.2;
      }

      // Pass the updated votes object and article stance back into the database.
      const res = await Articles.findOneAndUpdate(
        {_id: new mongodb.ObjectID(args._id)}, 
        {$set: {votes: currentState.votes, articleStance: newArticleStance }}, 
        {returnOriginal:false}
      );
      return res.value;
    },

    updateUserVotes: async (root, args) => {
      let userDocument = prepare(await Users.findOne(new mongodb.ObjectID(args._id)));
      let previouslyCompletedArticles = JSON.parse(userDocument.completed_articles);
      let currentReadingStance = userDocument.reading_stance;
      
      let incomingArticle = JSON.parse(args.completed_articles);
      let incomingArticleKey = Object.keys(incomingArticle)[0];

      previouslyCompletedArticles[incomingArticleKey] = incomingArticle[incomingArticleKey];
      
      let updatedReadingStance = helpers.calculateUserReadingStance(currentReadingStance, incomingArticle[incomingArticleKey]);

      let aggregates = {
        onboardingStance: userDocument.onboard_stance,
        localPolStance: userDocument.locPolRatio,
        homePolStance: userDocument.homePolRatio,
        browsingStance: userDocument.browsing_history_stance,
        readingStance: updatedReadingStance,
      }
      let updatedAggregateStance = helpers.calculateUserAggregateStance(aggregates);
      
      const res = await Users.findOneAndUpdate(
        {_id: new mongodb.ObjectID(args._id)}, 
        {$set: {
          completed_articles: JSON.stringify(previouslyCompletedArticles),
          reading_stance: updatedReadingStance,
          user_stance: updatedAggregateStance,
          health: userDocument.health + incomingArticle[incomingArticleKey].nutritionalValue,
          }
        }, 
        {returnOriginal:false}
      );
      
      return res.value
    },

    onboardUser: async (root, args) => {
      let userDocument = prepare(await Users.findOne(new mongodb.ObjectID(args._id)));

      var onboardStance = helpers.calculateUserOnboardStance(args.onboard_info);

      var aggregates = {
        onboardingStance: onboardStance,
        localPolStance: userDocument.locPolRatio,
        homePolStance: userDocument.homePolRatio,
        browsingStance: userDocument.browsing_history_stance,
        readingStance: userDocument.reading_stance,
      }
      var updatedAggregateStance = helpers.calculateUserAggregateStance(aggregates);

      const res = await Users.findOneAndUpdate(
        {_id: new mongodb.ObjectID(args._id)}, 
        {$set: {
          onboard_information: args.onboard_info,
          onboard_stance: onboardStance,
          user_stance: updatedAggregateStance,
          }
        }, 
        {returnOriginal:false}
      );
      
      return res.value;
    },

    updateUserBrowsingHistory: async (root, args) => {
      const userDocument = prepare(await Users.findOne(new mongodb.ObjectID(args._id)));
      const incomingBrowsingHistory = args.browsing_history.filter((item) => item !== '');
      
      var updatedBrowsingHistoryStance = helpers.calculateUserBrowsingStance(incomingBrowsingHistory, userDocument.browsing_history_stance);

      var aggregates = {
        onboardingStance: userDocument.onboard_stance,
        localPolStance: userDocument.locPolRatio,
        homePolStance: userDocument.homePolRatio,
        browsingStance: updatedBrowsingHistoryStance,
        readingStance: userDocument.reading_stance,
      }
      var updatedAggregateStance = helpers.calculateUserAggregateStance(aggregates);

      const res = await Users.findOneAndUpdate(
        {_id: new mongodb.ObjectID(args._id)}, 
        {$set: {
          browsing_history_stance: updatedBrowsingHistoryStance,
          user_stance: updatedAggregateStance,
          }
        }, 
        {returnOriginal:false}
      );
      
      return res.value;
    }
  }
}