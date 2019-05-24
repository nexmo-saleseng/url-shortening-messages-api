const AWS = require( 'aws-sdk' );
AWS.config.update( { region: 'eu-west-2' } );
AWS.config.setPromisesDependency( require( 'bluebird' ) );
const dynamoDb = new AWS.DynamoDB.DocumentClient();
var rp = require('request-promise');

async function setReadUrl ( originUrl ) {
    console.log( 'setReadUrl', originUrl )
    const params = {
        TableName: 'ShortenerUrl',
        Key: {
            "id": originUrl
        },
        UpdateExpression: "set clickedDate = :x, messageStatus= :messagestatus",

        ExpressionAttributeValues: {
            ":x": new Date().toISOString(),
            ":messagestatus": 'clicked'
        }
    };
    try {
        const updatedItem = await dynamoDb.update( params ).promise();
        console.log( 'updatedItem', updatedItem );
        const getItem = await dynamoDb.get( {
            TableName: 'ShortenerUrl',
            Key: {
                "id": originUrl
            }
        } ).promise()
        return getItem.Item;
    } catch ( e ) {
        console.log( 'e', e );
        return null
    }

}

exports.handler = async ( event ) => {

    const { request, origin } = event.Records[ 0 ].cf;
    console.log( 'request', request )
    console.log( 'headers', request.headers )
    console.log( 'origin', origin )
    try {
        await setReadUrl( `https://a.nxdm.be${request.uri}` )
    } catch ( e ) {
        console.log( 'Err:', e )
    }

    return request;
};