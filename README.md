# Intro

This is a demo for shorten and tracking URL feature built using Nexmo Messages API and AWS Serverless components.
Given an SMS text with a **loooooong** URL, the API will shorten it and send the SMS with the shorten URL.
The demo tracks also the click of the user.

## Usage

#### Use Website

You can try the URL shorten feature visiting the following website: https://d38vntdp98rc5o.cloudfront.net/shortener-url/index.html

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


## Project structure

#### Server folder

**serverless.yml:** this file contains the configuration needed to create the AWS resources used by the project (ApiGateway, Lambda, Dynamo, S3).
