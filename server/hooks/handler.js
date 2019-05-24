
const AWS = require('aws-sdk');
const config = require('../config.json');
AWS.config.setPromisesDependency(require('bluebird'));

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const { constants } = require('../constants');

async function setDeliveryStatus({ messageId, timestamp, status }) {
  console.log('setDeliveryStatus', messageId, timestamp, status);
  const params = {
    TableName: config.DYNAMODB_TABLE,
    IndexName: config.DYNAMODB_TABLE_INDEX,
    KeyConditionExpression: 'messageId = :messageid',
    ExpressionAttributeValues: {
      ':messageid': messageId,
    },
  };
  const item = await dynamoDb.query(params).promise();
  if (item && item.Items && item.Items.length
    && item.Items[0].messageStatus !== constants.MESSAGE_STATUS_CLICKED) {
    const paramsUpdate = {
      TableName: config.DYNAMODB_TABLE,
      Key: {
        id: item.Items[0].id,
      },
      UpdateExpression: 'set deliveredDate = :deliveredate, messageStatus= :messagestatus',

      ExpressionAttributeValues: {
        ':deliveredate': timestamp,
        ':messagestatus': status,
      },
    };

    const updatedItem = await dynamoDb.update(paramsUpdate).promise();
    console.log('updatedItem', updatedItem);
    return updatedItem;
  }
  return null;
}

/**
 * This method handle the message status webhook
 * Example of payload in body:
 * {
        "message_uuid": "4838e1dd-4678-4fe9-816b-00b66d192872",
        "to": {
            "number": "447749725766",
            "type": "sms"
        },
        "from": {
            "number": "447418397453",
            "type": "sms"
        },
        "timestamp": "2019-05-20T11:29:09.479Z",
        "usage": {
            "price": "0.0333",
            "currency": "EUR"
        },
        "status": "delivered"
    }
 *
 */
module.exports.messageStatus = async (event) => {
  const body = JSON.parse(event.body);
  try {
    await setDeliveryStatus({ messageId: body.message_uuid, timestamp: body.timestamp, status: body.status });
  } catch (e) {
    console.log('[Error]:', e);
  }
  return {
    statusCode: 200,
  };
};
