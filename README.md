# Intro

This is a demo for shorten and tracking URL feature built upon Nexmo Messages API and AWS Serverless components.
Given an SMS text with a **loooooong** URL, the API will shorten it and send the SMS with the shorten URL.
When the user clicks on the link, the solution keep track of the click event and send a webhook to the configured URL.

## Usage

#### Use Website

You can try the URL shorten feature visiting the following website: [website](https://d38vntdp98rc5o.cloudfront.net/shortener-url/index.html
)
#### Use API

To send an SMS using the shorten feature you can use the following endpoint:

```
POST https://3ip3eoi6hk.execute-api.eu-west-2.amazonaws.com/dev/shortener/send
```

Body params

| Name          | Type   | Description                                         |
| ------------- | ------ | --------------------------------------------------- |
| from          | String | The name or number the message should be sent from. |
| to            | String | The number that the message should be sent to.      |
| text          | String | The body of the message being sent.                 |
| api_key       | String | Your api key                                        |
| api_secret    | String | Your api secret                                     |
| webhook_click | String | webhook url for the click event                     |

If you want to track your users' click, you can configure the webhook url to get notify when the users click the shorten link. For demo purpose, the webhook url must be POST method.

The webhook click body will give the following data:

| Name           | Type   | Description                                                    |
| -------------- | ------ | -------------------------------------------------------------- |
| message_uuid   | String | The id of the message sent                                     |
| status         | String | Status of the message. Status can be: sent, delivered, clicked |
| clicked_date   | String | Click link date                                                |
| creation_date  | String | Send SMS date                                                  |
| delivered_date | String | Delivery SMS date                                              |
| original_url   | String | The original url contained in the message                      |
| short_url      | String | The shorten url                                                |


#### SMS DLR Setup

If you are using your own account (your api key and secret) and want to receive the DLR status webhook ([https://developer.nexmo.com/api/sms#delivery-receipt]()), you have to set the default Webhook URL Delivery Receipt under Account -> Settings -> Delivery receipts -> `https://3ip3eoi6hk.execute-api.eu-west-2.amazonaws.com/dev/shortener/hook/message-status`

## Project structure

#### Server folder

**serverless.yml:** this file contains the configuration needed to create the AWS resources used by the project (ApiGateway, Lambda, Dynamo, S3).

**shortener/:** this folder contains the shortener function. The shortener function creates the short code URL, send the messages, save the item into S3 and DynamoDB.

**hooks/:** this folder contains the hook for the delivery receipt SMS [Guide](https://developer.nexmo.com/api/sms#delivery-receipt)

**get-sms-list/:** this folder retrieve all the sms sent by a specific account

![Server Schema](https://d38vntdp98rc5o.cloudfront.net/shortener-url/assets/img/shortener-sms-lambda.png)


#### Lambda Edge folder

This folder contains the code of the Lambda@Edge. It handles the click tracking and webhook feature.

![Lambda Edge Schema](https://d38vntdp98rc5o.cloudfront.net/shortener-url/assets/img/shortener-sms.png)

#### App folder

This folder contains the web app build with Volta Library.
The web app lets you: 


- Display a table with all the sms sent by a specific API. 
- Specify account to use and send SMS
- Display Pie Chart with statistic regarding messages status

#### Use it in your AWS account

If you want to use this project in your AWS account, using Serverless Framework is really simple:

```
cd server
npm i
serverless deploy
```
Then, go to Lambda menu, switch to Nort Virginia region and create a Lambda function.
Upload the code inside the Lambda Edge folder. Lastly, add the cloudfront trigger from the left menu of the lambda function interface. 

Click Deploy and you are ready to go!
