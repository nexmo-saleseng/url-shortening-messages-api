const AWS = require('aws-sdk');

AWS.config.update({ region: 'eu-west-2' });
AWS.config.setPromisesDependency(require('bluebird'));
const config = require('../config.json');

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const rp = require('request-promise');

async function sendWebhook(item) {
  console.log('[sendWebhook]', item);
  if (item && item.webhookClick) {
    const options = {
      method: 'POST',
      uri: item.webhookClick,
      timeout: 1500,
      body: {
        message_uuid: item.messageId,
        status: item.messageStatus,
        clicked_date: item.clickedDate,
        creation_date: item.creationDate,
        delivered_date: item.deliveredDate,
        original_url: item.originalUrl,
        short_url: item.id,
      },
      json: true, // Automatically stringifies the body to JSON
    };
    console.log('[sendWebhook] - Send', options);
    return rp(options).then((parsedBody) => {
      console.log('rpThen', parsedBody);
      return null;
    })
      .catch((err) => {
        console.log('rpCatch', err);
        return null;
      });
  }
}

async function setReadUrl(originUrl) {
  console.log('setReadUrl', originUrl);
  const params = {
    TableName: config.DYNAMODB_TABLE,
    Key: {
      id: originUrl,
    },
    UpdateExpression: 'set clickedDate = :x, messageStatus= :messagestatus',

    ExpressionAttributeValues: {
      ':x': new Date().toISOString(),
      ':messagestatus': 'clicked',
    },
  };
  try {
    const updatedItem = await dynamoDb.update(params).promise();
    console.log('updatedItem', updatedItem);
    const getItem = await dynamoDb.get({
      TableName: config.DYNAMODB_TABLE,
      Key: {
        id: originUrl,
      },
    }).promise();
    await sendWebhook(getItem.Item);
    return null;
  } catch (e) {
    console.log('e', e);
    return null;
  }
}

module.exports.hookLambdaClick = async (event) => {
  const { request } = event.Records[0].cf;
  console.log('request', request);
  try {
    await setReadUrl(`${config.BASE_URL}${request.uri}`);
  } catch (e) {
    console.log('Err:', e);
  }

  return request;
};
