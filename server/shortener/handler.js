
const AWS = require('aws-sdk');

const S3 = new AWS.S3();
const Nexmo = require('nexmo');
const config = require('../config.json');

AWS.config.setPromisesDependency(require('bluebird'));

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const { constants } = require('../constants');
const utils = require('../utils');

/**
 * Parse config from RESTApi. Fallback to APIs default account
 * @param {*} param0
 */
function parseConfig({
  from, to, text, api_key, api_secret, webhook_click,
}) {
  const toReturn = {};
  if (!to || typeof to !== 'string') {
    console.error('Input Validation Failed');
    throw new Error('Couldn\'t send message because *to* field is not valid');
  }
  if (!from || typeof from !== 'string') {
    toReturn.from = config.NEXMO_SMS_FROM;
  } else {
    toReturn.from = from;
  }
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
  toReturn.to = to;
  toReturn.text = text;
  toReturn.webhookClick = webhook_click;
  return toReturn;
}

/**
 * Check if text contains url
 * @param {*} messageSms
 */
function containsUrl(messageSms) {
  const matches = messageSms.match(/\bhttps?:\/\/\S+/gi);
  if (matches && matches.length) {
    return matches[0];
  }
  return null;
}

/**
 * Generate random path
 * @param {*} path
 */
function generatePath(path = '') {
  const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const position = Math.floor(Math.random() * characters.length);
  const character = characters.charAt(position);

  if (path.length === 7) {
    return path;
  }

  return generatePath(path + character);
}

function buildRedirect(path, longUrl = false) {
  const redirect = {
    Bucket: config.BUCKET,
    Key: path,
  };

  if (longUrl) {
    redirect.WebsiteRedirectLocation = longUrl;
  }

  return redirect;
}

/**
 * Save the object in S3 bucket
 * @param {*} redirect
 */
function saveRedirect(redirect) {
  return S3.putObject(redirect).promise()
    .then(() => Promise.resolve(redirect.Key))
    .catch(() => Promise.reject({
      statusCode: 500,
      message: 'Error saving redirect',
    }));
}

/**
 * This function put the item in the Dynamo DB
 * @param {*} longUrl
 * @param {*} shortUrl
 * @param {*} messageId
 * @param {*} webhookClick
 * @param {*} apiKey
 * @param {*} apiSecret
 */
function putUrlMappingItem(longUrl, shortUrl, messageId, to, from, webhookClick, apiKey, apiSecret) {
  if (shortUrl) {
    const item = {
      id: shortUrl,
      originalUrl: longUrl,
      messageId,
      to,
      from,
      creationDate: new Date().toISOString(),
      messageStatus: constants.MESSAGE_STATUS_SENT,
      nexmoAuthorization: utils.encodeBase64(`${apiKey}:${apiSecret}`),
    };
    if (webhookClick) {
      item.webhookClick = webhookClick;
    }
    console.log('[putUrlMappingItem] - Item to put', item);
    const itemToSave = {
      TableName: config.DYNAMODB_TABLE,
      Item: item,
    };
    return dynamoDb.put(itemToSave).promise()
      .then(res => itemToSave);
  }
  return Promise.resolve();
}

/**
 * This function handle the SMS send procedure using Nexmo library
 * @param {*} to
 * @param {*} message
 */
function sendSMS(to, from, message, apiKey, apiSecret) {
  console.log('[sendSMS]', to, from, apiKey, apiSecret);
  const nexmo = new Nexmo({
    apiKey,
    apiSecret,
  });
  return new Promise((resolve, reject) => {
    nexmo.channel.send(
      { type: 'sms', number: to },
      { type: 'sms', number: from },
      message,
      /* {callback: `${process.env.SERVICE_ENDPOINT}/shortener/hook/message-status`}, */
      (err, data) => {
        if (err) {
          console.log('[sendSMS] - err', err);
          reject(err);
        }
        // data.message_uuid
        resolve(data);
      },
      { useBasicAuth: true },
    );
  });
}

/**
 * This function handle the message with the URL. First thing, it generates the shorten Path.
 * It saves the object in S3, put the item in Dynamo and then send the SMS
 * @param {*} param0
 */
function buildResponseForRedirect({
  to, from, message, longUrl, apiKey, apiSecret, webhookClick,
}) {
  const path = generatePath();
  console.log('[buildResponseForRedirect] - generatePath', path);
  // costruire il messaggio da mandare
  const redirect = buildRedirect(path, longUrl);
  const shortUrl = `${config.BASE_URL}/${path}`;
  message.content.text = message.content.text.replace(longUrl, shortUrl);
  console.log('[buildResponseForRedirect] -  messageToSend', message);
  return saveRedirect(redirect).then(() =>
    // ora devo mandare sms e salvare su dynamo
    sendSMS(to, from, message, apiKey, apiSecret)).then(smsSent => putUrlMappingItem(longUrl, shortUrl, smsSent.message_uuid, to, from, webhookClick, apiKey, apiSecret)).catch((err) => {
    console.log('[buildResponseForRedirect] -  Error', err);
    throw err;
  });
}


module.exports.shortener = event => new Promise((resolve, reject) => {
  const requestBody = JSON.parse(event.body);
  try {
    const {
      from, to, text, apiKey, apiSecret, webhookClick,
    } = parseConfig(requestBody);
    console.log('[shortener] - Text to send:', text);
    console.log('[shortener] - Number to send:', to);
    console.log('[shortener] - Number from:', from);
    const message = {
      content: {
        type: 'text',
        text,
      },
    };
    const longUrl = containsUrl(text);
    // If the text contains an URL, I will save the SMS in DynamoDB, S3 and then send it with MessagesAPI
    if (longUrl) {
      return buildResponseForRedirect({
        to, from, message, longUrl, apiKey, apiSecret, webhookClick,
      }).then(() => resolve({
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
        },
        body: JSON.stringify({}),
      })).catch(e => resolve({
        statusCode: 401,
        body: JSON.stringify(e),
      }));
    }
    // otherwise, just send the SMS
    return sendSMS(to, from, message, apiKey, apiSecret).then(() => resolve({
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({}),
    })).catch(e => resolve({
      statusCode: 401,
      body: JSON.stringify(e.message),
    }));
  } catch (e) {
    return resolve({
      statusCode: 401,
      body: JSON.stringify(e.message),
    });
  }
});
