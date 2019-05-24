const AWS = require('aws-sdk');

AWS.config.setPromisesDependency(require('bluebird'));

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const utils = require('../utils');
const config = require('../config.json');

function parseConfig({ api_key, api_secret }) {
  const toReturn = {};
  if (!api_key || typeof api_key !== 'string') {
    toReturn.apiKey = config.NEXMO_API_KEY;
  } else {
    toReturn.apiKey = api_key;
  }
  if (!api_secret || typeof api_secret !== 'string') {
    toReturn.apiSecret = config.NEXMO_API_SECRET;
  } else {
    toReturn.apiSecret = api_secret;
  }
  return toReturn;
}

async function getList({ apiKey, apiSecret }) {
  console.log('[getList] - Authorization', apiKey, apiSecret);
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    FilterExpression: 'nexmoAuthorization = :base64auth',
    ExpressionAttributeValues: {
      ':base64auth': utils.encodeBase64(`${apiKey}:${apiSecret}`),
    },
  };

  const items = await dynamoDb.scan(params).promise();
  console.log('[getList] - Retrieved Items', items);
  return items.Items;
}

module.exports.getSmsList = async (event) => {
  console.log('[getSmsList] - event', event.queryStringParameters);
  let { queryStringParameters } = event;
  if (queryStringParameters === null) {
    queryStringParameters = {};
  }
  console.log('[getSmsList] - queryStringParameters', queryStringParameters);
  const { apiKey, apiSecret } = parseConfig(
    {
      api_key: queryStringParameters.api_key,
      api_secret: queryStringParameters.api_secret,
    },
  );
  const list = await getList({ apiKey, apiSecret });
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,

    },
    body: JSON.stringify({
      list,
    }),


  };
};
